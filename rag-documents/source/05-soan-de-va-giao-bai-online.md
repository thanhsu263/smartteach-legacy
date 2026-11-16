# Soạn đề giao bài online và theo dõi kết quả

Hướng dẫn luồng Bài đã giao dành cho giáo viên có Premium, từ chuẩn bị lớp và quiz đến phát hành, cấp mã và theo dõi học sinh. Học sinh làm bài bằng quyền truy cập riêng.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Soạn đề Premium có phải một trình soạn khác với quiz không

Trong phiên bản hiện tại, Soạn đề Premium dùng luồng giao bài online tại /assignments. Giáo viên chuẩn bị câu hỏi trong Quiz của tôi và danh sách học sinh trong Lớp của tôi trước, sau đó tạo bài giao từ một quiz hoàn chỉnh và một lớp có học sinh. Tạo và quản lý quiz vẫn thuộc Free. Premium mở khóa tạo và phát hành bài giao online, thay vì khóa việc soạn quiz thông thường. Trang /assignments cho quản lý bài đã tạo.

## Các bước tạo và phát hành bài giao online là gì

Mở /assignments/new, chọn Lớp và Quiz, nhập Tên bài giao; có thể thêm lời nhắn, thời điểm mở bài và hạn nộp. Chọn chính sách công bố kết quả rồi Lưu bản nháp để kiểm tra. Trong chi tiết bài, kiểm tra lại lớp, nội dung và thời gian trước khi chọn Phát hành bài và xác nhận. Bản nháp chưa phải bài đang giao cho học sinh. Tài khoản hiện có giới hạn tối đa 100 bài giao; tên bài tối đa 100 ký tự và lời nhắn tối đa 1.000 ký tự.

## Mở bài hạn nộp và công bố đáp án được thiết lập thế nào

Mở bài và Hạn nộp là các mốc không bắt buộc trong biểu mẫu tạo bài giao. Nếu cùng đặt, hạn nộp phải sau thời điểm mở; kiểm tra ngày giờ hiển thị trước khi phát hành. Chính sách Công bố kết quả gồm Sau khi thầy cô đóng bài hoặc Ngay sau khi học sinh nộp. Chọn phương án sau khi đóng nếu muốn lớp hoàn thành trước khi xem kết quả. Hết hạn nộp và thao tác Đóng bài là các điều kiện cần xem riêng; không hứa kết quả được công bố chỉ vì đồng hồ vừa qua hạn.

## Cấp mã và gửi liên kết bài giao cho học sinh như thế nào

Trong chi tiết bài giao, tại Danh sách lớp chọn Tạo mã cho đúng học sinh. Mã truy cập mới chỉ được hiển thị lúc cấp, hãy lưu và chuyển riêng cho học sinh đó; có thể Sao chép liên kết riêng hoặc dùng mã QR trên thẻ. Học sinh vào /learn bằng mã bài và mã truy cập riêng, hoặc mở liên kết được cấp. Mã bài có thể chung cho bài giao, nhưng mã truy cập phải riêng từng học sinh. Không gửi các mã riêng này vào chatbot hoặc nhóm công khai.

## Đổi mã thu hồi mã và đặt lại lượt khác nhau thế nào

Đổi mã tạo thông tin truy cập mới cho học sinh; theo cảnh báo của màn hình, lượt đang làm sẽ bị dừng để bảo vệ bài. Thu hồi mã ngừng quyền truy cập bằng mã đó. Đặt lại lượt dùng khi giáo viên chủ động muốn học sinh thực hiện lại, cần xác nhận đúng học sinh vì ảnh hưởng lượt làm hiện có. Chọn các thao tác này từ Danh sách lớp trong chi tiết bài giao và đọc hộp xác nhận. Không hứa mã cũ vẫn hoạt động sau khi đổi hoặc thu hồi.

## Học sinh làm và nộp bài online theo cách nào

Học sinh mở liên kết riêng hoặc nhập mã tại /learn, kiểm tra đúng bài rồi làm câu hỏi trên màn hình. Theo dõi thông báo lưu câu trả lời và lỗi kết nối; hoàn thành bằng nút nộp và xác nhận trên giao diện. Không coi việc đóng tab là đã nộp bài. Nếu không vào được, kiểm tra mã bài, mã truy cập, thời gian mở, hạn nộp và trạng thái đóng bài với giáo viên. Việc xem kết quả phụ thuộc chính sách đã chọn; không phải bài nào cũng hiện đáp án ngay sau nộp.

## Giáo viên theo dõi tiến độ và xem chi tiết bài làm ở đâu

Mở /assignments, chọn bài cần xem. Chi tiết bài hiển thị tiến độ lớp, trạng thái từng học sinh như Chưa bắt đầu, Đang làm hoặc Đã nộp, cùng kết quả khi có. Dùng Xem chi tiết ở đúng học sinh để xem câu trả lời và trạng thái chấm. Phân tích theo câu thể hiện tỷ lệ đúng trên câu đã được chấm; số chưa trả lời được tính theo toàn bộ sĩ số lớp. Khi cần kết thúc bài đang giao, chọn Đóng bài và xác nhận. Bảng này thuộc tài khoản giáo viên, không phải nguồn dữ liệu để chatbot đọc điểm cá nhân.

## Sửa quiz gốc hoặc hết Premium có làm mất bài đã giao không

Bài giao giữ bản chụp nội dung quiz tại thời điểm tạo. Sửa hoặc xóa quiz gốc không tự cập nhật câu hỏi trong bài giao đã tạo; muốn dùng nội dung mới, chuẩn bị bài giao mới và kiểm tra trước khi phát hành. Khi hết Premium, giáo viên vẫn có thể xem và đóng các bài đã giao, học sinh tiếp tục theo điều kiện truy cập và lịch của bài; tạo hoặc phát hành bài mới cần Premium còn hiệu lực. Không dùng việc gia hạn để thay cho xử lý bài đã đóng hoặc mã đã bị thu hồi.

## Nguồn đối chiếu nội bộ

- `src/components/assignments/assignment-compose.tsx`
- `src/components/assignments/assignment-detail.tsx`
- `src/components/assignments/assignments-manager.tsx`
- `src/components/assignments/learn-start.tsx`
- `src/components/assignments/student-assignment-runner.tsx`
- `src/components/membership/require-premium.tsx`
- `src/lib/assignments/limits.ts`
- `supabase/migrations/20261111090000_assignments.sql`
- `supabase/migrations/20261115090000_membership_payos.sql`
