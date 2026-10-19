# Phase 3 - Máy chủ chơi trực tiếp

## Overview

Toàn bộ trạng thái, thời gian và chấm điểm của phiên trực tiếp nằm ở Postgres. Học sinh (vai trò `anon`) không có quyền trên bảng nào mà chỉ gọi các hàm `security definer`; giáo viên điều khiển bằng các hàm kiểm tra chủ phiên. Đây là **ranh giới bảo mật duy nhất của phần học sinh** nên phase này được review riêng (`hs-code-review`) trước khi sang phase 4. Kiểm chứng độc lập bằng test DB, chưa cần giao diện hay Realtime.

## Files

- `supabase/migrations/<thời gian>_live_sessions.sql` (mới).
- `tests/db/live.test.ts`, `tests/db/live-helpers.ts` (mới).

## Mô hình dữ liệu (chốt ở đây, chi tiết cột do build quyết định)

- `live_sessions`: `owner_id`, `quiz_id` (`on delete set null`), `quiz_title`, **`quiz_snapshot jsonb`** (toàn bộ đề, lựa chọn, khoá đáp án và thời gian, chụp lúc bắt đầu), `pin` (6 chữ số, duy nhất trong các phiên chưa kết thúc), `status` (`lobby|question|reveal|ended`), `locked`, `speed_bonus`, `current_position`, `question_opened_at`, `question_closes_at`, `seq` (tăng mỗi lần đổi pha), `created_at`, `ended_at`, `expires_at` (bắt đầu + 4 giờ). Chỉ một phiên chưa kết thúc mỗi giáo viên.
- `participants`: `session_id`, `nickname` (1-20 ký tự, không trùng trong phiên không phân biệt hoa thường), `token uuid` bí mật, `score`, `removed`, `joined_at`. Tối đa 50 mỗi phiên.
- `answers`: `session_id`, `participant_id`, `position`, `answer jsonb`, `is_correct`, `points`, `answered_at`, `response_ms`; khoá chính `(participant_id, position)`.
- `join_attempts`: lần nhập PIN sai theo băm của địa chỉ IP, dùng để chặn đoán PIN.
- Không bảng nào cấp quyền cho `anon`; chủ phiên chỉ có quyền `select` trên dữ liệu của mình; mọi ghi đi qua hàm.

## Tasks

- [ ] **3.1 Bảng, quyền và giới hạn.** Migration các bảng trên; `REVOKE ALL` với `anon` và `authenticated`, chỉ cấp `select` cho chủ phiên qua RLS; trigger hoặc chỉ mục ép "một phiên chưa kết thúc mỗi giáo viên", 50 người chơi mỗi phiên (khoá advisory theo phiên), độ dài biệt danh; hàm `enforce_*` thu hồi quyền `EXECUTE`. Kiểm tra: test DB `anon` không đọc, ghi, sửa bảng nào (`42501`); giáo viên B không đọc phiên của A; vượt 50 người và phiên thứ hai bị từ chối.
- [ ] **3.2 Hàm giáo viên (kiểm tra chủ phiên).** `create_session(quiz_id, speed_bonus)`: kiểm tra chủ quiz và `quiz_problems` rỗng, chụp đề vào `quiz_snapshot`, sinh PIN (thử lại khi trùng), đặt `expires_at`. `host_set_locked`, `host_remove_participant`, `host_open_question` (đặt `question_opened_at = clock_timestamp()` và `question_closes_at` theo thời gian của câu, tăng `seq`), `host_close_question` (đóng câu, tính điểm các câu đã nộp, chuyển `reveal`), `host_next` (sang câu kế hoặc kết thúc), `host_end_session`, `host_state(session)` (người chơi, số đã trả lời, phân bố khi đã đóng). Máy trạng thái: `lobby → question → reveal → question … → ended`; chuyển sai thứ tự bị từ chối. Kiểm tra: test DB toàn bộ chuyển hợp lệ và không hợp lệ, người không phải chủ bị từ chối mọi hàm, phiên hết hạn coi như đã kết thúc.
- [ ] **3.3 Hàm học sinh.** `join_session(pin, nickname)` (từ chối PIN sai, phiên không ở phòng chờ hoặc đã khoá, biệt danh trùng; chặn thử PIN sai theo IP, xem 3.5), `player_state(token)` (pha hiện tại, `seq`, `server_now`; **chỉ khi câu đang mở mới trả đề và lựa chọn, tuyệt đối không có `is_correct` hay đáp án chấp nhận**; sau khi câu đóng mới trả đáp án đúng, kết quả của chính người chơi và hạng), `submit_answer(token, answer)` (một lần mỗi câu, chỉ khi câu đang mở và trước `question_closes_at` theo `clock_timestamp()` của máy chủ, người bị loại bị từ chối), `player_leaderboard(token)` (top 5 và hạng của mình; khi kết thúc trả top 3 kèm hạng). Cấp `EXECUTE` cho `anon` và `authenticated`, thu hồi của `public`. Kiểm tra: xem 3.6.
- [ ] **3.4 Chấm điểm và so khớp.** Điểm đúng cơ bản 1000; khi `speed_bonus` bật: `round(1000 * (1 - 0.5 * response_ms / thời_gian_ms))`, từ 500 đến 1000; sai hoặc không trả lời bằng 0. `multi`: đúng hết và không chọn thừa mới được điểm. `short_text`: hàm `normalize_answer(text, ignore_diacritics)` cắt khoảng trắng đầu và cuối, gộp khoảng trắng liên tiếp, hạ chữ thường; mặc định **giữ dấu tiếng Việt**; khi `ignore_diacritics` bật thì bỏ dấu (dùng tiện ích `unaccent`, kiểm tra `đ` thành `d`). Kiểm tra: bảng ca test DB cho 4 dạng và cho điền từ ("ma" khác "má" khi giữ dấu, bằng nhau khi bỏ dấu, hoa thường và khoảng trắng thừa, nhiều đáp án chấp nhận, chuỗi rỗng).
- [ ] **3.5 Chặn đoán PIN.** Mỗi lần `join_session` sai PIN ghi vào `join_attempts` theo băm IP lấy từ `request.headers` (**chỉ tin phần tử do gateway nối thêm, không tin phần tử đầu của `x-forwarded-for`**); quá 30 lần sai trong 10 phút thì từ chối mọi lần thử từ IP đó trong thời gian chờ; lần vào thành công không bị tính. Dọn bản ghi cũ. Kiểm tra: test DB mô phỏng nhiều lần sai và xác nhận bị chặn, lần đúng từ IP khác không bị ảnh hưởng, giá trị tiêu đề do máy khách tự đặt không né được. Việc xác nhận trên dự án thật nằm ở 8.3.
- [ ] **3.6 Bộ test rò rỉ và gian lận (bắt buộc đạt trước khi sang phase 4).** Dùng vai trò `anon`: không đọc bảng nào; `player_state` trong phòng chờ và khi câu đã đóng không lộ đề của câu chưa mở; trong lúc câu mở không có đáp án đúng; token sai hoặc của phiên khác bị từ chối; không đọc được dữ liệu người chơi khác; trả lời hai lần, trả lời sau hạn, trả lời khi chưa mở, bởi người bị loại đều bị từ chối. Để kiểm thử hạn chót mà không cần cửa hậu thời gian, test dùng `service_role` đặt `time_limit` trong `quiz_snapshot` xuống 2 giây rồi chờ thật. Kiểm tra: toàn bộ test đạt, và chạy lại với một lỗi cố ý (cấp `select` cho `anon`) để xác nhận test thật sự hỏng.

## Acceptance criteria

- `anon` không có quyền trên bất kỳ bảng nào của phiên; mọi truy cập đi qua hàm.
- Học sinh không bao giờ nhận được đáp án đúng trước khi câu đóng.
- Một đáp án mỗi câu, hạn chót theo giờ máy chủ, điểm đúng quy tắc cho 4 dạng, so khớp điền từ đúng (kể cả dấu tiếng Việt).
- Chỉ chủ phiên điều khiển được; phiên hết hạn hoặc đã kết thúc không nhận thêm thao tác.
- Chặn thử PIN sai theo IP hoạt động và không bị né bằng tiêu đề tự đặt.

## Risks

- Một lỗi trong bất kỳ hàm `security definer` nào có thể lộ đáp án hoặc dữ liệu: bắt buộc `set search_path = ''`, tên đầy đủ, không nối chuỗi SQL, review riêng.
- `unaccent` phải có trên dự án thật (kiểm tra ở 8.3); nếu thiếu, dùng bảng chuyển ký tự tiếng Việt tự viết.
- Câu mở quá lâu hoặc người chơi rời đi: phiên tự hết hạn sau 4 giờ.
