# Tổ chức quiz trực tiếp bằng PIN

Hướng dẫn giáo viên mở và điều khiển phiên quiz trực tiếp, học sinh tham gia bằng PIN, cùng cách xử lý một số tình huống trong giờ học.

Phiên bản 2026-11-16.1 · Đối chiếu mã nguồn 15/11/2026.

## Giáo viên mở phiên quiz trực tiếp như thế nào

Mở Quiz của tôi, chọn quiz hoàn chỉnh rồi Chơi ngay. Trong bảng Bắt đầu phiên chơi, kiểm tra các tùy chọn điểm tốc độ, tự động qua câu và kho báu, sau đó Bắt đầu phiên. Ở phòng chờ, cung cấp PIN cho học sinh và yêu cầu các em vào /play. Chỉ bắt đầu câu hỏi khi lớp đã sẵn sàng. Nếu quiz còn lỗi, bảng mở phiên chỉ ra các điểm cần sửa trước; mở phiên mới không tự sửa nội dung quiz.

## Học sinh vào phòng bằng PIN ra sao

Học sinh mở /play, nhập PIN mà giáo viên đang hiển thị và một biệt danh rồi vào phòng. Không cần tạo tài khoản giáo viên. Nếu PIN không hợp lệ, kiểm tra lại PIN của phiên đang hoạt động; PIN của phiên cũ không dùng cho phiên mới. Nếu biệt danh đã có người dùng trong phòng, chọn tên phân biệt. Có thể dùng bí danh do giáo viên thống nhất để hạn chế thông tin cá nhân. PIN này không thay cho mã bài và mã truy cập riêng của /learn.

## Không mở được phiên mới vì đã có phiên đang chạy thì làm gì

Khi tài khoản có phiên chưa kết thúc, bảng Chơi ngay cho chọn Tiếp tục phiên đang chạy hoặc Kết thúc phiên cũ. Tiếp tục nếu đó vẫn là buổi học hiện tại. Chỉ kết thúc phiên cũ sau khi xác nhận đúng phiên, vì học sinh đang chơi sẽ bị ngắt; điểm hiện có được giữ lại theo thông báo. Sau đó mới mở phiên mới. Không cần xóa quiz để giải quyết tình trạng còn phiên đang chạy.

## Điểm tốc độ và tự động qua câu hoạt động thế nào

Trước khi bắt đầu phiên, giáo viên chọn có tính thêm điểm tốc độ hay không. Bật Tự động qua câu để khi hết giờ hệ thống hiện đáp án rồi tự chuyển sang câu tiếp theo. Khoảng hiện đáp án có các mức 5, 8 hoặc 12 giây; khi kết hợp kho báu cần ít nhất 8 giây để học sinh mở rương. Trong chế độ tự động, giữ màn hình điều khiển hiển thị, không thu nhỏ hoặc che theo hướng dẫn trên giao diện. Thời gian trả lời của từng câu vẫn lấy từ cấu hình câu hỏi.

## Chế độ kho báu trong quiz trực tiếp là gì

Kho báu là tùy chọn giải trí của phiên quiz trực tiếp. Sau chuỗi 3 câu đúng liên tiếp hoặc 3 câu sai hay bỏ trống liên tiếp, học sinh nhận rương theo luật của chế độ. Phần thưởng có thể cộng, nhân, chia hoặc trừ điểm của chính người mở; không tác động điểm của bạn khác. Vì yếu tố ngẫu nhiên có thể thay đổi thứ hạng, giáo viên nên cân nhắc khi dùng phiên chơi để đánh giá chính thức. Kho báu không phải chức năng thanh toán hoặc mua vật phẩm.

## Giáo viên tạm dừng và xem kết quả quiz trực tiếp ở đâu

Dùng màn hình điều khiển phiên tại /host để theo dõi và chuyển câu theo chế độ đã chọn. Khi dùng tự động qua câu, thanh điều khiển có thao tác tạm dừng và tiếp tục trong giai đoạn câu hỏi hoặc hiện đáp án. Cuối phiên xem kết quả và bảng xếp hạng; lịch sử các buổi đã chơi cũng có trong trình soạn quiz và khu vực phiên chơi của giáo viên. Kết quả quiz trực tiếp khác với kết quả bài giao ở /assignments. Chatbot không truy vấn bảng điểm riêng để báo điểm từng học sinh.

## Đang chơi quiz mà mất mạng hoặc trả lời không được thì xử lý thế nào

Kiểm tra trạng thái kết nối trên màn hình chơi và kết nối mạng của cả máy giáo viên lẫn học sinh. Giáo viên có thể tạm dừng phiên nếu phù hợp rồi đợi kết nối ổn định. Làm theo nút thử lại hoặc thông báo trên màn hình; nếu cần vào lại phòng, dùng đúng PIN phiên hiện tại. Không khẳng định câu trả lời đã được chấp nhận chỉ vì đã bấm trên thiết bị khi mạng mất. Nếu lỗi lặp lại, ghi lại thông báo và bước xảy ra lỗi, tránh gửi mã truy cập riêng hoặc dữ liệu học sinh lên nhóm công khai.

## Nguồn đối chiếu nội bộ

- `src/components/live/host/start-session.tsx`
- `src/components/live/host/host-screen.tsx`
- `src/components/live/host/lobby.tsx`
- `src/components/live/player/join-form.tsx`
- `src/components/live/player/play-screen.tsx`
- `src/components/live/results/session-history.tsx`
- `src/components/live/results/results-screen.tsx`
- `src/lib/live/errors.ts`
