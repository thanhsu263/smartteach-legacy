# Phase 8 — Nghiệm thu, vận hành và handoff

Status: Local verification complete — live setup remains UNVERIFIED
Depends on: Phases 1–7

## Kết quả

Diff đủ để review, có evidence đối chiếu 9 AC của brief và runbook cấu hình/vận hành. Phân biệt verified local, kiểm thử giả lập và live smoke; không tự deploy/cấp quyền hoặc kích hoạt payOS.

## Files / areas

- **Mới:** tests/db/admin-rag-security.test.ts nếu kiểm tra xuyên module chưa được suite từng phase bao phủ; e2e/admin-rag-regression.spec.ts nếu cần; docs/admin-rag-operations.md.
- **Sửa khi build:** README, .env.example, src/app/privacy/page.tsx và thông báo AI phù hợp thực tế; scripts/scan-bundle.mjs, test fixtures/helpers, package scripts chỉ khi có nhu cầu chạy probe mới.
- **Evidence:** artifacts/admin-rag/; implementation-notes.md cạnh plan, cập nhật task/phase status theo kết quả thật.

## Tasks

- [x] **P8.1 — Regression đúng vùng thay đổi.** Unit đầy đủ, typecheck, lint, production build và bundle scan sau build; DB suites mới cùng classes/quiz/live/assignments/library/membership hiện có do guard/global catalog ảnh hưởng. Browser admin 9 nhóm, chat và regression login/games/library/assignments/membership/sidebar/tools/fullscreen. Chỉ mở rộng sang load test khi có bằng chứng quota/claim/aggregate có vấn đề.
  - Commands hiện có: npm test; npm run typecheck; npm run lint; npm run build; npm run scan:bundle; npx vitest run --config vitest.db.config.mts; npx playwright test <spec liên quan> --workers=2. Nếu dùng cổng riêng, đặt PLAYWRIGHT_PORT và APP_BASE_URL đồng nhất trước chạy. Không dùng DB production cho test tạo/xóa users.
  - Evidence: command/exit status/log, screenshot 375/768/1280 đã đọc lại, axe, console/network error có phân loại. Failure baseline từ hero hay test cũ phải chẩn đoán và ghi rõ, không che hoặc sửa ngoài phạm vi.
- [x] **P8.2 — Adversarial matrix và snapshot grants.** Guest/teacher A/teacher B/admin/blocked/former-admin/worker dùng direct REST, RPC và HTTP. Test user_metadata giả role, token cũ, bypass RLS qua SECURITY DEFINER, admin attempts đọc private tables/chat/export/log, raw secret leak, request body limit, origin, key quota retry và document prompt injection. Sensitive canary trong fixtures xác minh response/DOM/log/bundle không có.
  - Verify: last-admin/account/membership/job/message races được DB thật kiểm, unsupported input trả lỗi bounded. Restore seeded catalog không resurrect hidden game; request stale version không overwrite. Scan phạm vi browser assets đúng thực tế, không xóa/giảm detector chỉ để pass.
- [ ] **P8.3 — Scheduler và điều kiện runtime.** Runbook liệt kê Supabase project/Storage, pgvector, pg_cron, pg_net, Vault; server env APP_BASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI key-encryption keyring và RAG_WORKER_SECRET. Bootstrap admin, configure Vault worker URL/secret và Cron là thao tác operator có target rõ. Probe đóng browser rồi chạy job nạp và purge hết hạn; heartbeat hiển thị last success/failure/count, không text. Nếu env thiếu, admin UI nói chưa cấu hình và không giả thành công.
  - Verify: local Docker→host URL hợp lệ, production HTTPS canonical và deployment protection không chặn endpoint được xác thực. Worker request đơn lẻ không thay chứng cứ Cron thật. Kiểm provider quota/auth/model bằng một live probe nhỏ khi có key và quyền dùng dịch vụ; chưa có key ghi UNVERIFIED live, không làm giả success. Kiểm chất lượng RAG trên bộ câu hỏi với nguồn thực được admin cho phép, không gửi dữ liệu học sinh.
- [x] **P8.4 — Rollout/recovery và chính sách dữ liệu.** Ghi thứ tự migrations 1→2→3→4→5→6, seed giữ stable IDs, bootstrap operator, keyring/worker secret, scheduler, nạp index, chất lượng nguồn, rồi mới bật chatbot. Chuyển index kiểu build-generation→validate→activate; rollback tắt chatbot/ingestion, giữ ACL/purge và source eligibility, không rollback dữ liệu bằng drop table. Rotation keyring và scheduler secret có kế hoạch chuyển tiếp, job checkpoint giữ được. Restore backup phải purge chat hết hạn và đánh giá lại source active trước mở dịch vụ.
  - Verify: smoke trước/sau restore fixture/rotation/config revision; không mất quyền owner hoặc điều chỉnh tiền cũ. Cập nhật privacy về AI provider, 30 ngày, xóa, phạm vi backup/provider; giữ nguyên giới hạn admin không đọc private data. Không tự xuất dữ liệu thật để debug.
- [ ] **P8.5 — Readiness review cho build đã hoàn thành.** Đối chiếu đủ 9 AC với evidence; không còn nav giả/nút chưa nối API hoặc task mơ hồ. Báo cáo rõ VERIFIED/FAILED/UNVERIFIED/TEST-DEFECT theo hs-test, phần live còn thiếu và lý do. Chuyển hs-code-review cho review độc lập khi được yêu cầu/cho phép; ship chỉ theo hành động người dùng đã cho phép.
  - Verify: checklist coverage, changed-file scope và dependencies hoàn chỉnh. Không đánh Done vì tài liệu kế hoạch hoặc mock UI tồn tại.

## Giới hạn hành động ngoài máy

Plan này chỉ mô tả. Áp migration lên production, cấp admin, đặt secrets, bật Cron/extension, deploy hoặc bật chat live phải được thực hiện theo workflow có authorization cho target đó. Trước khi hỏi, build chuẩn bị diff, lệnh/runbook, tác động và recovery cụ thể để kết quả có thể review.

Không có bước đăng ký hoặc kích hoạt payOS trong phase này; không chuyển tiền thật. Không tạo issue GitHub/PR/push do plan không có --gh và người dùng chưa yêu cầu ship.

## Trạng thái nghiệm thu

P8.3: Cron/parser production local và purge không traffic đã qua. Còn cấu hình project/provider/hosting thật và live quality smoke, cần credential/target của chủ dự án; chưa kích hoạt bên ngoài. Xem implementation-notes.md và docs/admin-rag-operations.md.
