# Ghi chú triển khai - Giai đoạn 2 (quiz chơi trực tiếp)

## Phase 1 - Dữ liệu quiz và RLS

Kết quả kiểm tra (chưa commit, working tree còn thay đổi so với `75dcce7`/`1ba2622`):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt |
| `npm test` (Vitest) | 95/95 đạt: thêm test lời nhắn lỗi quiz và test hằng số khớp migration |
| `npm run test:db` (Postgres thật của Supabase cục bộ) | 60/60 đạt: 22 test cũ và 38 test mới trong `tests/db/quiz.test.ts` |
| `npm run test:e2e` | 115/115 đạt (kiểm tra hồi quy, chưa có giao diện mới) |
| Cài mới từ đầu | `supabase db reset` áp đủ ba migration và test vẫn đạt |

Test DB mới chạy trước khi có migration và thất bại cả 38 test, rồi đạt sau khi áp migration.

### Đã kiểm tra bảo vệ có tác dụng (phá thử rồi khôi phục)

| Phá thử | Kết quả |
|---|---|
| Mở chính sách đọc `questions` cho mọi người | 1 test hỏng |
| Tắt trigger giới hạn số câu | 1 test hỏng |
| Cho phép đổi `quiz_id` của câu hỏi (tắt trigger bất biến) | 1 test hỏng |
| Cấp quyền `EXECUTE` của `get_shared_quiz` cho khách | **Lần đầu test vẫn đạt** vì hàm tự chặn bằng `not_authenticated` (mã cũng là `42501`). Đã siết test: bắt buộc thông báo `permission denied` (chặn ở quyền chứ không chờ kiểm tra bên trong hàm); lần chạy lại thì test hỏng đúng như mong đợi |

### Quyết định và lệch so với plan

- **Tên file migration:** `supabase/migrations/20261021090000_quizzes.sql` (tiền tố thời gian của CLI).
- **Plan ghi "không dùng `security definer` ở phase này", nhưng ba hàm phải dùng:** `get_shared_quiz`, `clone_shared_quiz` và `duplicate_quiz`, vì chia sẻ cần đọc quiz của người khác. Kiểm soát: chỉ người đã đăng nhập (thu hồi quyền của `public` và `anon`, và hàm tự kiểm tra `auth.uid()`), chỉ theo mã chia sẻ hoặc quiz của chính mình, `search_path` rỗng, hàm sao chép thật (`private.copy_quiz`) nằm ở schema `private` mà API không mở ra. Các hàm còn lại (`save_question`, `reorder_questions`, `delete_question`, `set_quiz_sharing`, `quiz_problems`) chạy với quyền người gọi nên RLS vẫn áp dụng.
- **Thêm hai hàm so với danh sách task:** `delete_question` (dồn vị trí sau khi xoá, đúng mô tả 1.3) và `duplicate_quiz` (giao diện danh sách quiz ở phase 2 cần "nhân đôi").
- **`quiz_problems` báo `quiz_not_found` cho quiz không tồn tại hoặc của người khác**, thay vì trả danh sách rỗng, để phía gọi (phase 3 `create_session`) không nhầm "không thấy" thành "hợp lệ".
- **Lựa chọn chỉ lưu cho các dạng có lựa chọn:** `save_question` với `short_text` bỏ qua `options` gửi kèm.
- **Bảng ca kiểm tra dùng chung:** `tests/fixtures/quiz-validation-cases.json` (15 ca cho `quiz_problems`); phase 2 sẽ cho `validate.ts` đọc cùng tệp để hai bên không lệch nhau.
- **`tests/db/helpers.ts`** gom cách dựng người dùng thử cho các test mới; `tests/db/rls.test.ts` cũ được giữ nguyên (còn bản sao riêng).
- **Hằng số TypeScript** (`src/lib/quiz/limits.ts`) có test đọc thẳng file migration để bảo đảm các số khớp nhau.
- **Mới chỉ áp migration lên stack cục bộ.** Áp lên dự án Supabase thật là việc của phase 8 và cần xác nhận.

### Chưa làm trong phase này (đúng phạm vi)

Giao diện soạn quiz (phase 2), bảng và hàm chơi trực tiếp (phase 3).
