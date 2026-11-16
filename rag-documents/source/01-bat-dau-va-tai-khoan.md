# Bắt đầu sử dụng SmartTeach và quản lý tài khoản

Hướng dẫn chọn đúng chức năng, đăng nhập và bảo vệ tài khoản giáo viên. SmartTeach hỗ trợ quiz trực tiếp, lớp học, học liệu dùng lại, tiện ích và bài giao online.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Tôi nên bắt đầu từ đâu khi dùng SmartTeach

Để tổ chức hoạt động trả lời đồng thời trong lớp, vào Quiz của tôi (/my-quizzes), tạo quiz rồi chọn Chơi ngay. Để giao đề cho từng học sinh tự làm, dùng Bài đã giao (/assignments); chức năng tạo và phát hành bài cần Premium. Để lưu danh sách học sinh, dùng Lớp của tôi (/my-classes). Để tìm nội dung dùng lại, vào Kho học liệu (/library). Để dùng đồng hồ, bốc thăm, chia nhóm hoặc bảng trắng, vào Tiện ích (/tools). Kho game ở /games là danh mục trò chơi, khác với quiz trực tiếp do giáo viên tự soạn.

## Đăng ký tài khoản giáo viên bằng email như thế nào

Mở /login, chọn Đăng ký, nhập email và mật khẩu ít nhất 6 ký tự, rồi chọn Tạo tài khoản. Nếu môi trường bật xác nhận email, mở hộp thư và bấm liên kết xác nhận để hoàn tất; chưa có phiên đăng nhập ngay sau khi gửi đăng ký không có nghĩa là tài khoản bị mất. Sau đó đăng nhập bằng email và mật khẩu. Nếu liên kết hết hạn hoặc đã được dùng, quay lại màn hình đăng nhập và làm theo thông báo. Không đưa mật khẩu hoặc liên kết xác nhận vào chatbot.

## SmartTeach hỗ trợ những cách đăng nhập nào

Màn hình /login hỗ trợ email và mật khẩu, cùng nút Tiếp tục với Google. Đăng nhập Google chỉ hoàn tất khi dịch vụ Google của môi trường đã được quản trị cấu hình. Khi được chuyển từ một trang yêu cầu tài khoản, đăng nhập thành công sẽ đưa giáo viên về trang hợp lệ cần mở. Nếu màn hình báo đăng nhập chưa được cấu hình trên máy chủ, cần báo người vận hành; tạo tài khoản mới nhiều lần không sửa được cấu hình máy chủ.

## Học sinh hoặc khách có cần tài khoản không

Khách có thể xem kho game, học liệu công khai và dùng các tiện ích lớp học. Lưu lớp, quản lý quiz riêng, tạo bản sao học liệu và quản lý bài giao cần tài khoản giáo viên. Học sinh tham gia quiz trực tiếp tại /play bằng PIN và biệt danh, không cần tài khoản giáo viên. Học sinh làm bài giao tại /learn bằng mã bài và mã truy cập riêng do giáo viên cấp. PIN quiz trực tiếp và mã truy cập bài giao là hai cơ chế khác nhau.

## Vì sao đăng nhập rồi nhưng không thấy lớp hoặc quiz của tôi

Lớp và quiz riêng gắn với tài khoản đang đăng nhập. Hãy kiểm tra đúng tài khoản email hoặc Google đã dùng để tạo dữ liệu, mở Lớp của tôi hoặc Quiz của tôi và thử tải lại khi có mạng. Không cần tạo lại hoặc xóa dữ liệu ngay khi danh sách tải lỗi. Nếu lỗi còn tiếp diễn, gửi người vận hành tên màn hình, thao tác và thông báo lỗi; không gửi mật khẩu, token, mã truy cập học sinh hay toàn bộ danh sách lớp.

## Tài khoản bị khóa hoặc không có quyền quản trị thì làm gì

Quản trị viên có thể thay đổi trạng thái tài khoản hoặc vai trò. Tài khoản bị khóa sẽ không tiếp tục dùng các chức năng riêng của giáo viên chỉ bằng cách giữ tab hoặc phiên đăng nhập cũ. Hãy liên hệ bộ phận hỗ trợ theo thông tin hiển thị hiện tại trên website để được kiểm tra tài khoản. Gói Premium và vai trò quản trị là hai quyền độc lập; mua Premium không cấp quyền vào /admin. Không có thao tác tự đổi vai trò quản trị trên màn hình giáo viên.

## Cần giữ riêng những thông tin nào khi dùng SmartTeach

Giáo viên nên giữ riêng mật khẩu, liên kết đăng nhập, mã truy cập bài giao, danh sách học sinh, kết quả và nội dung quiz chưa công khai. Chỉ cấp mã bài giao riêng cho đúng học sinh. Nội dung chủ động gửi vào kho học liệu là bản nội dung chia sẻ để được duyệt; cần loại bỏ dữ liệu cá nhân và bảo đảm quyền sử dụng trước khi gửi. Đọc /privacy để xem phạm vi dữ liệu và điều kiện sử dụng AI đang công bố. Chatbot không phải nơi lưu mật khẩu hoặc API key.

## Nguồn đối chiếu nội bộ

- `src/config/navigation.ts`
- `src/components/login-form.tsx`
- `src/components/require-user.tsx`
- `src/components/teacher-shell.tsx`
- `src/lib/auth/protected-paths.ts`
- `src/app/privacy/page.tsx`
