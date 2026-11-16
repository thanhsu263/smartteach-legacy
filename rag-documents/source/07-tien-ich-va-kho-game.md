# Sử dụng tiện ích lớp học và kho game

Hướng dẫn các công cụ dùng ngay gồm đồng hồ đếm ngược, bốc thăm tên, chia nhóm và bảng trắng. Danh mục game và trạng thái hiển thị có thể được quản trị cập nhật.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Các tiện ích lớp học nằm ở đâu và có cần đăng nhập không

Vào /tools để mở Đồng hồ đếm ngược, Bốc thăm tên, Chia nhóm và Bảng trắng. Có thể dùng công cụ với nội dung nhập thủ công mà không cần tài khoản. Đăng nhập cần thiết khi muốn lấy danh sách lớp đã lưu của mình để dùng trong bốc thăm hoặc chia nhóm. Các công cụ hoạt động theo màn hình hiện tại; không mặc định chúng là nơi lưu hồ sơ lâu dài hoặc nơi thay đổi danh sách lớp gốc.

## Dùng đồng hồ đếm ngược và âm báo như thế nào

Mở /tools/countdown, chọn số phút có sẵn hoặc nhập Phút và Giây, tổng thời gian phải lớn hơn 0. Bấm Bắt đầu, dùng Tạm dừng khi cần và tiếp tục theo nút trên màn hình. Bật Phát âm báo khi hết giờ nếu muốn nghe thông báo. Kiểm tra âm lượng thiết bị, tab có bị tắt tiếng và quyền phát âm của trình duyệt khi không nghe tiếng. Thử âm báo trước buổi học; không dựa hoàn toàn vào âm thanh nếu thiết bị đang tắt tiếng.

## Bốc thăm tên để không lặp học sinh như thế nào

Mở /tools/draw, nhập danh sách hoặc chọn lớp đã lưu. Bật Không bốc lại người đã bốc để tránh chọn lại người đã có kết quả trong lượt hiện tại. Bấm nút bốc thăm và chờ hiệu ứng hoàn tất. Khi đã bốc hết, chọn Bốc lại từ đầu hoặc bỏ tùy chọn không lặp để tiếp tục. Thay danh sách có thể làm bắt đầu lại lượt bốc; công cụ này không tự ghi điểm hay thay đổi hồ sơ học sinh trong lớp.

## Chia nhóm theo số nhóm hoặc số người ra sao

Mở /tools/groups và nhập danh sách hoặc chọn lớp. Chọn Theo số nhóm nếu đã biết cần bao nhiêu nhóm; chọn Theo số người mỗi nhóm nếu muốn đặt kích thước nhóm. Nhập số phù hợp, bấm Chia nhóm và xem kết quả. Nếu số nhóm nhiều hơn số người, giảm số nhóm. Khi số người không chia hết, số lượng thực tế giữa các nhóm có thể khác nhau. Dùng Chia lại để tạo cách phân nhóm mới; kiểm tra các điều kiện sư phạm mà việc chia ngẫu nhiên không thể tự biết.

## Bảng trắng hỗ trợ những thao tác nào

Mở /tools/whiteboard, chọn Bút, màu và cỡ nét để vẽ bằng chuột hoặc cảm ứng. Dùng Tẩy cho nét cần xóa và nút xóa toàn bộ khi muốn làm sạch bảng. Các màu hiện có gồm đen, xanh dương, đỏ và xanh lá; có các cỡ nét mảnh, vừa và dày. Không có cam kết tự lưu bảng vẽ vào tài khoản hoặc đồng bộ bảng cho nhiều người cùng sửa trong phiên bản này. Nếu cần giữ nội dung, chủ động lưu bằng cách phù hợp trước khi xóa hoặc rời trang.

## Có thể chiếu công cụ lớp học toàn màn hình không

Các công cụ dùng khung trình bày có điều khiển toàn màn hình khi trình duyệt hỗ trợ. Dùng nút trên công cụ và thoát bằng điều khiển của trình duyệt hoặc phím Escape trên máy tính. Khi đang toàn màn hình, popup chatbot được ẩn để tránh che hoạt động lớp học. Nếu không vào được toàn màn hình, thử thao tác trực tiếp trên nút và kiểm tra giới hạn của trình duyệt hay thiết bị; màn hình công cụ thường vẫn sử dụng được.

## Tìm trò chơi và xử lý game không còn hiển thị ra sao

Mở Kho game tại /games, chọn game đang được công bố và mở trang trò chơi. Một số trò chơi được nhúng từ trang bên ngoài nên phụ thuộc kết nối và dịch vụ của bên cung cấp. Quản trị có thể cập nhật hoặc ẩn game; một mục yêu thích hoặc liên kết cũ không bảo đảm trò chơi vẫn còn hoạt động. Nếu game báo không tồn tại, quay về danh mục hiện tại. Không tự nhập mật khẩu SmartTeach vào biểu mẫu của một trang trò chơi bên ngoài.

## Nguồn đối chiếu nội bộ

- `src/components/countdown-tool.tsx`
- `src/components/draw-tool.tsx`
- `src/components/groups-tool.tsx`
- `src/components/whiteboard-tool.tsx`
- `src/components/saved-class-picker.tsx`
- `src/components/tool-stage.tsx`
- `src/components/game-browser.tsx`
- `src/app/games/[id]/page.tsx`
- `src/lib/site/settings.ts`
