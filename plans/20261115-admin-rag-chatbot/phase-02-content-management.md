# Phase 2 — Duyệt học liệu, game và cấu hình website

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable
Depends on: Phase 1

## Kết quả

Ba nhóm quản trị nội dung thao tác được thật; thay đổi đi tới các bề mặt public tương ứng và không rò dữ liệu quiz gốc. Publication lifecycle sẵn sàng cho RAG sync ở phase 5.

## Files / areas

- **Mới:** supabase/migrations/20261115110000_admin_content.sql; src/lib/admin/{publications,games,settings}.ts, src/lib/site/{settings,types}.ts, src/lib/catalog-store.ts.
- **Mới:** src/app/admin/{library,games,settings}/..., API tương ứng trong contracts; src/components/admin/{publication-review,games-manager,site-settings-form}.tsx và CSS.
- **Sửa:** src/lib/library/api.ts/facade có liên quan; đọc game tại src/app/games/page.tsx, src/app/games/[id]/page.tsx; fallback src/data/games.ts; src/app/page.tsx, src/config/site.ts, site header/footer/privacy/contact nơi thực sự đọc cấu hình. Giữ Be Vietnam Pro và hiệu ứng landing hiện có.
- **Tests mới:** tests/db/admin-content.test.ts, src/lib/admin/content.test.ts, route tests; e2e/admin-content.spec.ts; bổ sung e2e/{games,library,home}.spec.ts theo hành vi thay đổi.

## Tasks

- [x] **P2.1 — Duyệt bản gửi công khai.** Admin list pending/reported với filters, pagination; review DTO từ publication snapshot, không quiz private/accepted answers/owner roster. Approve/reject/hide với reason, version conflict và audit transaction. Withdrawal của teacher tiếp tục được phép. Khi nguồn đổi, phát revision/invalidation event trong DB để phase 5 tiêu thụ; chưa có worker không làm moderation thất bại.
  - Verify: teacher/guest không gọi được admin moderation; admin chỉ mở được bản đã submit, không mở arbitrary private quiz ID. Approved hiển thị, hidden/withdraw biến mất, reject có lý do; race moderator/withdraw không resurrect. Preview public giữ nguyên việc không chứa đáp án.
- [x] **P2.2 — Danh mục game runtime.** Seed game hiện có với ID không đổi; CRUD metadata + published/hidden và revision/audit, không hard delete game đã dùng. URL chỉ HTTPS thuộc host allowlist tin cậy; không JavaScript/data/localhost/private URL, không server fetch URL admin tùy ý. Dùng server catalog reader cho listing, metadata và detail; bỏ phụ thuộc độc quyền generateStaticParams để ID mới không cần deploy. Static fallback chỉ khi chưa cấu hình DB; DB configured lookup lỗi có unavailable state, không fallback resurrect game hidden.
  - Verify: game seed vẫn chạy/favorite không đổi; thêm game mới truy cập ngay; hide/list/detail và HTTP 404 nhất quán trên production build, unknown 404, failure state. URL nguy hiểm bị từ chối. Filter tiếng Việt/môn/lớp và GameEmbed fullscreen vẫn chạy; không thay sandbox sang quyền rộng hơn.
- [x] **P2.3 — Settings có kiểu và publish revision.** Admin sửa contactEmail, announcement plain text, FAQ và cờ chatbot/library submissions như contracts. Reader public chỉ trả allowlist, có version/fallback mặc định khi chưa cấu hình. Đổi FAQ/contact ảnh hưởng đúng landing/privacy/header/footer nơi được dùng; không chỉnh metadata brand/hero scene hoặc arbitrary code/env. Mutation expectedVersion + audit. Cờ submissions chặn create/resubmit ở RPC thật, không chặn withdrawal; cờ chatbot tắt nhận lượt mới nhưng không tắt purge lịch sử.
  - Verify: XSS/schema lạ/oversize bị chặn; không key trong public settings; stale tab nhận 409; update hiển thị sau invalidation không chờ deploy. Tắt submissions vẫn xem được approved, private quiz không mất; game/tools/live/learn không bị tắt ngoài ý định. Flags có tác dụng ở server, không chỉ nút UI.

## Acceptance / evidence

Ba nhóm đạt UI và API/DB, persistence sau refresh, không có nút lưu giả. Metadata/detail game production có cùng nguồn dữ liệu. Cache Components đọc DB trong boundary phù hợp; dùng API invalidation đúng tài liệu Next cài trong repo. Ghi screenshot ba viewport, no-secret và no-private canary checks.

## Risks

Chuyển game/config khỏi mã nguồn có thể đổi static rendering/404. Chặn bằng HTTP test trên production, không chỉ unit. Nội dung đã submit là phạm vi moderation, không mở quyền truy cập dữ liệu riêng khác của teacher.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
