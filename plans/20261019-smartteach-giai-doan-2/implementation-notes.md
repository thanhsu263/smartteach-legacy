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

## Phase 2 - Soạn quiz và chia sẻ

Kết quả kiểm tra (chưa commit):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt, không còn cảnh báo |
| `npm test` (Vitest) | 127/127 đạt: thêm test `protected-paths`, `validate` (đọc chung bảng ca với test DB) và `api` |
| `npm run test:db` | 60/60 đạt (không đổi) |
| `npm run test:e2e` | 128/128 đạt, chạy hai lần liên tiếp đều đạt: 115 cũ và 13 mới trong `e2e/quiz-editor.spec.ts` |

Phạm vi e2e mới: khách bị chuyển tới đăng nhập (cả link chia sẻ); đủ bốn dạng câu hỏi, sửa, đổi thứ tự (lưu lại sau khi tải lại), xoá có xác nhận; lỗi từng trường và cảnh báo "còn thiếu để chơi được"; mất mạng khi lưu giữ nguyên nội dung đang gõ; nhân đôi, đổi tên, xoá quiz; giáo viên khác không mở được quiz riêng tư; hai giáo viên chia sẻ, sao chép, đổi mã, tắt chia sẻ; axe WCAG A/AA tại 1280px và 375px (mười trạng thái); không tràn ngang; thanh điều hướng ở 768px và 1024px; cấp tiêu đề.

### Quyết định và lệch so với plan

- **Số thứ tự câu hiển thị theo vị trí trong danh sách (`index + 1`), không dùng cột `position`** vì `position` trong cơ sở dữ liệu bắt đầu từ 0 (còn `quiz_problems.question_position` bắt đầu từ 1). Lần đầu giao diện hiện "Câu 0"; e2e bắt được.
- **Nút Lên/Xuống bị khoá trong lúc đang sắp xếp** tới khi danh sách mới tải xong. Trước đó hai lần bấm liên tiếp có thể xếp nhầm câu vì lần bấm thứ hai dùng danh sách cũ.
- **Nút xác nhận xoá câu** có nhãn truy cập chứa đúng chữ hiển thị ("Xoá câu này, câu n"); nhãn cũ lệch chữ hiển thị bị axe (`label-content-name-mismatch`) báo.
- **Bảo vệ trang dùng chung:** `src/lib/auth/protected-paths.ts` (so khớp theo đoạn đường dẫn, có test) cho proxy và `src/components/require-user.tsx` cho ba layout `/my-classes`, `/my-quizzes`, `/shared`. Tệp `src/app/my-classes/require-user.tsx` cũ đã được thay.
- **Trang `/shared/quiz/[token]` nằm dưới `/shared`** (bắt đăng nhập, noindex) để quiz chia sẻ không lộ cho khách; token không phải UUID báo "Không tìm thấy" mà không gọi máy chủ.
- **Chưa làm đúng phạm vi:** nút chơi (phase 6), hàm chơi trực tiếp (phase 3). Migration vẫn chỉ áp lên stack cục bộ.

### Sửa sau review phase 1 và 2

Ba mục của review (không có lỗi Critical, High hay Medium) đã xử lý:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Mất bản nháp khi chuyển câu | `QuestionForm` báo `onDirtyChange`; `QuizEditor.switchTo` hỏi lại bằng nhóm "Thay đổi chưa lưu" (mặc định focus vào "Tiếp tục soạn") khi chọn câu khác, bấm "Thêm: …" hoặc "Huỷ" lúc còn thay đổi chưa lưu | e2e mới; phá thử (bỏ kiểm tra `dirty`) thì test hỏng |
| Mất focus sau khi lưu và khi mở bước xác nhận | Hook `useFocusRequest`; form giữ nguyên sau lần lưu đầu (`Mode` có `nonce` và `id` gắn thêm, không dựng lại form); xác nhận xoá câu, xoá quiz, đổi mã, tắt chia sẻ focus vào lựa chọn an toàn và trả focus về nút gốc khi huỷ; xoá dòng thì focus về tiêu đề danh sách; xoá lựa chọn hoặc đáp án thì focus ô liền trước | e2e mới kiểm tra `toBeFocused` ở từng bước |
| Khoá Lên/Xuống chưa có test | e2e kéo dài `reorder_questions` 800ms rồi ép bấm nút đang khoá | Phá thử (bỏ `moving`) thì test hỏng |

Phát hiện thêm khi làm: nút "Lưu câu hỏi" bị `disabled` trong lúc lưu nên Chrome bỏ focus của nó; sau khi lưu xong form tự trả focus về nút.

Kết quả: typecheck, lint, 127 unit, 60 DB, 131 e2e đạt (hai lần liên tiếp).

Chưa sửa (ngoài phạm vi phase này): ba mục xác nhận tại chỗ của giai đoạn 1 (`classes-manager`, `class-editor`) vẫn có cùng kiểu mất focus.
