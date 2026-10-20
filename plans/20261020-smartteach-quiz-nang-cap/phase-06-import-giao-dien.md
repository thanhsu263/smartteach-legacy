# Phase 6 - Import: máy chủ và giao diện

## Overview

Nối bộ đọc ở phase 5 với cơ sở dữ liệu và giao diện: một hàm Postgres tạo quiz cùng toàn bộ câu trong một giao dịch (hoặc không tạo gì), và trang "Nhập từ file" cho giáo viên xem trước, sửa lỗi rồi lưu. Phụ thuộc phase 5.

## Files

- Mới: `supabase/migrations/20261026090000_import_quiz.sql`; `tests/db/quiz-import.test.ts`; `src/components/quiz/import-quiz.tsx` + `import-quiz.module.css`; `src/app/my-quizzes/import/page.tsx` (hoặc khung ngay trong trang `/my-quizzes`, xem 6.2); `e2e/quiz-import.spec.ts`.
- Sửa: `src/lib/quiz/api.ts` (+ `api.test.ts`), `src/lib/quiz/errors.ts`, `src/components/quiz/quizzes-manager.tsx`, `src/lib/auth/protected-paths.ts` nếu thêm tuyến mới (đã bảo vệ `/my-quizzes`).

## Tasks

- [ ] **6.1 Hàm `import_quiz`.** `public.import_quiz(p_title text, p_questions jsonb) returns uuid`, `security invoker` (chạy dưới RLS của giáo viên như `save_question`): kiểm tra `p_questions` là mảng không rỗng và ≤ 50 phần tử (`PT409`/`PT400` với mã lỗi mới `too_many_questions`, `empty_import`); chèn `quizzes` (tiêu đề qua ràng buộc sẵn có, trigger giới hạn 50 quiz sẵn có chặn); rồi với từng phần tử gọi `public.save_question(v_quiz, q)` theo thứ tự để dùng lại nguyên các kiểm tra và giới hạn đã có. Mọi lỗi làm huỷ cả lời gọi (một giao dịch) nên không bao giờ để lại quiz dở. Cấp `execute` chỉ cho `authenticated`. Kiểm tra: `tests/db/quiz-import.test.ts` - tạo thành công đủ câu theo thứ tự và cả 4 dạng; câu thứ 3 sai thì **không có quiz nào** được tạo; 51 câu bị từ chối; quá 50 quiz bị chặn; `anon` bị từ chối; người khác không thấy quiz của mình; quiz sau nhập qua `quiz_problems` đúng như soạn tay.
- [ ] **6.2 API và lỗi phía client.** `importQuiz(supabase, title, questions)` trong `api.ts` gọi RPC, trả `Result<{ id }>`; ánh xạ lỗi mới trong `errors.ts` (tiếng Việt). Kiểm tra: `api.test.ts`, `errors.test.ts`.
- [ ] **6.3 Trang nhập.** Nút "Nhập từ file" ở `quizzes-manager.tsx` mở `import-quiz.tsx` (trang riêng `/my-quizzes/import` để có đường dẫn và nút Quay lại rõ ràng; tuyến nằm dưới `/my-quizzes` nên đã được bảo vệ). Bố cục: hai tab "Tải file" và "Dán văn bản"; tải file nhận `.csv,.xlsx` (nhãn rõ, kéo-thả không bắt buộc), liên kết "Tải file mẫu (CSV)" và hộp "Xem cú pháp dán" với `TEXT_SYNTAX_EXAMPLE`; ô tên quiz (mặc định từ tên tệp, sửa được, theo `validateTitle`); sau khi đọc hiện **xem trước** từng câu (số thứ tự, loại, nội dung, các lựa chọn với dấu "Đáp án đúng" bằng chữ), tóm tắt "N câu hợp lệ, M lỗi, K cảnh báo", danh sách lỗi/cảnh báo theo dòng gốc (vùng `role="alert"` cho tóm tắt, danh sách đọc được bằng trình đọc màn hình); nút "Tạo quiz" bị vô hiệu khi còn lỗi chặn hoặc chưa có câu nào; tạo xong chuyển tới `/my-quizzes/[id]` và đưa focus về tiêu đề. Trạng thái: chưa chọn tệp, đang đọc, tệp quá lớn/sai loại, `.xls` cũ (hướng dẫn lưu lại thành `.xlsx`), mã hoá hỏng, đạt giới hạn 50 quiz. Mobile-first: xem trước dạng thẻ xếp dọc, không cuộn ngang ở 375px. Tệp chỉ được đọc ở trình duyệt, không tải lên máy chủ nào.
- [ ] **6.4 Test giao diện `e2e/quiz-import.spec.ts`.** Tải `tests/fixtures/quiz-mau.csv` và `quiz-mau.xlsx` bằng `setInputFiles` → xem trước đúng số câu và 4 dạng → "Tạo quiz" → mở trình soạn thấy đủ câu và có thể bắt đầu phiên; dán `TEXT_SYNTAX_EXAMPLE` cho cùng kết quả; tệp có lỗi (thiếu đáp án đúng ở dòng 3) báo "Dòng 3" và vô hiệu nút tạo, không có quiz nào được tạo; tệp `.xls` giả và tệp quá 1 MB bị từ chối với lời nhắn rõ; đủ 50 quiz thì báo đạt giới hạn; chỉ dùng bàn phím từ đầu đến cuối; axe ở 1280px và 375px (trạng thái rỗng, có xem trước, có lỗi).

## Acceptance criteria

- Tệp đúng tạo quiz đủ câu và đủ 4 dạng; dán văn bản cho cùng kết quả.
- Tệp lỗi báo đúng dòng và không tạo gì (kể cả lỗi chỉ phát hiện ở máy chủ giữa chừng).
- Vượt 50 câu hoặc 50 quiz bị từ chối với lời nhắn đúng; chỉ giáo viên đăng nhập dùng được; quiz của người khác không bị ảnh hưởng.
- Giao diện dùng được bằng bàn phím và trình đọc màn hình; axe đạt; không cuộn ngang ở 375px.

## Risks

- Nội dung trong tệp là dữ liệu không tin cậy: chỉ hiển thị như văn bản (React tự thoát), không bao giờ `dangerouslySetInnerHTML`, không đánh giá công thức; độ dài và số lượng được giới hạn cả ở máy khách lẫn máy chủ.
- Người dùng hiểu sai định dạng cột: tệp mẫu và thông báo lỗi nêu tên cột cần có.
- `read-excel-file` chạy ở luồng chính: giới hạn kích thước (phase 5) và trạng thái "Đang đọc" giữ giao diện không đơ trong tệp nhỏ.
