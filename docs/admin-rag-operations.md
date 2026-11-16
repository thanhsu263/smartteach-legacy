# Quản trị và RAG — vận hành SmartTeach

Next.js Node 24 + Supabase Postgres/Storage + Gemini Developer API. payOS tiếp tục hoãn kích hoạt. Kiểm thử local dùng fixture, không thay thế nghiệm thu Gemini với tài liệu thật.

## Thứ tự thiết lập

1. Backup DB/Storage và kiểm đúng project trước khi áp migration. Các migration 20261115100000 trở đi bổ sung admin, nội dung, membership, AI, vector, job, chat và hardening; áp theo thứ tự tên bằng Supabase CLI. Không reset DB có dữ liệu.
2. Cần Storage, vector 768 chiều/cosine, pg_cron, pg_net, Vault. Bucket rag-documents là private; không thêm policy upload/list cho giáo viên. Local bật Storage trong supabase/config.toml; Edge Runtime vẫn tắt.
3. Đặt server env APP_BASE_URL (origin canonical), SUPABASE_SERVICE_ROLE_KEY, AI_KEYRING_JSON, RAG_WORKER_SECRET. Hai biến Supabase NEXT_PUBLIC_* chỉ chứa URL/anon key. Không đặt master/Gemini/worker key vào biến public, repo, migration hoặc log.
4. Bootstrap UUID tài khoản đã tồn tại bằng lệnh dưới. Script không tạo user, mặc định local, từ chối khi đã có admin active. Sau đó dùng /admin/users để cấp/thu hồi role có lý do. Không suy admin từ email/user_metadata.
5. Vào /admin/ai: chọn model, đặt cap thấp hơn quota AI Studio, thêm key và Google Cloud project ID đúng, xác nhận project thực sự Free Tier/chưa bật billing. Kiểm kết nối bằng prompt chẩn đoán nhỏ. Model allowlist không bảo đảm miễn phí nếu project đã bật billing.
6. Đặt Vault secrets smartteach_rag_worker_url và smartteach_rag_worker_secret. Production URL là https://TEN-MIEN/api/internal/rag/jobs/run; secret khớp env server, ít nhất 32 ký tự. Không gửi secret trong query. Cấu hình hosting protection cho phép scheduler gọi endpoint, vẫn giữ kiểm bearer.
7. Quan sát /admin/operations: heartbeat thật, job, dung lượng, key healthy. Upload yêu cầu key đã kiểm kết nối và worker chạy trong 3 phút gần nhất. Nạp tài liệu được phép chia sẻ, đợi ready, kiểm bộ câu hỏi rồi mới bật chatbot ở /admin/settings.

    node scripts/bootstrap-admin.mjs USER_UUID

Production migrations, cấp quyền, đặt secret, Vault/Cron và deploy cần target, backup/recovery và authorization riêng; build local không tự thực hiện.

Local:

    npm run supabase:start
    # Đặt env bằng phương thức quản lý bí mật của bạn; APP_BASE_URL có cổng server.
    node scripts/configure-rag-cron.mjs

Script Cron chỉ ghi Vault trên container supabase_db_smartteach. Docker gọi host qua host.docker.internal. Hai lịch là smartteach-rag-worker mỗi phút và smartteach-chat-retention mỗi giờ. Next.js phải chạy để nhận worker HTTP; SQL purge không cần server web.

### Model hiện hành và lỗi kiểm kết nối

Ngày 16/11/2026, Google trả 404 cho `gemini-2.5-flash-lite` với project mới và yêu cầu chuyển sang `gemini-3.5-flash-lite`. Dự án đã bổ sung model mới ở UI, server allowlist và RPC quota/settings qua migration `20261116091000_ai_current_chat_models.sql`. Chọn **Gemini 3.5 Flash-Lite**, lưu cấu hình rồi kiểm kết nối. ID 2.5 vẫn được giữ cho cấu hình cũ; không tự động thay model hoặc bật billing khi áp migration. Embedding vẫn là `gemini-embedding-001`, 768 chiều.

Kiểm model/quota/tier của đúng project theo [tài liệu model](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite) và [bảng giá Free Tier](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite). Lỗi kiểm key hiện phân biệt model không được cung cấp, key không hợp lệ, quyền truy cập, quota và lỗi kết nối. Thông báo dùng văn bản cố định, không đưa raw provider response hoặc secret lên UI.

Provider deadline hiện là 12 giây vì Google từ chối deadline 8 giây với lỗi yêu cầu tối thiểu 10 giây. Giới hạn hai lần gọi vẫn giữ trong route 30 giây. Lỗi HTTP 400 về cấu hình request không được mô tả thành key sai hoặc mất quyền.

Nếu gặp lỗi chung trước cả khi gọi Google, kiểm migration `20261116090000_ai_runtime_ordering.sql`: sửa `ORDER BY` nằm ngoài aggregate trong `ai_runtime`. Migration chỉ sửa truy vấn và giữ ranh giới service-only, không thay dữ liệu key.

## Mã hóa và rotation

AI_KEYRING_JSON: {"activeVersion":"v1","keys":{"v1":"BASE64_32_BYTES"}}. Tạo 32 byte ngẫu nhiên bằng secret manager/công cụ hệ thống; không dùng chuỗi mẫu này làm key. AES-256-GCM dùng IV ngẫu nhiên, AAD ràng buộc provider/credential/project. DB chỉ giữ ciphertext và last4.

Thêm master version mới, giữ master cũ, đổi activeVersion, triển khai env đọc được cả hai rồi re-encrypt theo batch:

    node scripts/rotate-ai-master.mjs

Script chỉ local, CAS/idempotent. Kiểm mọi credential, kể cả disabled, đã sang version mới rồi mới gỡ master cũ. Lỗi thì giữ cả hai và chẩn đoán trước chạy lại. Production dùng cùng RPC service-only ai_rotation_batch/ai_rotate_credential qua công cụ operator được phê duyệt; không mở endpoint browser. Backup master tách khỏi DB; mất master không giải mã được key.

Thay Gemini key bằng nút “Thay key”, xác nhận project/tier và test lại. Key cùng project vẫn chia sẻ quota; 429 cooldown project/model, daily reset theo Pacific. Phân biệt key-invalid với 403 permission. Không tự mở billing, tạo project hay dùng model trả phí. Cap ứng dụng là dự trù bảo thủ, không phải số lượt Google còn lại.

## Tài liệu và job

- Tối đa 50 tài liệu active; 10 MiB/tệp; PDF 200 trang; một triệu ký tự; 2.000 chunk/phiên bản. DOCX tối đa 2.000 ZIP entries/50 MiB giải nén, kiểm cả lượng byte thực. Không OCR, HTML hay fetch URL trong tài liệu.
- Tổng kho tính cả staging/cleanup: 512 MiB blob reservation, 20.000 chunk. Kiểm quota Supabase thật vì còn chia sẻ với dữ liệu lớp/quiz/chat.
- Upload trực tiếp private Storage qua capability scoped path, không qua body Vercel; trên 6 MiB dùng TUS. Server kiểm size/magic/SHA-256 trước enqueue.
- “Thay / nạp lại” tải bản mới; “Lập chỉ mục lại” dùng tệp hiện có. Bản ready cũ phục vụ đến khi bản mới hoàn tất. Pin gemini-embedding-001, 768 chiều, L2 normalize; không tự đổi embedding model khi quota hết.
- waiting_quota: kiểm quota/project, model và key healthy; Cron sẽ thử lại. no_text: chưa hỗ trợ OCR. pdf_page_limit/text_limit/capacity_exceeded: giảm tài liệu hoặc gỡ nguồn không cần; không cắt âm thầm.
- Gỡ nguồn chặn retrieval/citation ngay. Blob cleanup có thể chờ 3 giờ từ reservation để signed upload token hết hạn; dung lượng vẫn tính trong lúc chờ. Không xóa blob thủ công trước tombstone.
- Invocation xử lý một step: 10 trang PDF hoặc 8 chunk embedding, tối đa 2 provider calls, timeout provider 12 giây, route maxDuration=30, lease 45 giây. Kiểm giới hạn hosting thật; không có timer làm việc sau response.
- Lease/token/generation fence chống job cũ publish sau delete/reclaim. Crash sau provider response nhưng trước commit có thể gọi lại; không cam kết external exactly-once hoặc hoàn quota thiếu căn cứ.
- Publication outbox đọc lô 10. Retrieval luôn kiểm approved/revision hiện tại; hide/withdraw có hiệu lực trước worker. Index không chứa đáp án hoặc quiz riêng.

## Quyền, riêng tư và khôi phục

Admin xem account metadata, tổng hợp và bản gửi duyệt; không có viewer/export đọc lớp, điểm, quiz riêng hay chat giáo viên khác. Role và Premium độc lập. Premium thủ công dùng cùng lock membership:<uuid> với settlement, có audit, không sửa amount/paid state. Không nhập payOS key/webhook hoặc chuyển tiền khi còn hoãn.

Khóa tài khoản áp DB guard trước rồi Auth ban. Lỗi đồng bộ vẫn chặn token cũ; operations ghi số tài khoản chờ. Kiểm lại account rồi thực hiện thao tác khóa/mở khóa có lý do để đồng bộ lại, không bỏ guard DB.

Chat TTL 30 ngày/tin; API/RLS lọc hết hạn ngay, SQL purge mỗi giờ hard-delete tin/citation và thread rỗng. Xóa ngay dùng tombstone/generation để lượt in-flight không ghi lại. Không transcript trong localStorage/audit. Google Free Tier và backup có retention riêng; không hứa xóa ngoài phạm vi ứng dụng.

Restore: giữ chat/upload tắt; phục hồi keyring tương ứng; áp guards; purge quá hạn, đối chiếu tombstone và publication revision trước bật chat. Không phục hồi chat hết hạn/nguồn thu hồi mà bỏ bước đối chiếu.

Rollback vận hành: tắt chatbotEnabled, ngừng upload, sửa provider/scheduler, giữ ACL/eligibility/purge. Không drop bảng hoặc trả quyền PUBLIC. Khi worker secret lộ, thay env và Vault cùng đợt, kiểm secret cũ 403 và heartbeat secret mới.

## Kiểm chứng

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run scan:bundle
    npx vitest run --config vitest.db.config.mts
    # Đặt PLAYWRIGHT_PORT và APP_BASE_URL cùng origin.
    npx playwright test e2e/admin-rag.spec.ts --workers=1

e2e/rag-worker.spec.ts cần secret fixture và Vault local chưa cấu hình, không ghi đè cấu hình có sẵn; tự dọn secret/tệp sau probe Cron production. tests/db/chat-scheduler.test.ts dùng lịch thử riêng kiểm purge không HTTP, vẫn kiểm lịch production mỗi giờ. Không chạy test tạo/xóa user trên production.

E2E popup giả lập SSE tại ranh giới provider; history/source/delete dùng API/DB thật. Crypto/quota/failover có tests riêng. Chưa có key/tài liệu thật được phép thì live Gemini connection, chất lượng RAG và deployment vẫn UNVERIFIED.

tests/db/rag-evaluation.test.ts chạy 20 câu fixture với embeddings/generation giả, còn vector search, bộ lọc môn/lớp, nguồn approved, owner history và citation commit dùng DB thật. Harness này kiểm orchestration/quyền, không chấm chất lượng ngữ nghĩa của Gemini.

Trước bật thật: dùng 20 câu trong tests/fixtures/rag/evaluation-cases.json, gắn source IDs của corpus đã công bố, kiểm outcome/citation/nội dung bằng người đọc nguồn. Đạt 100% canary riêng tư và citation eligibility; không lấy kết quả gateway giả làm chất lượng model.

Nguồn: [Gemini SDK](https://aistudio.google.com/docs/libraries), [Free Tier/pricing](https://aistudio.google.com/docs/pricing), [quota](https://aistudio.google.com/docs/rate-limits), [embeddings](https://aistudio.google.com/docs/embeddings), [Supabase Cron](https://supabase.com/docs/guides/cron), [TUS](https://supabase.com/docs/guides/storage/uploads/resumable-uploads).
