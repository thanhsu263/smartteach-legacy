# Quản lý lớp học và danh sách học sinh

Hướng dẫn tạo lớp, cập nhật tên học sinh và dùng danh sách lớp trong tiện ích hoặc bài giao. Các thao tác này thực hiện trong tài khoản giáo viên.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Làm thế nào để tạo lớp và lưu danh sách học sinh

Đăng nhập, mở Lớp của tôi (/my-classes), nhập tên lớp trong phần Tạo lớp mới và chọn Tạo lớp. Mở lớp vừa tạo, dán danh sách tên vào phần thêm học sinh, mỗi dòng một tên, rồi lưu bằng nút thêm học sinh. Có thể tạo lớp trước và bổ sung danh sách sau. Chỉ nhập tên hoặc bí danh cần cho hoạt động; không đưa số căn cước, địa chỉ, số điện thoại hoặc dữ liệu nhạy cảm vào tên học sinh.

## Một tài khoản lưu được bao nhiêu lớp và học sinh

Theo giới hạn hiện tại của SmartTeach, mỗi tài khoản lưu tối đa 20 lớp, mỗi lớp tối đa 100 học sinh. Tên lớp và tên học sinh tối đa 100 ký tự. Nếu tạo lớp bị chặn vì đã đủ 20 lớp, rà soát và xóa lớp cũ thật sự không còn cần trước khi tạo thêm. Nếu vượt số học sinh, kiểm tra danh sách dán và tổng số đã có trong lớp; chia thành các lớp quản lý riêng khi phù hợp. Mua Premium không được mô tả là tăng các giới hạn này.

## Tôi sửa tên lớp hoặc tên học sinh như thế nào

Trong /my-classes, chọn lớp cần chỉnh sửa. Dùng Đổi tên lớp để sửa tên lớp rồi chọn Lưu. Với học sinh, dùng nút Sửa tên của đúng dòng, chỉnh nội dung và Lưu. Phần thêm học sinh nhận danh sách mỗi dòng một tên để bổ sung vào lớp đang mở. Khi thao tác lưu báo lỗi, giữ thông tin đang nhập và thử lại sau khi kiểm tra mạng; xác nhận tên mới xuất hiện trong danh sách trước khi rời trang.

## Dùng danh sách lớp đã lưu cho bốc thăm và chia nhóm ra sao

Mở Bốc thăm tên tại /tools/draw hoặc Chia nhóm tại /tools/groups, chọn lớp đã lưu qua bộ chọn lớp. Danh sách được đưa vào công cụ để dùng cho hoạt động hiện tại. Cũng có thể nhập danh sách thủ công khi không muốn dùng lớp đã lưu. Nếu bộ chọn lớp không tải được, kiểm tra đăng nhập, mạng và xem lớp có tồn tại trong /my-classes hay không. Danh sách đang dùng trong công cụ không phải giao diện sửa hồ sơ lớp; muốn sửa dữ liệu lớp đã lưu, quay về trang lớp.

## Vì sao lớp chưa chọn được khi tạo bài giao

Luồng tạo bài giao cần ít nhất một lớp có học sinh và một quiz hoàn chỉnh. Hãy mở /my-classes, vào đúng lớp và thêm học sinh trước; sau đó kiểm tra quiz ở /my-quizzes. Khi cả hai đã có, quay lại /assignments/new. Quyền Premium cần cho tạo bài giao, trong khi quản lý lớp và soạn quiz không được thay bằng yêu cầu học sinh mua gói. Mỗi học sinh làm bài bằng mã truy cập riêng do giáo viên cấp từ bài đã phát hành.

## Cần kiểm tra gì trước khi xóa lớp hoặc học sinh

Các nút xóa trong Lớp của tôi và trang chi tiết lớp thay đổi dữ liệu đã lưu của tài khoản. Trước khi xác nhận, kiểm tra đúng tên lớp hoặc đúng học sinh và các bài giao đang sử dụng danh sách này. Xóa lớp làm mất danh sách học sinh thuộc lớp đó; không xem đây là cách sửa lỗi tải dữ liệu. Không có cam kết khôi phục qua một nút hoàn tác trong màn hình lớp. Nếu chỉ sai chính tả, ưu tiên đổi tên thay cho xóa rồi thêm lại.

## Nguồn đối chiếu nội bộ

- `src/components/classes-manager.tsx`
- `src/components/class-editor.tsx`
- `src/components/saved-class-picker.tsx`
- `src/lib/classes/api.ts`
- `src/lib/classes/limits.ts`
