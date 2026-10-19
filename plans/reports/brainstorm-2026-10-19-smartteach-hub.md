---
title: SmartTeach - hub tiện ích giảng dạy cho giáo viên
date: 2026-10-19
status: decided
---

# SmartTeach - hub tiện ích giảng dạy cho giáo viên

## Intent / Problem

Người dùng (một lập trình viên độc lập) muốn xây một website hỗ trợ giáo viên
dạy học, gồm trò chơi học tập, quiz và các tiện ích lớp học, tương tự
nganhangtrochoiso.vercel.app, giaoviendoimoi.com và ezthi.com. Người dùng đã có
site game riêng https://www.quyentran.online/ (hiện thấy một game gọi tên sinh
viên) và muốn tích hợp vào dự án mới.

Repo `F:\smartTeach` hiện chưa có mã nguồn ứng dụng, chỉ có bộ công cụ `.claude`.

## Desired Outcome

Một hub web miễn phí: giáo viên đăng nhập để lưu và quản lý nội dung, học sinh
tham gia bằng PIN hoặc link, không cần tài khoản. Hub gom game, quiz, tiện ích
lớp học và (về sau) đề thi online vào một chỗ.

## Constraints

- Làm một mình, ưu tiên free tier. Stack đã chốt: Next.js + Supabase (Auth, Postgres) + Vercel.
- Đăng nhập giáo viên bằng Google và email/mật khẩu (Supabase Auth). Học sinh không cần tài khoản.
- Game của quyentran.online giữ nguyên, nhúng như module (iframe/đường dẫn con), chuyển dần sau.
- Miễn phí, chưa có thanh toán hay phân quyền gói.
- Giao diện và nội dung bằng tiếng Việt, dùng được trên điện thoại (học sinh).

## Non-goals

- Gói trả phí, thanh toán, freemium.
- Viết lại game cũ theo kiến trúc mới trong giai đoạn 1.
- Sổ chủ nhiệm, thời khoá biểu, quản lý lớp kiểu ezthi.
- Quiz realtime bằng PIN và đề thi online (thuộc giai đoạn 2 và 3).

## Domain Context

Ba site tham chiếu có điểm chung: giáo viên đăng nhập, học sinh vào bằng PIN
hoặc link. Ngân Hàng Trò Chơi Số có Khám phá, Tiện ích, Tạo game, Nhập mã PIN;
tiện ích gồm đồng hồ đếm ngược, bảng trắng, đo tiếng ồn, quản lý lớp. ezthi tập
trung vào nhập đề từ Word/PDF, thi online, chấm tự động. Không đọc được nội dung
giaoviendoimoi.com. Stack của quyentran.online chưa biết.

## Options Considered

| Option | Key assumption | Failure condition | Trade-offs |
|---|---|---|---|
| Hub + nhúng game cũ (chọn) | Game cũ chạy độc lập, nhúng được qua iframe/đường dẫn con | Game cũ chặn nhúng (X-Frame-Options/CSP) hoặc cần chung đăng nhập | Nhanh, rủi ro thấp; giao diện chưa đồng nhất |
| Gộp mã nguồn vào chung repo | Có mã nguồn và stack tương thích | Stack khác nhau, phải sửa nhiều | Đồng nhất hơn nhưng tốn công |
| Viết lại từng game | Code cũ khó mở rộng | Tốn thời gian, trễ MVP | Đồng nhất nhất, tốn nhất |

## Decision

Làm hub mới, chia 3 giai đoạn, mỗi giai đoạn dùng được ngay:

1. **Giai đoạn 1 (MVP):** hub, kho game có lọc theo môn và lớp, nhúng game
   quyentran.online, tiện ích chạy trên trình duyệt (đồng hồ đếm ngược, bốc thăm
   tên, chia nhóm, bảng trắng), đăng nhập giáo viên. Sau khi đăng nhập, giáo viên
   lưu được danh sách lớp (tên học sinh) để dùng lại cho bốc thăm/chia nhóm, và
   đánh dấu game yêu thích.
2. **Giai đoạn 2:** tự soạn quiz, chơi bằng PIN, bảng xếp hạng trực tiếp.
3. **Giai đoạn 3:** đề thi online: soạn tay và nhập CSV/Excel trước, nhập
   Word/PDF và công thức Toán sau, chấm tự động.

## Reasoning

Người dùng chọn cả 4 nhóm tính năng nhưng làm một mình trên free tier. Gom vào
một MVP làm trễ giá trị đầu tiên. Giai đoạn 1 gần như không cần backend nặng và
cho ra sản phẩm dùng được sớm. Realtime (giai đoạn 2) và đọc Word/PDF (giai
đoạn 3) là hai phần rủi ro nhất nên để sau.

## Acceptance Criteria

Giai đoạn 1:
- Khách mở được trang chủ và danh mục game, lọc được theo môn và lớp.
- Game quyentran.online mở được từ hub (nhúng hoặc đường dẫn con) trên điện thoại và máy tính.
- Các tiện ích (đồng hồ đếm ngược, bốc thăm, chia nhóm, bảng trắng) dùng được không cần đăng nhập.
- Giáo viên đăng ký/đăng nhập được và đăng xuất được; học sinh không cần tài khoản.
- Giáo viên lưu được danh sách lớp (tên học sinh), dùng lại cho bốc thăm/chia nhóm, và chỉ xem/sửa được dữ liệu của chính mình.
- Giáo viên đánh dấu và bỏ đánh dấu game yêu thích; khách bấm yêu thích thì được gợi ý đăng nhập.
- Triển khai công khai trên free tier, chi phí hạ tầng bằng 0.

## Design Brief (đã xác nhận)

- **Tóm tắt:** hub tiếng Việt cho giáo viên phổ thông; hành động chính là mở một game hoặc tiện ích trong tối đa 2 lần bấm từ trang chủ.
- **Hướng thiết kế:** màu Committed. Xanh dương chủ đạo, vàng chỉ cho nút kêu gọi hành động, nền sáng. Chữ Be Vietnam Pro, bo góc khoảng 10px, hero có ảnh minh hoạ giao diện, giọng văn "Thầy cô…".
- **Bối cảnh:** giáo viên đứng lớp, chiếu laptop lên máy chiếu giữa ánh sáng ban ngày, nên dùng giao diện sáng.
- **Tham chiếu:** ezthi.com (bố cục, giọng điệu), Ngân Hàng Trò Chơi Số (kho game), Kahoot (độ vui). Chỉ học phong cách, không chép logo, ảnh hay câu chữ.
- **Phạm vi:** high-fi, chất lượng phát hành. Gồm trang chủ, kho game, trang game nhúng, các trang tiện ích, đăng nhập và "Lớp của tôi". Mobile-first; tiện ích tối ưu cho chiếu màn hình lớn.
- **Trạng thái:** chưa có lớp nào; đang tải; game nhúng lỗi (có đường dẫn mở tab mới thay thế); bấm yêu thích khi chưa đăng nhập thì gợi ý đăng nhập.
- **Thương hiệu:** tên tạm "SmartTeach", đặt trong một biến cấu hình để đổi sau.
- **Truy cập:** WCAG AA; chữ trên nút vàng dùng màu tối để đủ tương phản.

## Quan sát ezthi.com (người dùng cho xem sau đăng nhập, chỉ đọc)

- Thanh bên theo nhóm: Tổng quan, Đề thi, Ôn tập, Quản lý (Lớp học, Điểm, Kỳ thi), nhóm "Gọi tên" gồm các game dùng danh sách lớp.
- Trang game có mẫu: chọn lớp, danh sách học sinh với nút bật/tắt điểm danh, game nhúng bằng iframe ngay bên dưới, nút chiếu toàn màn hình.
- Mẫu này khớp game gọi tên của người dùng: danh sách lớp lưu ở hub, hub truyền vào game đã nhúng.

## Open Questions / Risks

- Đã kiểm tra: quyentran.online là bản build Vite thuần trên Vercel, không gửi header chặn nhúng (X-Frame-Options/CSP) nên nhúng iframe được. Chưa rõ game đang lấy danh sách tên từ đâu; truyền danh sách lớp từ hub vào game cần sửa mã nguồn game (người dùng sở hữu).
- Game có nội dung của bên thứ ba (nhân vật Peyo/IMPS, nhạc Ubisoft) và ghi "nội bộ, phi thương mại". Chủ dự án cần quyết định trước khi đưa lên hub công khai.
- Giới hạn kết nối realtime của free tier phải được thử với lớp 40-50 học sinh trước khi cam kết giai đoạn 2.
- Nhập Word/PDF và công thức Toán (giai đoạn 3) là phần khó nhất.
- Chưa chốt tên miền và thương hiệu; giaoviendoimoi.com chưa được khảo sát.
- Chưa xác định nguồn nội dung cho kho game: chỉ game của người dùng, hay có đóng góp từ bên ngoài.
