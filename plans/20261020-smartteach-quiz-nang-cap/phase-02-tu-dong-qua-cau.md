# Phase 2 - Tự động qua câu

## Overview

Giáo viên bật "Tự động" khi bắt đầu phiên. Hết giờ một câu thì đóng câu (đã có), hiện đáp án N giây rồi mở câu kế (mới). Việc đếm giờ phải theo **đồng hồ máy chủ** như `host_close_if_expired` (màn hình giáo viên chỉ nhắc, máy chủ quyết định), nên cần cột mới và hàm mới. Đóng gói độc lập vì chỉ chạm cấu hình phiên và các hàm chuyển pha.

## Files

- Mới: `supabase/migrations/20261024090000_auto_advance.sql`; `tests/db/live-auto.test.ts`; `e2e/auto-advance.spec.ts`.
- Sửa (client): `src/lib/live/types.ts`, `src/lib/live/rpc.ts`, `src/lib/live/errors.ts`, `src/components/live/host/start-session.tsx`, `src/components/live/host/host-screen.tsx`, `src/components/live/host/reveal-view.tsx`, `src/components/live/player/result.tsx`, `src/components/live/host/host.module.css`, `src/components/live/player/player.module.css`.
- Sửa test hiện có chỉ khi gọi `create_session`: `tests/db/live-helpers.ts` (`startSession`), `e2e/helpers/live.ts`, `tests/load/live-load.test.ts`.

## Tasks

- [ ] **2.1 Migration cấu hình phiên và hàm mới** (dựa trên định nghĩa trong `20261022090000_live_sessions.sql` và `20261023090000_results_retention.sql`).
  - Cột `live_sessions`: `auto_advance boolean not null default false`, `reveal_seconds integer not null default 8` kèm ràng buộc `in (5, 8, 12)`, `paused boolean not null default false`, `reveal_ends_at timestamptz`. Thêm các cột này vào danh sách `grant select (...)` của `authenticated` (chỉ cấp theo cột như hiện nay; không cấp `quiz_snapshot`).
  - `create_session(uuid, boolean)` được **thay** bằng `create_session(p_quiz_id uuid, p_speed_bonus boolean default true, p_options jsonb default '{}')`: `drop function` bản cũ rồi tạo bản mới (cập nhật khối `revoke/grant execute`). `p_options` nhận `auto_advance` (boolean) và `reveal_seconds` (5, 8, 12); khoá lạ bị bỏ qua, giá trị sai kiểu hoặc ngoài tập cho phép thì `raise exception 'invalid_options' using errcode = 'PT400'`. Giữ nguyên mọi hành vi khác (dọn dữ liệu cũ, một phiên mỗi giáo viên, chụp quiz, PIN).
  - `create or replace host_close_question` và `host_close_if_expired`: khi chuyển sang `reveal` đặt `reveal_ends_at = case when auto_advance and not paused then clock_timestamp() + make_interval(secs => reveal_seconds) end`.
  - `host_advance_if_due(p_session uuid) returns boolean` (chỉ chủ phiên): chỉ hành động khi `status = 'reveal'`, `auto_advance`, `not paused`, `reveal_ends_at is not null` và `clock_timestamp() >= reveal_ends_at`; khi đó làm đúng như `host_next` rồi trả `true`. **Tách phần thân của `host_next` thành `private.advance_from_reveal(p_session public.live_sessions)`** (mở câu kế, hoặc kết thúc nếu hết câu) và cho cả `host_next` lẫn `host_advance_if_due` gọi hàm này, để hai đường không lệch nhau và phase 3 chỉ phải thêm việc chốt rương ở một chỗ; ngược lại trả `false` mà không đổi gì. Gọi trùng chỉ có một lần thành công vì `private.host_session` khoá hàng phiên (`for update`).
  - `host_set_paused(p_session uuid, p_paused boolean)` (chỉ chủ phiên, chỉ khi `auto_advance`; ngược lại `PT409 invalid_transition`): tạm dừng đặt `paused = true`, `reveal_ends_at = null`; tiếp tục đặt `paused = false` và, nếu đang `reveal`, `reveal_ends_at = clock_timestamp() + interval '3 seconds'`; cả hai tăng `seq`.
  - `create or replace host_state` và `player_state` (lấy bản hiện tại làm gốc): thêm `auto_advance`, `reveal_seconds`, `paused`, `reveal_ends_at` vào `host_state`; vào `player_state` ở pha `reveal` thêm `next_at` (= `reveal_ends_at`, null khi không tự động hoặc tạm dừng) và `paused`. Không thêm gì có thể lộ khoá đáp án.
  - Kiểm tra: `supabase db reset` áp sạch; `tests/db/live-auto.test.ts` (2.4).
- [ ] **2.2 Client: kiểu, RPC, lỗi.** `HostState`/`PlayerState` thêm các trường mới; `host.create(supabase, quizId, options)` nhận `{ speedBonus, autoAdvance, revealSeconds }` và gọi `p_options`; thêm `host.advanceIfDue` và `host.setPaused`; `errors.ts` thêm `invalid_options` (lời nhắn tiếng Việt). Kiểm tra: test đơn vị `rpc`/`errors` cập nhật, `npm run typecheck`.
- [ ] **2.3 Giao diện.**
  - `start-session.tsx`: công tắc "Tự động qua câu" (mặc định tắt) và, khi bật, nhóm nút chọn 5, 8, 12 giây hiện đáp án; dòng nhắc "Cần để màn hình điều khiển mở trong suốt buổi". Truyền vào `host.create`.
  - `host-screen.tsx`: khi `status = reveal`, tự động và không tạm dừng, đặt hẹn theo `reveal_ends_at` quy ra đồng hồ trình duyệt (dùng `live.clock`), tới hạn thì gọi `host.advanceIfDue` qua `live.act`, nếu trả `false` hoặc lỗi thì thử lại mỗi giây và báo lỗi như `closeOnTimeUp`. Nút Tạm dừng/Tiếp tục (đổi nhãn, `aria-pressed` hoặc nhãn đổi) cạnh nút chính; thanh trạng thái "Tự động sang câu kế sau N giây" cập nhật theo giây nhưng chỉ công bố cho trình đọc màn hình một lần mỗi pha. Space và nút thủ công vẫn dùng (bấm tay là `host_next` như cũ).
  - `result.tsx` (học sinh, pha reveal): dòng "Câu kế bắt đầu sau N giây" khi có `next_at`, "Thầy cô đang tạm dừng" khi `paused`; không thêm hộp thoại.
  - Kiểm tra: `e2e/auto-advance.spec.ts` (2.4) và axe 1280/375 cho bảng bắt đầu phiên và màn điều khiển ở pha reveal tự động.
- [ ] **2.4 Test.**
  - `tests/db/live-auto.test.ts`: tạo phiên với `p_options` hợp lệ/không hợp lệ (`reveal_seconds = 7`, `auto_advance` là chuỗi, khoá lạ); `reveal_ends_at` đặt đúng khi đóng câu và null khi tắt tự động; `host_advance_if_due` trả `false` trước hạn, `true` sau hạn (đổi `reveal_ends_at` về quá khứ bằng service role như các test hiện có đổi `question_closes_at`), gọi lại ngay thì `false` và không mở hai câu; không chạy khi tắt tự động hoặc đang tạm dừng; câu cuối thì sang `ended`; `host_set_paused` bật/tắt và 3 giây ân hạn; người khác và `anon` bị từ chối; `FORBIDDEN_KEYS` vẫn không có trong `host_state`/`player_state`.
  - `e2e/auto-advance.spec.ts`: một giáo viên và một điện thoại, `reveal_seconds = 5`, câu 1 đóng bằng tay thì sau khoảng 5 giây điện thoại tự thấy câu 2 mà giáo viên không bấm; câu cuối dẫn tới bục vinh danh; Tạm dừng giữ nguyên màn hiện đáp án, Tiếp tục sang câu sau khoảng 3 giây; phiên không bật tự động không tự sang.
  - Phá thử: bỏ điều kiện `clock_timestamp() >= reveal_ends_at` làm test "không mở sớm" hỏng; bỏ điều kiện `not paused` làm test tạm dừng hỏng.
  - Chạy lại toàn bộ `npm run test:db` và `npm run test:e2e` để chắc chắn hành vi cũ nguyên vẹn.

## Acceptance criteria

- Hết giờ → đóng câu → hiện đáp án đúng `reveal_seconds` theo giờ máy chủ → mở câu kế; sau câu cuối sang bục vinh danh mà không cần bấm.
- Tạm dừng/Tiếp tục hoạt động và học sinh thấy trạng thái đúng; Space và nút thủ công vẫn dùng được.
- `host_advance_if_due` không mở sớm, không mở hai lần, không chạy khi tắt tự động hoặc tạm dừng, chỉ chủ phiên gọi được.
- Tắt tự động thì hành vi y như trước (mọi test cũ đạt).

## Risks

- Đổi chữ ký `create_session` làm gãy mọi nơi gọi cũ (RPC client, helper test, thử tải): đã liệt kê trong Files; PostgREST không giữ hai bản quá tải cùng tên nên phải `drop` bản cũ.
- Đồng hồ trình duyệt lệch: không ảnh hưởng đúng sai vì máy chủ tự kiểm giờ; chỉ làm chậm tối đa vài trăm mili giây.
- Giáo viên đóng tab: phiên đứng ở pha reveal cho tới khi mở lại (chấp nhận).
