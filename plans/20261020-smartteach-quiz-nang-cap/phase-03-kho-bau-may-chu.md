# Phase 3 - Kho báu: máy chủ

## Overview

Toàn bộ luật kho báu nằm ở Postgres để học sinh không sửa được điểm: đếm chuỗi, phát rương, mở rương, chọn hiệu ứng ngẫu nhiên, áp lên điểm. Phase này chỉ làm cơ sở dữ liệu và API (chưa có giao diện), kiểm bằng test DB. Phụ thuộc phase 2 vì cùng `create_session` (tuỳ chọn) và các hàm chuyển pha.

## Files

- Mới: `supabase/migrations/20261025090000_treasure.sql`; `tests/db/live-treasure.test.ts`.
- Sửa (client dùng ở phase 4, nhưng kiểu và RPC thêm ở đây để test dùng): `src/lib/live/types.ts`, `src/lib/live/rpc.ts`, `src/lib/live/errors.ts`.
- Sửa helper test: `tests/db/live-helpers.ts` (tạo phiên có `treasure_mode`).

## Tasks

- [x] **3.1 Lược đồ** (dựa trên định nghĩa mới nhất sau phase 2).
  - `live_sessions.treasure_mode boolean not null default false` (thêm vào `grant select (...)` của `authenticated`).
  - `participants.win_streak integer not null default 0`, `participants.lose_streak integer not null default 0`. **Không** thêm vào `grant select` của `authenticated` (danh sách cột hiện chỉ gồm `id, session_id, nickname, score, removed, joined_at`).
  - Bảng `public.treasure_chests`: `id uuid pk`, `session_id uuid not null → live_sessions on delete cascade`, `participant_id uuid not null → participants on delete cascade`, `position integer not null` (câu kích hoạt, từ 0), `kind text check in ('win','comfort')`, `status text not null default 'pending' check in ('pending','opened')`, `effect text` (`add`, `sub`, `mul`, `div`), `operand numeric`, `label text`, `score_before integer`, `score_after integer`, `created_at`, `opened_at`; `unique (participant_id, position)`; chỉ mục `(session_id, status)`. Bật RLS, `revoke all ... from anon, authenticated` (không cấp quyền trực tiếp cho ai; mọi truy cập qua hàm `security definer`, như `join_attempts` đã làm trước đây).
  - `create or replace create_session` (cùng chữ ký 3 tham số của phase 2): `p_options` nhận thêm `treasure_mode` (boolean); khi `treasure_mode` và `auto_advance` cùng bật mà `reveal_seconds < 8` thì **máy chủ nâng lên 8**.
- [x] **3.2 Luật chuỗi và phát rương.** `create or replace private.score_question` (giữ nguyên cách chấm; thêm bước cuối khi `treasure_mode`): với mỗi người chơi chưa bị loại của phiên, theo kết quả câu vừa chấm: đúng → `win_streak + 1`, `lose_streak = 0`; trả lời sai hoặc bỏ trống → `lose_streak + 1`, `win_streak = 0` (đúng theo brief: "3 sai hoặc bỏ trống"). Khi `win_streak` chạm 3 thì chèn một rương `win` cho `position` hiện tại và đặt `win_streak = 0`; khi `lose_streak` chạm 3 thì rương `comfort` và `lose_streak = 0`. `unique (participant_id, position)` bảo đảm gọi lặp không tạo thêm. Hằng số ngưỡng đặt tên rõ trong hàm. Kiểm tra: test DB 3.7.
- [x] **3.3 Hiệu ứng.** `private.apply_effect(p_score integer, p_op text, p_operand numeric) returns integer` thuần tuý: `add`, `sub`, `mul`, `div`; kết quả làm tròn về số nguyên, **không âm**, và mức tăng không vượt **+2000**. `private.pick_effect(p_kind text)` chọn có trọng số theo bảng của `plan.md` (quyết định 3) bằng `random()` và trả `(op, operand, label)` với `label` tiếng Việt (vd "Nhân đôi điểm", "Cộng 500 điểm", "Chia đôi điểm", "Trừ 300 điểm"). Rương `comfort` không bao giờ trả hiệu ứng làm giảm điểm. Kiểm tra: test DB chạy trực tiếp `apply_effect` bằng `psql` với biên (điểm 0, điểm lớn, chia số lẻ).
- [x] **3.4 Mở rương.** `public.open_chest(p_token uuid) returns jsonb` (anon và authenticated gọi được như các hàm học sinh khác, xác thực bằng mã tham gia): tìm người chơi theo mã (`PT404 invalid_token` nếu sai, `participant_removed` nếu bị loại như `submit_answer`), khoá hàng người chơi `for update`; chỉ cho phép khi phiên đang `reveal` (`PT409 chest_not_ready` nếu không); lấy rương `pending` sớm nhất; nếu không có mà đã có rương `opened` của câu hiện tại thì **trả lại đúng kết quả đó** (idempotent); nếu không có gì thì `PT404 no_chest`. Mở: chọn hiệu ứng, áp lên `participants.score` (ghi `score_before/after`), đặt `opened`, trả `{ kind, label, op, operand, before, after }`. Không tăng `seq` (tránh tranh chấp hàng phiên; màn hình giáo viên đã hỏi định kỳ và nhận bản mới cùng `seq`). Cấp `execute` cho `anon, authenticated`, thu hồi `public`.
- [x] **3.5 Chốt rương còn lại.** `private.settle_chests(p_session uuid)` mở mọi rương `pending` của phiên bằng cùng đường mở như 3.4. Gọi từ: `create or replace private.open_next` (trước khi mở câu kế), `private.advance_from_reveal` ở nhánh kết thúc (dùng chung bởi `host_next` và `host_advance_if_due`, tạo ở phase 2), và `host_end_session`. Ngoại lệ chấp nhận: phiên hết hạn 4 giờ tự chuyển `ended` không chốt rương (ghi chú trong migration). Kiểm tra: test DB.
- [x] **3.6 Trạng thái trả về.** `create or replace host_state`, `player_state`, `host_results` (và `player_leaderboard` nếu cần): `player_state` khi `treasure_mode`: ở pha `question` và `reveal` có `streak: { win, lose }`; ở `reveal` có `chest`: `{ kind, status: 'pending' }` hoặc kết quả đã mở của câu hiện tại (cùng cấu trúc `open_chest`), và **không** chứa hiệu ứng trước khi mở; `host_state` có `treasure_mode` và `treasure_feed` (tối đa 8 rương vừa mở: `nickname`, `label`, `kind`, theo thời gian mở); `host_results` có `treasure_mode` và cho mỗi người chơi `treasure_delta` (tổng thay đổi điểm do rương) cùng số rương đã mở; điểm ở xếp hạng là điểm cuối đã gồm rương. Ranh giới: học sinh không đọc được rương của người khác; không lộ khoá đáp án (`FORBIDDEN_KEYS`).
- [x] **3.7 Test `tests/db/live-treasure.test.ts`.**
  - Ngưỡng: 2 đúng rồi 1 sai không có rương; 3 đúng có đúng một rương `win` và chuỗi về 0; đúng-đúng-đúng-đúng-đúng-đúng có hai rương; 3 sai và 2 sai + 1 bỏ trống có rương `comfort`; chuỗi bị cắt bởi câu ngược lại; `treasure_mode = false` thì không bao giờ có rương và `win_streak/lose_streak` không đổi.
  - Chống trùng: đóng câu rồi gọi `host_close_if_expired`/`host_close_question` lặp không sinh thêm rương; `unique` chặn chèn trùng.
  - `open_chest`: ngoài pha reveal bị từ chối; mở hai lần trả cùng kết quả và điểm chỉ đổi một lần; người khác (mã sai) và người bị loại bị từ chối; điểm sau khớp `score_after` và `player_state.score`; rương chưa mở không lộ hiệu ứng.
  - Hiệu ứng: chạy hàng trăm lần mở qua `psql` (vòng lặp trong một giao dịch) rồi xác nhận mọi kết quả thuộc tập hiệu ứng cho phép, `comfort` không bao giờ giảm điểm, điểm không âm, mức tăng ≤ 2000; `apply_effect` đúng ở các biên.
  - Chốt rương: rương còn lại tự mở khi `host_open_question`/`host_next` mở câu kế và khi kết thúc; bảng xếp hạng cuối khớp tổng điểm; tắt chế độ giải trí thì không đổi.
  - Quyền: `anon` và giáo viên đều không đọc/ghi trực tiếp `treasure_chests` (42501); chủ phiên xem được `treasure_feed`/`treasure_delta` qua hàm; giáo viên khác không thấy.
  - Phá thử: đổi ngưỡng 3 thành 2, bỏ `greatest(0, ...)`, bỏ trần +2000, bỏ gọi `settle_chests` ở `open_next` - mỗi thay đổi phải làm ít nhất một test hỏng (khôi phục sau mỗi lần).
  - Chạy lại toàn bộ `npm run test:db` để chắc `score_question` mới không phá việc chấm điểm cũ.

## Acceptance criteria

- Chuỗi 3 đúng tạo đúng một rương thắng; 3 sai/bỏ trống tạo đúng một rương an ủi; không trùng khi gọi lặp; chuỗi đặt lại sau khi nhận.
- `open_chest` idempotent, chỉ dùng được ở pha reveal bởi chính chủ rương; hiệu ứng thuộc tập định trước; điểm không âm; mức tăng ≤ +2000; hiệu ứng không lộ trước khi mở.
- Rương còn lại tự mở trước khi mở câu kế và trước xếp hạng cuối; điểm cuối khớp.
- Chế độ giải trí tắt: hành vi y như trước và không có rương nào.
- Học sinh/giáo viên không ghi trực tiếp vào bảng rương; không lộ khoá đáp án.

## Risks

- `random()` của Postgres không phải mật mã nhưng ở đây chỉ cần không đoán được bởi học sinh qua API (họ không gọi được `pick_effect`; `open_chest` không nhận tham số chọn); chấp nhận.
- Đồng thời nhiều học sinh mở rương cùng giây: khoá theo hàng người chơi, không đụng hàng phiên (không tăng `seq`), nên không tạo nút cổ chai.
- Hàm dài bị sao chép sai bản: xem Risks của `plan.md`.
