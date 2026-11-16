# Thực thi và bằng chứng

Ngày: 2026-11-15. Nhánh main tại 25e8529; diff chưa commit/push. Giữ thay đổi hero/menu/membership có sẵn. Không deploy, cấp admin thật, đặt key Gemini thật hoặc kích hoạt payOS.

## Cấu trúc đã triển khai

- /admin có 9 nhóm theo brief (Nhật ký và Vận hành có hai trang cùng nhóm). Guard server/RPC dựa registry role/state mới, không dựa user_metadata. Metadata tài khoản và bản gửi duyệt tách khỏi dữ liệu riêng.
- Tài khoản, duyệt học liệu/báo cáo, game runtime, settings, Premium thủ công, overview/audit/operations có API/DB/UI thật. Premium dùng cùng khóa user với settlement, giữ giá và trạng thái tiền hiện có.
- AI: AES-GCM write-only credential, keyring version/AAD, rotation script, metadata masked, model allowlist xác minh từ docs ngày build, quota project/model có reservation và cooldown. Tối đa hai calls; 403 permission không bị coi là key-invalid. Không tự bật billing hoặc đổi embedding model.
- RAG: private Storage, reservation/capacity, PDF.js/Mammoth, chunk/vector 768, job checkpoint/lease/fencing, publication outbox, ready-version activation và cleanup. Cron/pg_net gọi worker HTTP, SQL Cron purge chat độc lập traffic.
- Chat: owner-only thread/message, daily cap, request idempotency, TTL từng tin, tombstone chống ghi lại sau xóa, structured output/citation validation trước SSE answer. Không HTML, tools giao dịch hoặc dữ liệu lớp/điểm/quiz riêng trong prompt.
- Popup desktop và native mobile dialog, ẩn ở admin/play/learn/host/login/fullscreen/modal khác; Escape/focus return, lịch sử phân trang, xem excerpt nguồn, xóa ngay và thông báo AI/retention.

## Điều chỉnh kỹ thuật so với đường dẫn/phác thảo plan

1. Giữ Next Cache Components và dùng Node runtime mặc định, không export runtime. Public settings/catalog cache stale=30s, revalidate=60s, expire=1h để đủ điều kiện prerender; mutations invalidate tag ngay. Game generateStaticParams đọc runtime catalog làm mẫu prerender, dynamicParams mặc định vẫn cho ID mới không cần deploy. Favorites cũng dùng cùng catalog, không hồi sinh game ẩn.
2. Một số file/facade được gộp theo trách nhiệm thay vì tạo từng module nhỏ. Membership metadata và adjustment dùng GET/POST /api/admin/memberships, body userId/action month|year|revoke/expectedVersion/requestId/reason. Moderation preview nằm trong list DTO phân trang; report resolution có /api/admin/reports. RAG detail/progress nằm trong list tối đa 50; reindex có route riêng. Source viewer dùng chunk ID để giữ locator/excerpt chính xác.
3. Pagination hiện dùng offset có cap, page 20 (messages 50), thứ tự có ID ổn định. Không mở export/raw-query endpoint. Wire contract nội bộ được API/UI triển khai cùng nhau.
4. Registry guard được gắn bằng restrictive RLS trên bảng teacher hiện có và prefix các SECURITY DEFINER dùng auth.uid, giữ nguyên signatures/grants. private.host_session là SECURITY INVOKER nên có forward guard riêng. Các RPC mới gọi require_admin/require_active_user/require_service rõ ràng.
5. RLS chỉ cần EXECUTE của private.is_active_user theo OID đã bind; probe transaction chứng minh không cần USAGE schema private. Forward migration thu hồi USAGE cấp dư và EXECUTE is_admin cho authenticated, giữ ranh giới schema cũ.
6. Storage thực tế local đang tắt, khác giả định của plan; đã bật Storage và khởi động lại stack giữ volume. Không bật Edge Runtime. Khi resume Docker dừng, đã phục hồi daemon/stack trước chạy migration.
7. Cleanup blob chờ ít nhất ba giờ từ reservation để capability upload hai giờ hết hạn, tránh tạo lại orphan sau gỡ. Source eligibility bị chặn ngay; dung lượng vẫn tính trong lúc chờ. Orphan nguồn chưa active được dọn cùng reservation.
8. Quota-wait không tiêu hao budget crash/step của job; daily cooldown theo midnight Pacific. Thread không lưu bản sao prompt trong title: title list được dựng từ message chưa hết hạn để giữ TTL thật.
9. Bộ lọc môn/lớp áp vào truy vấn tìm học liệu rõ ràng; câu hỏi cách dùng vẫn tìm nguồn hướng dẫn. Model context nhận metadata môn/lớp từ DB hiện tại, không đoán metadata từ URL.

## Regression được chẩn đoán và sửa

- Audit test đếm cả fixture lần trước: giới hạn actor của lần chạy, không đổi production semantics.
- Alias record/bảng trùng trong PL/pgSQL chat_config/library sync/worker claim: tái hiện qua RPC/psql, sửa bằng forward migrations; các probe liên quan đã chạy lại.
- Menu admin mobile bị min-content của nav kéo tràn: minmax(0,1fr) và min-width:0; viewport/axe đã kiểm.
- Popup không đóng Escape khi nút vừa gửi mất focus: listener trong lúc panel mở. Modal khác bị unmount không phát đổi thuộc tính open: observer theo dõi childList, đã kiểm cả fullscreen/modal.
- Landing section được agent trước bọc AnimatedContent nên selector margin chỉ chọn con trực tiếp không còn đúng. Mở rộng selector; keyboard focus chờ heading visible khi wrapper hydrate chậm, hủy chờ khi người dùng Tab/pointer. Có ca mô phỏng wrapper hiện chậm.
- Test tools còn đòi các link đã được người dùng yêu cầu ẩn: cập nhật đi qua kho tiện ích, không khôi phục link cũ.
- AnimatedContent hiện có: thay any bằng HTMLAttributes/TweenVars và cập nhật callback ref ở layout effect, giữ timing/motion. Lint không được tắt để bỏ qua lỗi.
- Readiness heartbeat tính tại API, không gọi Date.now trong render React.

## Bằng chứng

Log mới trong artifacts/admin-rag, không dùng kết quả của build trước làm chứng cứ cho task này.

| Probe | Evidence |
|---|---|
| Unit toàn bộ, crypto/tamper/rotation, quota failover, parser Unicode, citation/service/filter | unit.log |
| TypeScript và lint | typecheck.log, lint.log |
| Production build + 121 browser cases gồm admin/chat, auth, catalog, library, assignments, membership, sidebar, tools, landing | e2e-candidate-final.log |
| Bộ 20 query qua orchestration, vector search/filters/eligible sources/owner history/citation commit thật, embedding/generation giả | rag-evaluation.log |
| DB regression toàn bộ, thêm active-token/last-admin/capacity/quota/job/chat/retention | db-candidate.log |
| Cron HTTP thực gọi parser production khi không có browser, thêm DOCX qua worker authenticated | e2e-candidate-final.log, cron-e2e.log |
| pg_cron SQL purge không HTTP và lịch production mỗi giờ | retention-cron.log; DB suite |
| Secret/canary scan bundle/prerender | bundle-scan.log |
| UI readiness sau khi chọn tệp khi cấu hình còn thiếu | e2e-readiness-final.log |
| Advisory dependency production | dependency-audit.json |
| Snapshot function grants/guards | access-inventory.json |
| Ảnh đã đọc lại 375/768/1280, axe trong browser tests | admin-settings-*.png, chat-*.png |

Phiên bản SDK/parser được lockfile ghi lại. Parser Node 24 chạy thật trên PDF/DOCX tự tạo; PDF tiếng Việt có font nhúng và ảnh render pdf-vietnamese.png. Không kết luận chất lượng mô hình từ fake gateway. Runtime dependency audit không có advisory tại lượt kiểm này.

Kết quả cuối: 346/346 unit (39 files), 242/242 DB (20 files), 121/121 browser trên candidate production; sau điều chỉnh tính heartbeat ở API, 8/8 admin/chat/readiness được kiểm lại trên build mới. Typecheck, lint, production build, diff-check và bundle scan 876 tệp đều đạt. Vault worker secrets và AI credentials fixture còn 0; hai lịch local vẫn active, worker chưa nhận cấu hình thật nên không gọi dịch vụ AI.

## Điều kiện còn thiếu để bật thật

Bootstrap tài khoản admin do chủ dự án chọn; master keyring và worker secret thực; Gemini project/key Free Tier được chủ dự án xác minh; Vault/hosting protection của môi trường triển khai; tài liệu thật được phép chia sẻ và kiểm chất lượng 20 câu với Gemini live. Các mục này UNVERIFIED live, không giả thành công. Secret/tệp/user fixture của probe được dọn; không lưu Gemini/master key thật trong repo.

Xem docs/admin-rag-operations.md cho rollout, bootstrap, rotation, giới hạn, retry/cleanup, rollback và restore/purge. payOS vẫn hoãn. Chưa có independent code review hoặc hành động ship trong task này.

## Sửa kiểm kết nối Gemini ngày 16/11/2026

- Tái hiện lỗi local `ai_runtime`: PostgreSQL 42803 vì `ORDER BY created_at` nằm ngoài `jsonb_agg`. Forward migration `20261116090000_ai_runtime_ordering.sql` đưa thứ tự vào aggregate và dùng UUID để ổn định khi trùng timestamp; giữ quyền service-only và dữ liệu key.
- Sau sửa DB, Google thực trả 404: `gemini-2.5-flash-lite` không còn dành cho người dùng mới, đề nghị `gemini-3.5-flash-lite`. Đối chiếu bảng giá và tài liệu chính thức ngày 16/11 xác nhận model mới có Free Tier. Migration `20261116091000_ai_current_chat_models.sql` mở rộng constraint, RPC lưu settings và reserve quota; giữ ID cũ cho cấu hình cũ, không đổi embedding hoặc tăng quota.
- Model mới trả 400 khi deadline SDK là 8 giây, yêu cầu tối thiểu 10 giây. Timeout provider tăng thành 12 giây; hai lần gọi và backoff vẫn nằm trong route 30 giây, lease 45 giây giữ nguyên.
- Kiểm key có thông báo cố định phân biệt model không có, key invalid, quyền, quota, request không hợp lệ và kết nối; không xuất raw provider message/key. Luồng chat thông thường giữ thông báo tổng quát và ngân sách failover cũ.
- Đã áp đúng hai migration mới trên Supabase **local**. Qua API admin local có audit, đã chuyển cấu hình sang `gemini-3.5-flash-lite`, giữ nguyên các cap. Gọi lại endpoint Kiểm kết nối với key chủ dự án đã lưu trả **HTTP 200, state healthy**. Không bật billing, thay key hoặc ghi secret vào repo; không deploy production.
- Kiểm chứng: test DB tái hiện lỗi trước sửa rồi đạt **3/3** trong `tests/db/ai-runtime.test.ts`; fixture ở transaction rollback, không để worker thấy key giả. Unit AI/error/chat **13/13**; `tsc --noEmit`, lint các tệp TS thay đổi và diff-check đều đạt. Lỗi type unknown trong test mới đã sửa trước kiểm lại. Chỉ chứng minh connection thật thành công; chất lượng trả lời trên corpus thật vẫn cần nghiệm thu riêng.

## Khôi phục nút nạp tài liệu local ngày 16/11/2026

- Đọc API admin thực tế xác nhận credential, mã hóa và worker env đã sẵn sàng, nhưng Vault chưa có cấu hình URL/secret nên schedulerConfigured=false và heartbeat đã cũ. UI khóa nút đúng theo readiness guard; không phải lỗi click hoặc định dạng DOCX.
- Đã chạy `node scripts/configure-rag-cron.mjs` với secret hiện có trong môi trường local, không ghi secret vào repo/log. Gọi đúng `private.invoke_rag_worker()` để kiểm đường pg_net HTTP thật: 200, không timeout, worker idle. Lần Cron tự động kế tiếp cũng cập nhật heartbeat mới; không ghi heartbeat giả.
- Probe Playwright trên localhost bằng admin thật: chọn DOCX 01 trong bộ tài liệu đã tạo, điền tên và kiểm `Tải và nạp tài liệu` enabled. API trả cả năm điều kiện readiness=true. Ảnh: `artifacts/admin-rag/rag-upload-enabled.png`, đã xem lại. Không bấm submit nên chưa tải hoặc gửi nội dung tài liệu sang AI trong lượt kiểm này. Không thay code để bỏ readiness guard.
