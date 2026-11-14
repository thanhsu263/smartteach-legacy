# Phase 03 — Quản lý lớp học

## Mục tiêu

Chuyển danh sách và chi tiết lớp sang các frame Figma, đồng thời giữ nguyên API
tạo/đổi tên/thêm/sửa/xóa lớp và học sinh.

## Công việc

1. Lấy design context cho `34:7501`, `34:7707`, `34:7853`, `36:27124`,
   `36:27428`, `36:27780`, `36:28117`.
2. Danh sách `/my-classes`:
   - page heading, CTA, search theo tên cục bộ, card grid, empty/loading/error;
   - create form chuyển vào modal desktop/bottom sheet mobile;
   - card chỉ hiển thị tên và `studentCount`; không bịa môn, khối, hoạt động gần nhất;
   - xác nhận xóa có dialog, restore focus và thông báo kết quả;
   - giữ `FavoritesSection` ở khu vực phụ, dùng Foundation card vì chưa có frame riêng.
3. Chi tiết `/my-classes/[id]`:
   - desktop table, mobile student cards;
   - chỉ view Học sinh; không render tab Hoạt động/Kết quả chưa có dữ liệu;
   - add students, rename class/student, delete student dùng modal/drawer tương ứng;
   - icon action 44–48px với tooltip và nhãn truy cập;
   - giữ liên kết dùng lớp trong Bốc thăm/Chia nhóm dưới dạng action có nghĩa.
4. Giữ loading/error/not-found và giới hạn lớp/học sinh hiện tại; không sửa
   `src/lib/classes`, schema hay Supabase calls.
5. Cập nhật auth e2e để kiểm create/edit/delete/search, desktop/mobile dialog và axe.

## File dự kiến

- `src/app/my-classes/page.tsx`
- `src/app/my-classes/[id]/page.tsx`
- `src/app/my-classes/my-classes.module.css`
- `src/components/classes-manager.tsx`
- `src/components/classes-manager.module.css`
- `src/components/class-editor.tsx`
- `src/components/class-editor.module.css`
- `src/components/favorites-section.tsx` / `.module.css`
- shared modal/drawer/empty/loading primitive từ Phase 01
- `e2e/auth.spec.ts`, `e2e/a11y-auth.spec.ts`

## Acceptance

- Empty và populated list đúng hierarchy Figma với dữ liệu thật.
- Create/rename/add/edit/delete giữ nguyên API và thông báo hiện hữu.
- Desktop table không đổi kích thước khi hover; mobile card không tràn 375px.
- Dialog destructive yêu cầu xác nhận, nút an toàn nhận focus mặc định.
- Không có subject/grade/join-status/tabs giả.
- Targeted auth + axe đạt ở 1280px và 375px.

## Evidence

- Screenshot empty/populated/delete/rename ở desktop và mobile rename sheet.
- E2E đi trọn luồng: tạo lớp → thêm/sửa/xóa học sinh → đổi tên → dùng trong tool.
