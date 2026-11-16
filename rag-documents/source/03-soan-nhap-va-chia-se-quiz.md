# Soạn nhập và chia sẻ quiz trong SmartTeach

Hướng dẫn tạo quiz, kiểm tra câu hỏi, nhập từ tệp hoặc văn bản và chia sẻ cho đồng nghiệp. Soạn quiz là chức năng Free; soạn và giao đề online dùng luồng bài giao Premium riêng.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Tạo một quiz mới và thêm câu hỏi thế nào

Đăng nhập, mở Quiz của tôi (/my-quizzes), nhập Tên quiz và tạo quiz. Mở quiz để thêm câu hỏi, chọn loại câu, nhập nội dung, thiết lập đáp án và thời gian rồi chọn Thêm câu hỏi. Khi sửa câu đã có, chọn Lưu câu hỏi để ghi thay đổi. Kiểm tra trạng thái hoàn chỉnh trước khi Chơi ngay hoặc dùng quiz làm nguồn cho bài giao. Quiz chưa có câu hỏi hoặc còn lỗi đáp án sẽ bị chặn tổ chức phiên chơi.

## SmartTeach hỗ trợ những loại câu hỏi quiz nào

Quiz hỗ trợ bốn loại: Trắc nghiệm một đáp án, Đúng hoặc sai, Nhiều đáp án đúng và Điền từ ngắn. Câu một đáp án cần đúng một lựa chọn được đánh dấu đúng. Câu Đúng hoặc sai dùng hai nhãn cố định Đúng và Sai, chọn một đáp án đúng. Câu nhiều đáp án cần ít nhất một lựa chọn đúng; giáo viên đánh dấu đủ các lựa chọn cần chọn. Câu điền từ cần danh sách đáp án chấp nhận, không dùng các ô lựa chọn như trắc nghiệm.

## Giới hạn quiz và thời gian trả lời mỗi câu là bao nhiêu

Mỗi tài khoản tối đa 50 quiz, mỗi quiz tối đa 50 câu. Tên quiz tối đa 100 ký tự, nội dung câu hỏi 500 ký tự. Trắc nghiệm có từ 2 đến 6 lựa chọn, mỗi lựa chọn tối đa 150 ký tự. Câu điền từ có tối đa 10 đáp án chấp nhận, mỗi đáp án tối đa 100 ký tự. Thời gian mỗi câu chọn trong 10, 20, 30, 60 hoặc 90 giây; mặc định 20 giây. Nếu đã đủ số quiz, rà soát quiz cũ trước khi tạo hoặc sao chép thêm.

## Thiết lập đáp án cho câu điền từ ngắn như thế nào

Trong câu Điền từ ngắn, nhập các cách trả lời được chấp nhận vào danh sách đáp án. Dùng Thêm đáp án nếu một khái niệm có nhiều cách diễn đạt hợp lệ. Tùy chọn Bỏ dấu cho phép cấu hình việc so khớp không phân biệt dấu tiếng Việt; cân nhắc mục tiêu đánh giá trước khi bật. Giáo viên cần tự rà soát các đáp án chấp nhận, nhất là chữ có dấu, khoảng trắng và các biến thể. Chatbot không tự sửa đáp án trong quiz riêng của tài khoản.

## Nhập quiz từ Excel hoặc CSV như thế nào

Mở /my-quizzes/import từ Quiz của tôi, chọn nhập tệp Excel .xlsx hoặc CSV .csv và dùng tệp mẫu do màn hình cung cấp. Tệp tối đa 1.000.000 byte, giao diện gọi là 1 MB; chỉ đọc trang tính đầu tiên của Excel. Các cột mẫu gồm Loại câu, Câu hỏi, Lựa chọn A đến F, Đáp án đúng, Thời gian giây, Đáp án chấp nhận và Bỏ dấu. CSV nên lưu UTF-8 để giữ tiếng Việt. Tệp được đọc tại trình duyệt; nội dung quiz chỉ được lưu vào tài khoản khi giáo viên xác nhận tạo quiz.

## Cú pháp dán câu hỏi để tạo quiz là gì

Trong /my-quizzes/import chọn cách dán nội dung, viết các câu cách nhau bằng một dòng trống. Lựa chọn viết A. nội dung, B. nội dung và tiếp tục theo chữ cái. Đánh dấu đáp án đúng bằng dấu * trên lựa chọn hoặc dòng Đáp án: B. Câu điền từ không có lựa chọn, dùng Đáp án: a | b để liệt kê phương án chấp nhận. Có thể ghi [30s] cuối dòng câu hỏi để đặt thời gian 30 giây. Chọn đọc nội dung, xem trước và sửa lỗi trước khi tạo quiz; đây là cú pháp nhập quiz, không phải tải giáo trình PDF vào RAG.

## Quiz nhập xong nhưng không tạo hoặc không chơi được thì sửa gì

Xem danh sách lỗi và cảnh báo ở màn hình nhập; lỗi có số dòng giúp tìm lại hàng trong tệp hoặc câu trong văn bản. Lỗi chặn hoặc không có câu hợp lệ sẽ ngăn tạo quiz. Khi đã tạo, kiểm tra các lỗi như chưa có câu hỏi, thiếu lựa chọn, lựa chọn trùng, chưa đánh dấu đáp án đúng hoặc chưa có đáp án chấp nhận. Với câu một đáp án phải có đúng một lựa chọn đúng. Không thể nhập trực tiếp PDF, DOCX hay ảnh vào chức năng nhập quiz hiện tại; hãy chuyển thành định dạng mẫu được hỗ trợ.

## Chia sẻ quiz bằng link khác gì với gửi vào kho học liệu

Trong quiz, Bật chia sẻ tạo link cho đồng nghiệp xem và sao chép; quiz mặc định riêng tư. Sao chép link để gửi, dùng Đổi mã link khi cần vô hiệu hóa link cũ hoặc Tắt chia sẻ để ngừng truy cập qua link. Người có link chia sẻ xem được cả đáp án đúng, nên không dùng link này để phát đề cần giấu đáp án cho học sinh. Gửi vào kho học liệu là quy trình khác, cần được duyệt mới công khai; trang xem trước học liệu công khai ẩn đáp án. Bật chia sẻ bằng link không tự đưa quiz vào kho học liệu.

## Nguồn đối chiếu nội bộ

- `src/components/quiz/quizzes-manager.tsx`
- `src/components/quiz/quiz-editor.tsx`
- `src/components/quiz/question-form.tsx`
- `src/components/quiz/import-quiz.tsx`
- `src/components/quiz/share-panel.tsx`
- `src/components/quiz/shared-quiz-view.tsx`
- `src/lib/quiz/limits.ts`
- `src/lib/quiz/types.ts`
- `src/lib/quiz/validate.ts`
- `src/lib/quiz/import/types.ts`
- `src/lib/quiz/import/template.ts`
