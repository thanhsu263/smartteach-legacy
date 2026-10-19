# Phase 1 - Dữ liệu quiz và RLS

## Overview

Bảng quiz, câu hỏi, lựa chọn; RLS theo chủ sở hữu; giới hạn bằng trigger; lưu một câu hỏi nguyên tử; chia sẻ và nhân bản bằng link. Kiểm chứng độc lập bằng `npm run test:db`, chưa cần giao diện.

## Files

- `supabase/migrations/<thời gian>_quizzes.sql` (mới).
- `src/lib/quiz/types.ts`, `limits.ts`, `errors.ts`, `errors.test.ts` (mới).
- `tests/db/quiz.test.ts` (mới, dùng lại cách dựng người dùng của `tests/db/rls.test.ts`).

## Tasks

- [x] **1.1 Bảng, ràng buộc và RLS.** `quizzes` (`owner_id` mặc định `auth.uid()`, `title` 1-100 ký tự, `share_token uuid` rỗng mặc định, `created_at`, `updated_at`), `questions` (`quiz_id`, `position`, `kind` thuộc `single|true_false|multi|short_text`, `prompt` 1-500 ký tự, `time_limit_seconds` thuộc {10, 20, 30, 60, 90} mặc định 20, `accepted_answers text[]` và `ignore_diacritics boolean` cho `short_text`), `options` (`question_id`, `position`, `text` 1-150 ký tự, `is_correct`). Khoá ngoại xoá theo cascade; `owner_id` và `quiz_id` không đổi được sau khi tạo. Giới hạn bằng trigger có khoá advisory như migration lớp: 50 quiz mỗi giáo viên, 50 câu mỗi quiz, 6 lựa chọn mỗi câu, 10 đáp án chấp nhận mỗi câu (mỗi đáp án 1-100 ký tự). `REVOKE ALL` với `anon`, `GRANT` tường minh cho `authenticated`, RLS theo chủ quiz cho cả ba bảng (câu hỏi và lựa chọn qua `exists`). Kiểm tra: test DB hai tài khoản (B không đọc, sửa, xoá, chèn vào quiz của A; khách bị `42501`), giới hạn kể cả khi chèn song song, chuỗi rỗng và quá dài bị `23514`.
- [x] **1.2 Hàm `quiz_problems(quiz_id)`.** Trả về danh sách lỗi chặn việc chơi, theo vị trí câu: quiz không có câu nào; câu `single` không có đúng 1 đáp án đúng hoặc ít hơn 2 lựa chọn; `true_false` không có đúng 2 lựa chọn "Đúng" và "Sai" cùng 1 đáp án đúng; `multi` ít hơn 2 lựa chọn hoặc không có đáp án đúng; `short_text` không có đáp án chấp nhận; lựa chọn trùng nhau. Chạy với quyền người gọi (RLS áp dụng). Kiểm tra: bảng ca test DB, mỗi loại lỗi và một quiz hợp lệ.
- [x] **1.3 Lưu câu hỏi nguyên tử.** Hàm `save_question(quiz_id, question jsonb)` tạo hoặc cập nhật một câu cùng toàn bộ lựa chọn trong một giao dịch (thay thế lựa chọn cũ), trả về id; hàm `reorder_questions(quiz_id, ids uuid[])` đổi thứ tự; xoá câu dồn lại vị trí. Chạy với quyền người gọi. Kiểm tra: lỗi ở lựa chọn (quá dài, quá số lượng) không để lại câu nửa vời; đổi thứ tự không làm mất câu; B không gọi được trên quiz của A.
- [x] **1.4 Chia sẻ và nhân bản.** Hàm `set_quiz_sharing(quiz_id, enabled)` bật (tạo `share_token` ngẫu nhiên) hoặc tắt (đặt rỗng); bật lại tạo mã mới nên link cũ hết hiệu lực. Hàm `get_shared_quiz(token)` chỉ cho người đã đăng nhập, trả quiz kèm câu hỏi và đáp án (người nhận là giáo viên). Hàm `clone_shared_quiz(token)` sao chép về tài khoản người gọi (tên thêm hậu tố nếu cần), vẫn bị giới hạn 50 quiz. Kiểm tra: khách bị từ chối; token sai hoặc đã thu hồi báo không tìm thấy; bản sao thuộc người nhân bản và độc lập với bản gốc (sửa bản gốc không đổi bản sao); vượt giới hạn bị từ chối.
- [x] **1.5 Kiểu, hằng số và lời nhắn lỗi.** `limits.ts` khớp các số trong migration (kèm chú thích như `src/lib/classes/limits.ts`); `errors.ts` đổi mã lỗi Postgres và thông báo hàm (`quiz_limit_exceeded`, `question_limit_exceeded`, `option_limit_exceeded`, ...) thành tiếng Việt, không lộ thông báo kỹ thuật. Kiểm tra: unit test như `src/lib/classes/errors.test.ts`.

## Acceptance criteria

- Hai giáo viên không thấy dữ liệu quiz của nhau; khách không đọc hay ghi được bảng nào.
- Giới hạn quiz, câu, lựa chọn, đáp án được ép ở cơ sở dữ liệu, kể cả khi gọi song song.
- Quiz hợp lệ và không hợp lệ được phân biệt đúng bởi `quiz_problems` cho cả 4 dạng.
- Chia sẻ, thu hồi và nhân bản hoạt động đúng như brief.

## Risks

- Hàm chạy với quyền người gọi nên RLS vẫn áp dụng; không dùng `security definer` ở phase này.
- Chép một quiz lớn (50 câu, mỗi câu 6 lựa chọn) trong một giao dịch: kiểm tra thời gian trong test.
