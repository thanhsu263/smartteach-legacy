# Sử dụng trợ lý RAG và kiểm tra câu trả lời

Hướng dẫn giáo viên hỏi chatbot Hỏi SmartTeach, xem nguồn, quản lý lịch sử và hiểu phạm vi AI. Các giới hạn mặc định có thể được quản trị điều chỉnh.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Chatbot Hỏi SmartTeach xuất hiện ở đâu và dành cho ai

Trợ lý là popup góc dưới bên phải dành cho giáo viên đã đăng nhập và có tài khoản hoạt động, khi tính năng được bật và dịch vụ sẵn sàng. Trên điện thoại, cuộc trò chuyện mở trong hộp thoại phù hợp màn hình. Popup được ẩn ở trang đăng nhập, khu quản trị, màn hình chơi /play, làm bài /learn, điều khiển /host, khi toàn màn hình hoặc khi có hộp thoại khác cần tập trung. Trở lại một trang giáo viên thông thường để mở trợ lý; không thấy popup trong giờ chơi có thể là hành vi chủ ý.

## Nên hỏi chatbot những gì để có câu trả lời hữu ích

Trợ lý hỗ trợ cách dùng SmartTeach và tìm học liệu phù hợp từ tài liệu quản trị cung cấp cùng học liệu đã duyệt. Có thể hỏi Tôi tạo quiz nhiều đáp án thế nào hoặc Tìm học liệu Toán lớp 6 về số nguyên tố. Nêu rõ môn, lớp, chủ đề hoặc tên màn hình và thông báo lỗi. Trợ lý không tự đọc lớp, quiz riêng, kết quả học sinh hay hội thoại của người khác, và không thay giáo viên tạo bài, xóa dữ liệu hoặc thực hiện thanh toán.

## RAG dùng tài liệu và vector để trả lời như thế nào

RAG tìm các đoạn liên quan trong nguồn đủ điều kiện rồi dùng AI soạn câu trả lời kèm trích dẫn. Với tài liệu do quản trị nạp, hệ thống đọc PDF hoặc DOCX có chữ, chia đoạn, tạo vector và chỉ dùng phiên bản đã xử lý sẵn sàng. Vector phục vụ tìm đoạn gần nghĩa, không bảo đảm nội dung nguồn đúng và không phải huấn luyện lại một mô hình riêng cho mỗi tệp. Phiên bản hiện tại chưa OCR để đọc chữ chỉ có trong ảnh. Một tệp đặt trong thư mục máy tính chưa tự trở thành nguồn chatbot.

## Tôi kiểm tra nguồn và độ tin cậy câu trả lời ra sao

Bấm nguồn tham khảo cạnh câu trả lời để xem tiêu đề, đoạn trích và vị trí nguồn. Tài liệu PDF có thể được định vị theo trang, DOCX theo đoạn; học liệu công khai có liên kết để mở nội dung còn hiệu lực. Đối chiếu trích dẫn với câu hỏi và màn hình thực tế trước khi dùng, vì AI vẫn có thể trả lời sai. Nếu nguồn đã bị gỡ, giao diện có thể báo nguồn không còn công bố; hỏi lại để tìm nguồn hiện tại. Không coi một tên tài liệu AI nêu mà không có nguồn kiểm chứng là bằng chứng có học liệu đó.

## Khi trợ lý báo chưa đủ nguồn hoặc hỏi lại thì làm gì

Bổ sung môn, lớp, chủ đề hoặc bước thao tác để thu hẹp câu hỏi. Nếu vẫn thiếu nguồn, tìm trong /library hoặc báo quản trị bổ sung tài liệu phù hợp; không yêu cầu AI đoán nội dung giáo trình, đường dẫn hay điểm học sinh. Bộ hướng dẫn sử dụng này cung cấp kiến thức về hệ thống, chưa thay thế kho bài giảng môn học. Nếu một học liệu vừa được duyệt, cần chờ quy trình lập chỉ mục hoàn tất trước khi kỳ vọng trợ lý tìm được.

## Một ngày được hỏi bao nhiêu và vì sao không gửi được tin

Cấu hình mặc định là 20 câu mỗi tài khoản mỗi ngày theo múi giờ Việt Nam, tối đa 1.400 ký tự mỗi câu hỏi; quản trị có thể điều chỉnh hạn mức. Chờ lượt trả lời đang chạy hoàn tất trước khi gửi tiếp trong cùng hội thoại. Hết lượt, thiếu nguồn, lỗi dịch vụ và dịch vụ chưa cấu hình là các trạng thái khác nhau: đọc thông báo hiện trên giao diện. Không tạo tài khoản hoặc yêu cầu đổi API key để vượt hạn mức. Nếu dịch vụ chưa sẵn sàng, người vận hành cần xử lý cấu hình; giáo viên không cần tự gửi key vào ô chat.

## Lịch sử trò chuyện được lưu bao lâu và xóa ngay thế nào

Hội thoại gắn với tài khoản giáo viên; lịch sử tin nhắn tự hết hạn sau 30 ngày theo thời điểm từng tin, không phải lưu vô hạn kể từ lần mở cuối. Chọn hội thoại trong Lịch sử hội thoại rồi dùng Xóa và xác nhận để xóa ngay hội thoại đó khỏi luồng truy cập của ứng dụng. Không có nút hoàn tác được cam kết. Quản trị không được đọc nội dung chat riêng qua màn hình quản trị. Không diễn giải thao tác xóa ứng dụng thành cam kết xóa tức thì mọi bản sao lưu hoặc dữ liệu ở nhà cung cấp AI.

## Nội dung nào được gửi đến AI và có nên nhập thông tin học sinh không

Thông báo trong chatbot nêu nội dung hỏi và đoạn nguồn được gửi đến Google AI theo điều khoản Free Tier. Hãy đọc /privacy và tránh nhập tên đầy đủ học sinh, điểm cá nhân, mã truy cập bài giao, mật khẩu, API key hoặc tài liệu không được phép chia sẻ. Có thể mô tả lỗi bằng dữ liệu giả hoặc bí danh. Giới hạn quyền riêng của ứng dụng không có nghĩa là nội dung người dùng chủ động gửi vào chat sẽ không rời ứng dụng để xử lý tại nhà cung cấp AI.

## Nguồn đối chiếu nội bộ

- `src/components/chat/chat-widget.tsx`
- `src/components/chat/source-viewer.tsx`
- `src/lib/chat/visibility.ts`
- `src/lib/chat/service.ts`
- `src/lib/chat/answer.ts`
- `src/lib/chat/retrieval-filters.ts`
- `src/lib/ai/gemini.ts`
- `src/app/privacy/page.tsx`
- `plans/20261115-admin-rag-chatbot/contracts.md`
