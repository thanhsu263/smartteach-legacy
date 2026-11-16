# Gói thành viên Premium và trạng thái thanh toán

Giải thích quyền Free, Premium, thời hạn và trạng thái tích hợp thanh toán. Giá và quyền dưới đây phản ánh cấu hình mã nguồn cùng quyết định vận hành được ghi nhận ngày 15/11/2026.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Gói Free dùng được gì và Premium mở thêm gì

Free cho phép tạo và quản lý quiz, tham gia hoạt động quiz cùng lớp và dùng các trò chơi cơ bản. Các tiện ích đồng hồ, bốc thăm, chia nhóm và bảng trắng vẫn có luồng sử dụng thông thường. Premium mở khóa Soạn và giao đề online trong /assignments, cùng theo dõi tiến độ và xem kết quả bài giao. Soạn quiz ở /my-quizzes không bị biến thành tính năng bắt buộc trả phí. Premium không cấp quyền quản trị hệ thống và không mặc định mở thêm một gia sư AI tổng quát.

## Giá Premium tháng và năm hiện tại là bao nhiêu

Theo cấu hình ngày 15/11/2026, Premium 1 tháng giá 50.000đ và Premium 1 năm giá 500.000đ. Hai gói có cùng tính năng, khác thời hạn. Mua 12 tháng theo từng gói tháng có tổng 600.000đ, nên gói năm tiết kiệm 100.000đ so với cách mua đó. Đây không phải thông báo một chương trình khuyến mại có ngày kết thúc. Mở /membership để kiểm tra thông tin hiển thị và quyền tài khoản hiện tại trước khi thực hiện mua.

## Premium còn hạn mà mua thêm thì có cộng dồn không

Theo luật thành viên hiện tại, thời hạn mới được cộng từ ngày hết hạn đang còn hiệu lực; nếu đã hết hạn thì tính từ thời điểm cấp quyền hợp lệ. Gói tháng cộng 1 tháng lịch, gói năm cộng 12 tháng lịch theo cách tính của hệ thống, không mặc định là 30 hoặc 365 ngày cố định. Không tự động gia hạn hoặc tự trừ tiền định kỳ. Chỉ đơn được xác minh thanh toán hoặc thao tác cấp quyền hợp lệ của quản trị mới thay đổi hạn; bấm nút mua không đủ để xác nhận Premium.

## Có thanh toán payOS thật được ngay không

Tại mốc tài liệu 15/11/2026, dự án đã có luồng tích hợp payOS trong mã nguồn nhưng việc kích hoạt dịch vụ thật đang tạm hoãn theo quyết định của chủ hệ thống. Chưa được xem giao diện chọn gói là bằng chứng cổng thanh toán đã vận hành. Nếu báo dịch vụ chưa cấu hình hoặc chưa sẵn sàng, dừng thao tác và liên hệ hỗ trợ theo thông tin hiện tại trên website; không tự chuyển tiền tới tài khoản do chatbot suy đoán. Quản trị cần cập nhật tài liệu trạng thái này khi chính thức mở thanh toán.

## Quay lại từ trang thanh toán có nghĩa là đã được nâng cấp chưa

Việc quay về website hoặc có ảnh chụp chuyển khoản không tự chứng minh quyền Premium đã được cấp. Hệ thống cần kiểm tra trạng thái giao dịch hợp lệ trước khi ghi nhận đơn đã thanh toán và cộng thời hạn. Khi thanh toán thực tế được mở, kiểm tra trang /membership và chức năng kiểm tra trạng thái trên giao diện; nếu còn chờ, không trả tiền lặp lại chỉ vì một lần tải trang chưa cập nhật. Chatbot không thể tự xác nhận giao dịch ngân hàng hoặc sửa trạng thái đơn.

## Premium hết hạn thì dữ liệu quiz lớp và bài giao có bị mất ngay không

Hết Premium không chuyển việc soạn quiz và các trò chơi cơ bản thành trả phí. Các bài giao đã có vẫn có luồng xem và đóng; học sinh tiếp tục trong điều kiện truy cập, lịch và trạng thái bài. Tạo hoặc phát hành bài mới cần Premium còn hạn. Đây không phải cam kết lưu mọi kết quả vô thời hạn: hệ thống có quy tắc lưu trữ riêng và giáo viên cần theo dõi thông báo hiện hành. Khi quyền hiển thị không đúng, kiểm tra tài khoản đăng nhập và thông tin thành viên trước khi tạo đơn mới.

## Nguồn đối chiếu nội bộ

- `src/lib/membership/plans.ts`
- `src/components/membership-plans.tsx`
- `src/components/membership/require-premium.tsx`
- `src/components/membership/membership-checkout.tsx`
- `src/lib/membership/service.ts`
- `supabase/migrations/20261115090000_membership_payos.sql`
- `plans/20261115-admin-rag-chatbot/plan.md`
- `docs/admin-rag-operations.md`
