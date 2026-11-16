# Phase 3 — Thành viên, tổng quan và audit vận hành

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable
Depends on: Phase 1; Phase 2 để tổng quan đầy đủ

## Kết quả

Admin quản lý quyền Premium thủ công có lịch sử; xem tổng quan/nhật ký an toàn, không mở nội dung riêng và không kích hoạt payOS.

## Files / areas

- **Mới:** supabase/migrations/20261115120000_admin_operations.sql; src/lib/admin/{memberships,overview,operations}.ts; src/app/admin/{memberships,audit,operations}/..., admin overview page, API trong contracts.
- **Mới:** các form/table trong src/components/admin/; tests/db/admin-memberships.test.ts, src/lib/admin/operations.test.ts, route tests, e2e/admin-operations.spec.ts.
- **Đối chiếu/giữ:** src/lib/membership/{plans,types,service,payos}.ts, supabase/migrations/20261115090000_membership_payos.sql, tests/db/membership.test.ts; chỉ thêm forward migration/facade cần thiết.

## Tasks

- [x] **P3.1 — Membership và đơn read-only tiền.** Admin tìm user/gói/hạn và xem order metadata safe; form extend 1/12 tháng hoặc revoke có reason, idempotency key/version. DB transaction cùng lock theo user với settle_membership_payment; manual adjustments + entitlement + audit nguyên tử. Revoke không sửa PAID/order amount/paid_at; tương tác với mua thêm giữ quy tắc max(now,expiry) theo calendar hiện có. Giá Free/50k/500k giữ nguyên, không thêm công cụ đổi giá hoặc refund.
  - Verify: grant/revoke lỗi/duplicate/2 admin đồng thời; race với settle/duplicate webhook; không lost update, không tự tạo đơn paid. Teacher không gọi được adjustment/read order người khác. Premium mở assignments, expiry/revoke chặn create/edit/publish nhưng không chặn read/close hoặc student làm bài cũ.
- [x] **P3.2 — Overview, audit và operations.** Aggregate counts global (tài khoản, quiz count, nguồn approved, đơn theo trạng thái, manual adjustments); không list tên lớp, prompt hoặc kết quả theo học sinh. Bảng audit có actor/target/action/time/result và filter metadata, không full raw request. Operations hiển thị module chưa cấu hình, heartbeat, error class và counters; các nhóm AI/RAG chưa có service phải hiện “Chưa cấu hình”, không fake metrics/controls. Phase 4–6 nối metric schema thật theo cùng DTO.
  - Verify: admin can view metadata nhưng không dò private IDs qua filter/export/endpoint phụ; canary dữ liệu riêng không có trong JSON/HTML/log. Query phân trang và aggregate bounded; empty/loading/error rõ. CSV/export raw không được tự thêm.
- [x] **P3.3 — Nghiệm thu quyền và tính liên tục.** Mở đủ các trang admin đã xong, kiểm teacher view trước/sau thay Premium/blocked account; role và entitlement là hai trục độc lập. UI thông báo payOS hoãn, không bấm test payment thật hoặc gọi SDK provider trong flow quản trị.
  - Verify: unit/DB race tests + admin-operations E2E; regression membership và assignments hiện có. Form lý do/confirm hành động nhạy cảm theo component native, không thay thế authorization DB.

## Risks / evidence

Không dùng quyền service role để trả toàn bảng orders hoặc auth.users. Cùng membership:<uuid> lock và thứ tự lock với settlement tránh deadlock. Log có idempotencyKey/reference nhưng không chứa nội dung hội thoại hoặc khóa. Tests dùng local Supabase và fake gateway; payOS real vẫn UNVERIFIED/paused.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
