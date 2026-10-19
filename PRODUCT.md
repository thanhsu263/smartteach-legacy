# Product

## Register

product

## Users

Giáo viên phổ thông Việt Nam, dạy nhiều lớp trong ngày. Họ mở hub trên laptop để chiếu lên máy chiếu giữa ánh sáng ban ngày, hoặc trên điện thoại khi chuẩn bị bài. Họ cần một trò chơi hoặc tiện ích chạy ngay, không cài đặt, không phải đọc hướng dẫn. Học sinh chỉ chơi hoặc xem trên màn chiếu, không có tài khoản.

## Product Purpose

SmartTeach (tên tạm, đổi qua `src/config/site.ts`) gom trò chơi học tập, tiện ích lớp học và về sau là quiz, đề thi online vào một chỗ miễn phí. Giáo viên đăng nhập để lưu danh sách lớp và game yêu thích. Thành công là giáo viên mở một game hoặc tiện ích trong tối đa 2 lần bấm từ trang chủ và quay lại dùng trong tiết sau.

## Brand Personality

Thân thiện, nhanh gọn, đáng tin. Giọng văn gọi người dùng là "Thầy cô", ngắn, cụ thể, không hô hào.

## Anti-references

- Trông như phần mềm hành chính hoặc cổng thông tin nhà trường.
- Trang đầy quảng cáo kiểu web game giải trí.
- Mascot và hiệu ứng rối mắt làm cản việc dạy.
- Sao chép nguyên ezthi.com: chỉ học bố cục và giọng điệu, không dùng lại logo, hình ảnh hay câu chữ.

## Design Principles

1. **Nhanh hơn mọi thứ khác.** Mỗi màn hình có một việc chính; giáo viên tới đích trong tối đa 2 lần bấm.
2. **Chiếu lên bảng vẫn đọc được.** Tiện ích phải rõ ở cuối lớp: chữ lớn, tương phản cao, không phụ thuộc hover.
3. **Quen thuộc thắng bất ngờ.** Dùng mẫu giao diện chuẩn; niềm vui nằm ở game và khoảnh khắc, không ở trang trí.
4. **Trung thực với trạng thái.** Trống, đang tải, lỗi đều có lời nhắn nói rõ chuyện gì xảy ra và bước tiếp theo.
5. **Dữ liệu của học sinh là nhạy cảm.** Chỉ hỏi và lưu thứ cần thiết.

## Accessibility & Inclusion

WCAG AA: tương phản chữ tối thiểu 4.5:1, điều hướng bằng bàn phím với focus rõ, `lang="vi"`, tôn trọng `prefers-reduced-motion`, không dùng màu làm tín hiệu duy nhất.
