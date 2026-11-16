# Phase 4 — Góp ý giáo viên và xử lý trong admin

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC13–15. Góp ý chủ động gửi là dữ liệu hỗ trợ; không mở quyền admin đọc dữ liệu giảng dạy.

## Files

Hiện có: src/lib/admin/http.ts, src/components/admin/{admin-shell,admin.module.css}; src/components/teacher-shell.tsx; src/lib/auth/protected-paths.ts; src/proxy.ts.
Mới: migration *_teacher_feedback.sql; src/lib/feedback/{types,service,validation}.ts + tests; src/app/feedback/{layout,page}.tsx; src/app/admin/feedback/page.tsx; API paths contracts§2; components/feedback/ và admin/feedback.tsx; tests/db/teacher-feedback.test.ts; e2e/feedback.spec.ts.

## Tasks

- [x] **P4.1 Schema/RPC và HTTP guards.** Tạo feedback fields/indexes/unique/quota/version theo contracts§4. RPC teacher create/list own; admin list/detail/status only, require active/admin tường minh và audit minimal atomic. RequestId retry cùng nội dung trả cùng record, khác nội dung409; quotas đếm atomic dưới cạnh tranh, pagination và lọc status. Không service-role fallback cho caller mất quyền.
  - Verify: DB 2teacher+admin+anon+blocked; direct table insert/update/delete ngoài RPC bị chặn; 3states, illegal transitions/input, request race/retry, rate/timezone boundary, optimistic conflict; admin không truy cập exams/classes/chat nhờ thêm feedback.
- [x] **P4.2 Teacher form/history và admin triage.** Thêm entry Góp ý khu vực account, list20/detail trạng thái của mình; form bug/suggestion+body, không attachments/tự thu nội dung trang. Admin filter/new→in_progress→resolved, pending/error/conflict/loading/empty. Đổi status có thể quay lại khi cần nhưng vẫn version/audit; ba state duy nhất. Không notification email hoặc trả lời chat admin.
  - Verify: E2E gửi/refresh/history/status-update, doubleclick+response lost không duplicate; XSS render text; context URL có token không được lưu; 375/768/1280, keyboard/focus/live region/axe; account bị chặn giữa request không vẫn mutation thành công.

## Done

Teacher nhận xác nhận dựa record DB thật; admin thấy body chỉ do teacher chủ động gửi, audit không body. Không nhầm WorkspaceFeedback component với feature này.
