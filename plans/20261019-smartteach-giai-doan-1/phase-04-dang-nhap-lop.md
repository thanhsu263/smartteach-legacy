# Phase 4 - Đăng nhập, lớp và yêu thích

## Overview

Thêm Supabase Auth và hai nhóm dữ liệu của giáo viên: lớp (kèm học sinh) và game yêu thích. Mỗi giáo viên chỉ xem và sửa được dữ liệu của mình, do cơ sở dữ liệu bảo đảm (RLS), không chỉ dựa vào giao diện. Phase này là phần duy nhất có backend nên cần xác nhận cho mọi thao tác ghi ra bên ngoài.

## Files

- `supabase/migrations/0001_classes_students_favorites.sql` (mới).
- `src/lib/supabase/client.ts`, `server.ts`, `middleware` làm mới phiên (mới).
- `src/app/login/page.tsx`, `src/app/auth/callback/route.ts` (mới).
- `src/app/my-classes/page.tsx`, `src/app/my-classes/[id]/page.tsx` (mới).
- `.env.example` liệt kê biến môi trường cần có (mới). Khoá thật không nằm trong repo.
- Sửa `src/components/name-list-input.tsx`, `game-card.tsx` ở các phase trước để thêm nút "dùng lớp đã lưu" và nút yêu thích.

## Hợp đồng dữ liệu

Bảng (đều bật RLS, chỉ chủ sở hữu được đọc/ghi):
- `classes`: `id uuid pk`, `owner_id uuid` (mặc định `auth.uid()`, tham chiếu `auth.users`), `name text`, `created_at`.
- `students`: `id uuid pk`, `class_id uuid` (tham chiếu `classes`, xoá theo lớp), `name text`, `position int`. Quyền theo chủ sở hữu của lớp.
- `favorites`: khoá chính `(owner_id, game_id)`; `game_id text` là `id` trong catalog, không khoá ngoại.

Giới hạn mặc định để bảo vệ free tier: tối đa 20 lớp mỗi giáo viên, 100 học sinh mỗi lớp, tên tối đa 100 ký tự. Giới hạn ép ở cơ sở dữ liệu.

## Tasks

- [x] **4.1 Khung đăng nhập.** Supabase Auth với Google và email/mật khẩu; trang `/login`, đăng xuất, trạng thái phiên trong header; làm mới phiên qua middleware. Bước thủ công của chủ dự án: tạo dự án Supabase, tạo OAuth client trong Google Cloud, điền biến môi trường. Kiểm tra: Playwright đăng ký/đăng nhập/đăng xuất bằng email thử; đăng nhập Google kiểm tra thủ công; học sinh vào `/games` và `/tools` không bị hỏi đăng nhập.
- [x] **4.2 Bảo vệ trang giáo viên.** `/my-classes` chuyển về `/login` khi chưa đăng nhập, rồi quay lại trang đang định vào sau khi đăng nhập. Kiểm tra: Playwright.
- [x] **4.3 Migration và RLS.** Viết migration cho ba bảng, chính sách RLS và các giới hạn ở trên. Áp lên Supabase cần xác nhận khi build. Kiểm tra: với hai tài khoản thử, A không đọc, sửa, xoá được lớp, học sinh hay yêu thích của B; truy vấn không đăng nhập không đọc được gì; vượt giới hạn bị từ chối.
- [x] **4.4 Lớp của tôi.** Tạo, đổi tên, xoá lớp; thêm, sửa, xoá học sinh (nhập dán nhiều dòng một lần); nút "dùng lớp đã lưu" trong bốc thăm và chia nhóm điền sẵn tên. Trạng thái: chưa có lớp, đang tải, lỗi lưu có thể thử lại, xác nhận trước khi xoá lớp. Kiểm tra: Playwright luồng tạo lớp, thêm học sinh, bốc thăm bằng lớp đã lưu; khách không thấy nút này.
- [x] **4.5 Game yêu thích.** Nút yêu thích trên thẻ game và trang chơi; mục "Game yêu thích" trong "Lớp của tôi"; khách bấm thì hiện gợi ý đăng nhập và quay lại đúng game. Kiểm tra: Playwright cả hai luồng.
- [ ] **4.6 (tuỳ chọn, không chặn MVP) Truyền danh sách lớp vào game.** Hợp đồng đề xuất: hub gửi `postMessage({type: 'smartteach:roster', classId, names})` tới iframe, game chỉ nhận khi `event.origin` là hub. Phần này cần sửa mã nguồn game ở repo quyentran.online, nên cần chủ dự án cung cấp quyền truy cập và xác nhận trước khi sửa và triển khai game. Chưa rõ game hiện lấy danh sách tên từ đâu; xem mã nguồn game trước khi chốt hợp đồng.

## Acceptance criteria

- Giáo viên đăng ký, đăng nhập, đăng xuất bằng Google hoặc email; học sinh không cần tài khoản ở mọi trang công khai.
- Giáo viên lưu lớp và học sinh, dùng lại cho bốc thăm/chia nhóm; không giáo viên nào xem hoặc sửa được dữ liệu của người khác (đã kiểm thử bằng hai tài khoản).
- Yêu thích và bỏ yêu thích hoạt động; khách được gợi ý đăng nhập.

## Risks

- RLS sai là lỗi bảo mật nghiêm trọng: kiểm thử hai tài khoản ở 4.3 là điều kiện bắt buộc trước khi nhận phase.
- Danh sách học sinh là dữ liệu cá nhân của trẻ em: chỉ lưu tên, không lưu thông tin khác; khoá `service_role` không bao giờ ở phía trình duyệt hay trong repo.
- Chính sách free tier của Supabase thay đổi: đối chiếu lúc triển khai (phase 5).
