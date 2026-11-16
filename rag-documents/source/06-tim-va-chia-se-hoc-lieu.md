# Tìm sử dụng và gửi duyệt học liệu

Hướng dẫn tìm học liệu công khai, tạo bản sao để sử dụng và gửi quiz vào quy trình duyệt. Chatbot chỉ có thể gợi ý nội dung đã được công bố hợp lệ và đã được lập chỉ mục.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Tìm quiz phù hợp với môn lớp và chủ đề như thế nào

Mở Kho học liệu (/library), nhập tên hoặc chủ đề trong ô Tìm học liệu, chọn Môn và Lớp rồi bấm Tìm. Danh sách có tiêu đề, mô tả, khối lớp và số câu để sàng lọc. Nếu chưa có kết quả, thử từ khóa ngắn hơn, đổi cách gọi chủ đề hoặc chọn Xóa bộ lọc. Dùng Tải thêm nếu còn kết quả. Có thể hỏi chatbot bằng môn, lớp và chủ đề cụ thể; nếu kho chưa có nội dung phù hợp, chatbot cần nói rõ thiếu nguồn thay vì đặt tên một tài liệu không tồn tại.

## Vì sao xem trước học liệu không có đáp án đúng

Trang /library/[id] cho xem câu hỏi và lựa chọn nhưng cố ý không hiển thị đáp án đúng. Đây là chế độ xem trước học liệu công khai. Nếu là giáo viên đã đăng nhập và muốn dùng hoặc điều chỉnh, chọn Tạo bản sao vào quiz của tôi. Bản sao xuất hiện trong tài khoản để giáo viên kiểm tra nội dung, đáp án và sửa trước khi dùng. Không kết luận học liệu thiếu đáp án chỉ vì chế độ xem trước đã ẩn đáp án.

## Dùng học liệu của người khác cho lớp của tôi ra sao

Mở học liệu cần dùng và chọn Tạo bản sao vào quiz của tôi; nếu chưa đăng nhập, dùng liên kết đăng nhập trên trang rồi quay lại. Hệ thống mở quiz mới trong tài khoản để giáo viên xem lại và chỉnh sửa. Từ bản sao, có thể tổ chức phiên quiz trực tiếp hoặc dùng làm nguồn cho bài giao khi đủ điều kiện Premium. Tạo bản sao cần còn chỗ trong giới hạn quiz của tài khoản. Kiểm tra độ phù hợp nội dung với lớp trước khi dùng; bản sao không phải chỉnh sửa bản công khai của tác giả.

## Gửi quiz của tôi vào kho học liệu như thế nào

Trong quiz của mình, tìm phần Gửi vào kho học liệu, nhập tiêu đề, mô tả, môn và lớp, rồi gửi duyệt và xác nhận. Hệ thống gửi một bản nội dung phục vụ quy trình duyệt, không công khai toàn bộ dữ liệu riêng của tài khoản. Quiz chỉ xuất hiện trong kho khi được duyệt. Trước khi gửi, rà soát tính đúng đắn, quyền sử dụng và loại bỏ tên học sinh hay thông tin cá nhân. Nếu quản trị đang tắt nhận đóng góp, làm theo thông báo thay vì cố gửi lại liên tục.

## Các trạng thái của học liệu gửi duyệt có ý nghĩa gì

Đang chờ duyệt nghĩa là bản gửi chưa được công bố. Đã duyệt là trạng thái được chấp nhận để công bố khi còn đủ điều kiện. Cần chỉnh sửa nghĩa là giáo viên cần xem phản hồi, chỉnh nội dung và gửi duyệt lại. Đã ẩn nghĩa là nội dung không còn được trình bày công khai. Thu hồi đưa bản gửi về nháp. Theo dõi trạng thái ngay trong phần Gửi vào kho học liệu của quiz; không có cam kết thời gian duyệt cố định trong tài liệu này.

## Tại sao chatbot chưa tìm thấy một học liệu tôi vừa chia sẻ

Chia sẻ quiz bằng link không đồng nghĩa với duyệt học liệu công khai. Chatbot tìm học liệu từ nguồn đã duyệt, còn hiệu lực và đã được lập chỉ mục; có độ trễ xử lý giữa lúc nội dung thay đổi và lúc nguồn sẵn sàng. Quiz riêng, bản chờ duyệt hoặc nội dung đã ẩn hay thu hồi không được dùng làm nguồn mới. Kiểm tra trạng thái công bố và tìm trực tiếp trong /library trước. Bộ hướng dẫn sử dụng SmartTeach không tự tạo thêm các giáo trình môn học trong kho.

## Nguồn học liệu từng mở được nay báo không còn thì xử lý thế nào

Học liệu có thể đã được tác giả thu hồi hoặc quản trị ẩn, nên liên kết và trích dẫn cũ không đảm bảo tiếp tục truy cập được. Quay về /library để tìm nguồn hiện còn công bố hoặc hỏi chatbot tìm lại theo môn, lớp và chủ đề. Không tự dựng đường dẫn mới từ tên tài liệu và không coi nội dung cũ là vẫn được xác nhận công khai. Với vấn đề về nội dung, ghi rõ tiêu đề hoặc liên kết công khai khi liên hệ người vận hành, tránh gửi dữ liệu quiz riêng.

## Nguồn đối chiếu nội bộ

- `src/components/library/library-browser.tsx`
- `src/components/library/library-preview.tsx`
- `src/components/library/publication-form.tsx`
- `src/lib/library/api.ts`
- `src/lib/library/types.ts`
- `src/lib/library/limits.ts`
- `src/lib/rag/jobs.ts`
- `src/lib/chat/retrieval-filters.ts`
