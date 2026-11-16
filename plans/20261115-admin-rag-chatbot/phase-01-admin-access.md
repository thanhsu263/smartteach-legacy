# Phase 1 — Admin, tài khoản và ranh giới quyền

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable

## Kết quả / phạm vi

Admin đầu tiên vào được shell riêng và quản lý role/trạng thái tài khoản qua DTO giới hạn; teacher và token cũ không vượt được quyền. Đây là nền cho mọi API quản trị. Chưa thêm quyền đọc dữ liệu riêng của teacher.

## Files / areas

- **Mới:** supabase/migrations/20261115100000_admin_access.sql; src/lib/admin/{access,http,types,users,audit}.ts; src/lib/supabase/admin.ts; src/components/admin/{admin-shell,require-admin,users-manager}.tsx và CSS Modules.
- **Mới:** src/app/admin/{layout,page}.tsx, src/app/admin/users/page.tsx, /api/admin/session, /api/admin/users[/[id]], src/app/account-disabled/page.tsx, scripts/bootstrap-admin.mjs.
- **Sửa có kiểm soát:** src/proxy.ts, src/lib/auth/protected-paths.ts, src/components/{require-user,auth-provider,app-chrome,teacher-shell}.tsx, src/lib/membership/payos.ts nếu dùng factory admin chung; không đổi wire contract billing.
- **Mới:** tests/db/admin-access.test.ts, src/lib/admin/access.test.ts, route tests, e2e/admin-access.spec.ts; fixture admin mở rộng helpers hiện có.

## Tasks

- [x] **P1.1 — Registry và bootstrap.** Thêm account role/state với grant tối thiểu, default/backfill teacher active; helper active/admin và script bootstrap theo UUID, target local mặc định, không signup/email allowlist. Bảo vệ admin active cuối bằng khóa transaction; không cung cấp endpoint bootstrap public.
  - Verify: teacher sửa user_metadata client, insert registry, gọi admin RPC đều bị chặn; bootstrap lặp/đồng thời không tạo đường tự nâng quyền; hai lần demote/block đồng thời không mất admin cuối; dữ liệu cũ vẫn thuộc đúng owner.
- [x] **P1.2 — Mutations và audit nguyên tử.** RPC account role/block/unblock kiểm lại actor trong DB, expectedVersion, lý do bounded và audit cùng transaction. User DTO allowlist theo contracts, không trả auth metadata hoặc nội dung của teacher. Khóa ghi DB trước, đồng bộ Supabase Auth ban/session qua server; lỗi đồng bộ ghi trạng thái cần thử lại, không mở lại DB guard.
  - Verify: rollback không có mutation thiếu audit; idempotent retry không nhân audit nghiệp vụ; audit có actor/target/action/outcome nhưng không có payload riêng. Test canary tên học sinh/quiz/chat không có trong API, lỗi hoặc log.
- [x] **P1.3 — Chặn session cũ trên toàn đường teacher.** Lập inventory grants/policies và mọi public teacher RPC mới nhất (không chỉ bản định nghĩa đầu của migration). Thêm restrictive active-user policy cho direct tables; kiểm active helper ở SECURITY DEFINER và central private.host_session cùng các RPC đặc biệt create_session/host_state. Bao phủ classes/students/favorites, quiz/questions/options/import/share/clone, teacher live/results, assignments/analytics, library submission và membership preparation. Giữ anon player/learn và service webhook không bị chặn theo actor admin.
  - Verify: phát token trước khóa rồi test direct SELECT/INSERT/UPDATE/DELETE và RPC tiêu biểu từng module; tất cả denied. Bỏ khóa phục hồi đúng quyền owner. Student anon đang làm bài đã phát hành vẫn hoạt động; service settle không bị guard teacher chặn. Thu hồi admin có hiệu lực request kế tiếp với JWT cũ. Public guest game/tools không phụ thuộc login.
- [x] **P1.4 — Shell và trang tài khoản.** /admin dùng RequireAdmin server + layout Suspense, shell riêng với điều hướng nhóm đã có trang thật. Danh sách tài khoản có tìm email/role/status, phân trang, detail DTO tối thiểu, form role/block/unblock có lý do và xung đột version. Navigation admin chỉ hiển thị khi được phép; teacher truy cập URL/API vẫn bị server chặn. Account blocked vào trang thông báo có logout, không loop login.
  - Verify: Playwright admin/teacher/guest/blocked; đổi role sau khi mở tab; last-admin feedback; 375/768/1280 không tràn ngang, WCAG/keyboard, trạng thái loading/empty/error/conflict. Không tạo nav link chết để mô phỏng 9 trang chưa có.

## Acceptance / evidence

P1.1–P1.4 đạt qua unit/route + Postgres thật + production browser. Bảng inventory phân quyền lưu trong implementation notes để phase sau bổ sung, không bỏ sót qua việc chỉ bảo vệ Next.js.

Trước phase 3, /admin có thể chuyển tới /admin/users làm điểm vào hữu dụng; phase 3 thay bằng overview thật. Không tạo dashboard số liệu giả trong phase 1.

## Risks

RLS hiện có nhiều policy permissive: policy active phải kết hợp AND hoặc được tích hợp đúng, không OR mở quyền. SECURITY DEFINER cần guard riêng. Elevated client chỉ ở server; không cấp SELECT toàn bộ bảng riêng cho role admin. Thực hiện thay đổi local trước; bootstrap/ban/cấp role production là hành động runtime ngoài phạm vi lập kế hoạch.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
