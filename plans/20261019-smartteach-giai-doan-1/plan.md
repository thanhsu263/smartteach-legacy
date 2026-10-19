Mode: local
Status: active

# SmartTeach - Giai đoạn 1 (MVP)

Nguồn hướng đi: [Decision Brief](../reports/brainstorm-2026-10-19-smartteach-hub.md) (đã gồm Design Brief đã xác nhận).

## Kết quả mong muốn

Một hub web tiếng Việt, miễn phí, chạy trên free tier. Khách mở được kho game (có lọc theo môn và lớp), chơi game của quyentran.online ngay trong hub, và dùng bốn tiện ích lớp học mà không cần đăng nhập. Giáo viên đăng nhập bằng Google hoặc email/mật khẩu để lưu danh sách lớp và game yêu thích.

## Phạm vi

Trong phạm vi:
- Hub Next.js, giao diện theo Design Brief, tên tạm "SmartTeach" trong một biến cấu hình.
- Kho game, trang game nhúng quyentran.online bằng iframe.
- Tiện ích chạy trên trình duyệt: đồng hồ đếm ngược, bốc thăm tên, chia nhóm, bảng trắng.
- Đăng nhập giáo viên (Supabase Auth), lưu lớp và học sinh, game yêu thích.
- Triển khai public trên Vercel + Supabase free tier.

Ngoài phạm vi: quiz tự soạn và chơi bằng PIN (giai đoạn 2), đề thi online (giai đoạn 3), gói trả phí, viết lại game cũ, sổ chủ nhiệm.

## Hiện trạng đã kiểm tra

- `F:\smartTeach` chưa có mã ứng dụng và chưa phải git repo (chỉ có `.claude`, `.hs.json`, `plans`). Mọi file của hub là file mới ở gốc repo.
- Máy có Node v24.12.0, npm 11.15.0, git 2.55.0.
- `quyentran.online` là bản build Vite thuần trên Vercel, không gửi `X-Frame-Options` hay CSP chặn nhúng, nên nhúng iframe được.
- Mẫu tham chiếu (ezthi.com, quan sát chỉ đọc): trang game có chọn lớp, danh sách học sinh, game nhúng bằng iframe bên dưới, nút toàn màn hình.

## Các phase

| Phase | Tên | Phụ thuộc | Trạng thái |
|---|---|---|---|
| 1 | [Nền tảng và giao diện](./phase-01-nen-tang-giao-dien.md) | không | Done (chờ review) |
| 2 | [Kho game và nhúng game](./phase-02-kho-game.md) | 1 | Done (chờ kiểm tra điện thoại thật và review) |
| 3 | [Tiện ích lớp học](./phase-03-tien-ich.md) | 1 | Done (chờ kiểm tra thiết bị thật và review) |
| 4 | [Đăng nhập, lớp và yêu thích](./phase-04-dang-nhap-lop.md) | 1, 2, 3 | Pending |
| 5 | [Triển khai và nghiệm thu](./phase-05-trien-khai.md) | 1-4 | Pending |

Phase 2 và 3 độc lập nhau nên có thể làm theo thứ tự nào cũng được. Phase 4 cần cả hai vì nó thêm nút yêu thích vào kho game và nút "dùng lớp đã lưu" vào bốc thăm/chia nhóm.

## Bản đồ tiêu chí nghiệm thu

| Tiêu chí trong brief | Task | Cách kiểm tra |
|---|---|---|
| Khách mở trang chủ và danh mục game, lọc theo môn và lớp | 1.3, 2.1, 2.2 | Unit test hàm lọc; Playwright mở danh mục và lọc |
| Game quyentran.online mở được từ hub trên điện thoại và máy tính | 2.3 | Playwright ở viewport điện thoại và máy tính; kiểm tra thủ công trên điện thoại thật |
| Tiện ích dùng được không cần đăng nhập | 3.1-3.4 | Unit test logic bốc thăm/chia nhóm; Playwright chạy từng tiện ích khi chưa đăng nhập |
| Giáo viên đăng ký, đăng nhập, đăng xuất; học sinh không cần tài khoản | 4.1, 4.2 | Playwright với tài khoản email thử; đăng nhập Google kiểm tra thủ công |
| Lưu danh sách lớp, dùng cho bốc thăm/chia nhóm, chỉ xem/sửa dữ liệu của mình | 4.3, 4.4 | Kiểm thử chính sách RLS bằng hai tài khoản thử; Playwright luồng lưu và dùng lại lớp |
| Đánh dấu và bỏ đánh dấu yêu thích; khách được gợi ý đăng nhập | 4.5 | Playwright cả hai luồng |
| Triển khai public trên free tier, chi phí 0 | 5.1, 5.2 | Mở URL Vercel công khai; đối chiếu gói đang dùng với trang giá hiện hành |
| Trạng thái giao diện và WCAG AA (từ Design Brief) | 1.2, 5.3 | Kiểm tra từng trạng thái ở mỗi phase; rà soát tương phản và bàn phím ở 5.3 |

## Rủi ro và việc cần chủ dự án quyết định

| Rủi ro | Kiểm tra hoặc bàn giao |
|---|---|
| Game có nhân vật Peyo/IMPS và nhạc Ubisoft, ghi "nội bộ, phi thương mại"; đưa lên hub công khai có thể vi phạm bản quyền | Chủ dự án quyết định trước task 5.2 (công khai). Plan không tự chọn hướng xử lý. |
| Không phát hiện được lỗi tải iframe khác origin | Task 2.3 luôn hiện đường dẫn "mở trong tab mới" bên cạnh game |
| Dự án Supabase free có thể bị tạm dừng khi không hoạt động | Task 5.2 đối chiếu chính sách hiện hành và ghi cách đánh thức lại vào tài liệu triển khai |
| Cấu hình Google OAuth cần tài khoản Google Cloud của chủ dự án | Task 4.1 nêu rõ bước thủ công; không nằm trong khả năng tự động của build |
| Truyền danh sách lớp vào game cần sửa mã nguồn game, ở repo khác | Task 4.6 là tuỳ chọn, không chặn MVP; cần xác nhận khi sửa và triển khai game |

## Hành động cần xác nhận khi build

Các bước sau ghi ra bên ngoài máy và `hs-build` phải hỏi lại người dùng ở thời điểm thực hiện: tạo dự án Supabase, áp migration lên Supabase, bật Google OAuth, triển khai Vercel, sửa và triển khai game ở repo quyentran.online.
