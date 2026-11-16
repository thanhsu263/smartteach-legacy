# Hợp đồng thực thi chung

Tài liệu kế hoạch; tên bảng/route dưới đây là đích **mới**, trừ nơi ghi rõ hiện có. Chốt wire contract trước khi chia UI/API trong cùng task, không tạo hai nguồn DTO khác nhau.

## 1. Identity và quyền dữ liệu

- Registry `private.account_controls(user_id, app_role teacher|admin, status active|blocked, updated_at)`; tài khoản cũ chưa có row được hiểu teacher active, sau đó backfill idempotent. Client không ghi được registry; không suy admin từ email, `user_metadata` hoặc query.
- Server `requireActiveUser()` kiểm Supabase user và account state mới; `requireAdmin()` kiểm role hiện tại, không cache xuyên request. API 401 khi không có phiên, 403 cho sai quyền/blocked. Role ứng dụng không thay DB role `authenticated` bằng service role.
- DB `private.is_active_user/require_active_user/is_admin` cùng semantics. Restricted policies chặn account blocked trên bảng teacher; SECURITY DEFINER và RPC liên quan phải kiểm helper vì chúng có thể bypass RLS. Giữ đường anon học sinh và webhook service-role hiện có.
- Thu hồi role/khóa có hiệu lực request kế tiếp với token cũ. Không xóa nội dung giáo viên hoặc tự đóng các bài đã phát hành khi khóa account. Khóa Supabase Auth/session là lớp bổ sung; DB state là ranh giới sớm, lỗi đồng bộ Auth có trạng thái vận hành, không trả thành công giả.
- Bootstrap admin đầu tiên bằng script server theo **user UUID tồn tại**, không signup tự động. Script chỉ cho khởi tạo khi chưa có admin active, xác nhận đúng local/remote target; về sau cấp role qua admin RPC có lý do/audit. Khóa toàn cục tránh hai thao tác cùng thu hồi admin cuối.
- Admin DTO tài khoản chỉ: userId, email, createdAt, lastSignInAt, role, status, premiumUntil. Không SELECT `*` auth/users/classes/quiz/chat, không trả user_metadata, roster, đáp án, prompt hoặc dữ liệu học sinh. Dashboard chỉ aggregate global.
- Quy trình duyệt được đọc **bản gửi duyệt** và báo cáo liên quan qua DTO chuyên biệt, không join quiz riêng nguồn hoặc đọc đáp án. Đây là nội dung được teacher gửi để xét công khai.
- Admin cũng không có endpoint/export/log đọc chat của người khác. Teacher chỉ đọc chat của chính mình bằng owner RLS; source RAG đang công bố được chia sẻ cho giáo viên active.

## 2. Server HTTP / UI contract

- Dùng module `server-only` và Supabase user client mới mỗi request; elevated client tập trung `src/lib/supabase/admin.ts` chỉ ở handler/service tin cậy. Billing helper hiện có chuyển thành delegate nếu cần, không đổi payment semantics.
- GET private/config admin trả `Cache-Control: no-store`. Mutation yêu cầu JSON object, đúng `Origin === APP_BASE_URL`, UUID/enum/schema allowlist, byte cap thật. Lỗi chuẩn `{error:{code,message,requestId,retryAfterSeconds?}}`; không lộ SQL/SDK body. Không sửa schema lỗi billing cũ vô cớ.
- Mặc định body mutation 16 KiB; prompt chat 8 KiB; danh sách pageSize 20, cap 50; keyword tối đa 100 ký tự. Pagination ổn định createdAt/id, trả `{items,nextCursor}`. Mutation nguy cơ đua dùng expectedVersion và trả 409 conflict thay vì overwrite ngầm.
- Permission không chỉ ở layout/proxy; mỗi handler và RPC có kiểm tương ứng. Deny-by-default cho bảng/function mới (revoke PUBLIC/anon/authenticated, grant đúng surface), SECURITY DEFINER đặt `search_path=''`.

| Surface API mới | Request / kết quả chính |
|---|---|
| `GET /api/admin/session` | role/status tối thiểu, không full Supabase user |
| `GET /api/admin/users`, `PATCH /api/admin/users/[id]` | DTO tài khoản; mutation `{action:set_role|block|unblock, role?,reason,expectedVersion}` |
| `GET /api/admin/overview`, `GET /api/admin/audit`, `GET /api/admin/operations` | counts, audit metadata, heartbeat/job failure metadata; không nội dung riêng |
| `GET /api/admin/library`, `GET /api/admin/library/[id]`, `POST .../[id]/moderate` | pending/publication DTO, `{status:approved|rejected|hidden,reason,expectedVersion}` |
| `GET/POST /api/admin/games`, `PATCH .../[id]` | Game DTO tương thích `src/lib/catalog.ts`, published/hidden, version; không hard delete ID đã có favorites |
| `GET/PATCH /api/admin/settings` | contactEmail, announcement plain text, FAQ, cờ tính năng allowlist, expectedVersion |
| `GET /api/admin/memberships`, `GET /api/admin/orders`, `POST /api/admin/memberships/[userId]/adjust` | metadata vận hành; `{operation:extend|revoke,months?:1|12,reason,idempotencyKey,expectedVersion}` |
| `GET/PATCH /api/admin/ai/settings`, `GET/POST /api/admin/ai/credentials`, `PATCH/DELETE .../[id]`, `POST .../[id]/test` | masked DTO, model settings; key chỉ xuất hiện trong input tạo/thay, không echo |
| `GET/POST /api/admin/rag/documents`, `GET .../[id]`, `POST .../[id]/complete-upload`, `POST .../[id]/reindex`, `DELETE .../[id]` | metadata + upload capability scoped path; progress safe, reason validation |
| `GET /api/chat/config` | enabled/available, suggested prompts theo route enum, retentionDays=30; không model/key/project secrets |
| `GET/POST /api/chat/threads`, `GET/DELETE /api/chat/threads/[id]` | chỉ owner, messages/citations có phân trang và loại hết hạn |
| `POST /api/chat/threads/[id]/messages` | `{requestId:UUID,text,contextPage?:allowedEnum}`; auth + ownership + quota trước provider |
| `GET /api/chat/sources/[sourceId]` | tên nguồn, version, page/paragraph locator và đoạn trích còn hiệu lực; authenticated, không trả Storage path/key |
| `POST /api/internal/rag/jobs/run` | chỉ scheduler secret, không user bearer; giới hạn batch/runtime cứng, trả counts/heartbeat không text |

Chat response dùng SSE với các event `state` (retrieving/generating), `answer` (message ID, văn bản cuối, citations), `error` (code/message/retry), `done`. Không giả tiến độ bằng timer; không chuyển token thô chưa kiểm nguồn ra UI. Lỗi trước khi bắt đầu stream dùng HTTP chuẩn; lỗi sau headers dùng terminal error event. Client coi EOF thiếu `done` là gián đoạn, không thành công.

## 3. Schema theo phase

| Phase | Bảng/đối tượng mới hoặc mở rộng | Bất biến |
|---|---|---|
| 1 | private account_controls; audit_events | role/state mutation và audit cùng transaction; last active admin không mất qua race |
| 2 | game_catalog, site_settings + revisions; publication moderation facade | stable game IDs, published-only public read, safe DTO, audit/version |
| 3 | membership_adjustments | grant/revoke manual tách paid orders, cùng lock `membership:<userId>` với settlement, idempotency unique |
| 4 | private ai_credentials, ai_settings, quota_reservations/usage, quota_group_state | ciphertext riêng, project/model quota group, atomic reservation, không chat content |
| 5 | rag_documents, rag_versions, rag_sources/chunks, rag_jobs; private Storage bucket | source/version/generation/hash, vector(768), chunks giữ text/locator, lease fencing và unique batch |
| 6 | chat_threads, chat_messages + citation references, retention heartbeat | owner-only, expires_at 30 ngày theo message creation, không đưa history vào kho chung |

Tên và migration timestamp có thể điều chỉnh cho nhất quán repo, nhưng không đổi permission/data semantics. UI/API mới dùng DTO camelCase, DB snake_case qua mapper đã kiểm thử. Không sửa trực tiếp migration đã áp; dùng migration forward mới.

## 4. Giới hạn tài liệu và lập chỉ mục

- Kho nhỏ: tối đa **50 tài liệu quản trị chưa gỡ**, tính cả bản đang upload/processing bằng reservation atomic. Một document có các version; version mới không né cap bytes/pages. Học liệu approved là source riêng, không tính là tệp upload.
- Tệp cap **10 MiB (10 × 1024² bytes)**, PDF tối đa **200 trang**. DOCX kiểm ZIP, số entry/decompressed bytes (cap 50 MiB) và raw text cap 1.000.000 ký tự/tệp; PDF cũng cap text này. Không OCR, không đọc ảnh, không fetch external relationships/URL trong tài liệu. Reject encrypted/corrupt/scan-only/oversize bằng mã và lời giải thích.
- Upload thẳng private Supabase Storage bằng capability ngắn hạn, scoped một object path/version; không proxy 10 MiB qua Vercel request body. Kiểm actual size/magic/hash/type từ object server-side trước enqueue, không tin Content-Type/metadata client. Với >6 MiB dùng resumable upload; người dùng không tự ghi source/chunk/vector.
- Trích PDF bằng PDF.js Node text API theo trang, DOCX raw text qua Mammoth, giữ locator đoạn. Không render HTML từ tài liệu. Khởi đầu chunk khoảng 800–1.200 ký tự, overlap 150, cắt theo đoạn/trang; mỗi chunk dưới giới hạn token embedding. Giới hạn 2.000 chunk/document version; báo rõ nếu vượt, không cắt âm thầm.
- Embedding text mặc định `gemini-embedding-001`, output 768 chiều, RETRIEVAL_DOCUMENT/QUERY tương ứng, L2 normalize theo hướng dẫn model; cosine lookup. Pin model/version/dim trong index generation; build kiểm lại model còn hỗ trợ trước pin lock/config. Không tự chuyển embedding model khi quota hết. Corpus mới dùng generation mới và chỉ activate khi hoàn chỉnh; không trộn vector khác model.
- Chỉ bật HNSW/cosine sau xác minh pgvector version/dim; 768 nằm trong giới hạn vector index được tài liệu Supabase hỗ trợ. Scale nhỏ vẫn phải test query filtering nguồn/grade/subject với index.
- Document update: version cũ hoạt động cho tới khi version mới ready; thao tác gỡ chặn mọi version ngay. Tombstone/generation được kiểm cả retrieval và finalize; job đang chạy không được publish sau khi gỡ. Blob/chunk cũ được cleanup theo job có retry.
- Approved publication được nạp từ public-shaped snapshot (title/description/subject/grades/question prompts/options, không key đáp án/quiz owner private). Cập nhật/hide/withdraw enqueue hoặc invalidate cùng transaction; retrieval luôn join trạng thái hiện tại, không chỉ tin cờ đã embed.

## 5. Scheduler, lease và quota

- `rag_jobs`: kind extract|embed|library_sync|cleanup, resource/version/generation, status queued|running|waiting_quota|succeeded|failed|cancelled, cursor/checkpoint, attempts, next_run_at, lease_token/lease_until, sanitized_error_code.
- Worker claim atomic (SKIP LOCKED hoặc tương đương), tối đa một job nạp đang thực thi mỗi môi trường ban đầu; lease token/fence bắt buộc khi ghi checkpoint/finalize. Lease quá hạn reclaim không nhân đôi chunk/batch đã commit. Không thể bảo đảm external API exactly-once khi crash sau provider response; tránh gọi lặp phần đã lưu, giới hạn retry và ghi usage reservation thận trọng.
- Supabase Cron + pg_net gọi worker **mỗi phút**; một invocation xử lý tối đa một step khoảng 20 giây, không quá 2 provider calls. Extraction PDF chia trang, embedding chia batch nhỏ; checkpoint ở DB, không `setInterval` hoặc fire-and-forget trong serverless. `maxDuration` đủ bounded step và được test production, không thêm runtime export khi Cache Components bật.
- Scheduler auth secret nằm ở Vault và server env `RAG_WORKER_SECRET`; không hardcode vào migration/URL/client. DB Cron helper lấy URL canonical và secret từ Vault; endpoint so sánh secret constant-time và giới hạn method/body. Teacher/admin session không thay scheduler credential. Không mở capability worker qua nút tùy ý cho teacher.
- Nhóm quota tối thiểu `(provider,projectRef,modelId)`. Dùng chung limiter giữa chat/embedding khi provider quy định quota chung; key cùng project không reset counters. ProjectRef do admin khai đúng; trạng thái UI là observed usage/errors, không hứa số lượt còn lại chính xác do Google không trả như một bộ đếm key.
- Auth key lỗi: disable credential, không log error body. 429: dùng Retry-After/quota metadata khi có; cooldown cả nhóm, không thử key cùng nhóm; daily quota chờ reset phù hợp Pacific time thay vì timezone app. Transient timeout/5xx tối đa một retry có jitter, toàn request tối đa 2 cấu hình hợp lệ. Không model/provider paid fallback; không tạo project/key tự động.
- Admin đặt cap ứng dụng trong giới hạn hợp lệ. Default an toàn: chat 20 message/user/ngày (ngày app theo Asia/Ho_Chi_Minh), một lượt in-flight/thread, output cap 1.500 token, tối đa 6 chunk/~6.000 token context. Hạn mức provider là upper bound riêng, không đồng nhất với cap ứng dụng. Quota reserve ở DB trước gọi, hạn mức hiển thị rõ khi chạm.
- Chọn model có Free Tier không tự bảo đảm miễn phí nếu credential thuộc project đã bật billing. Khi cấu hình, operator phải kiểm project/tier trong AI Studio; ghi free-only intent và thời điểm kiểm tra, từ chối cấu hình đã biết không đúng tier. Không suy billing/quota từ chuỗi API key hoặc tự mở Cloud Billing. UI/runbook không hứa zero-cost nếu chưa xác minh project thật.

## 6. History, nguồn và an toàn đầu ra

- Idempotency message `(ownerId,requestId)` unique; retry khi disconnect không tự tạo/gọi model lại cho request đã hoàn tất. Thread của người khác 404; nếu đang xử lý cùng request trả trạng thái tương ứng, không nhân đôi.
- Context chỉ lấy message owner chưa hết hạn, số lượng/byte bounded; assistant history có nguồn đã thu hồi không dùng để tái tạo nội dung nguồn đó. Không cache câu trả lời toàn cục chứa nội dung hội thoại.
- Citation ID chỉ thuộc set nguồn đã retrieval; URL được server dựng theo source thật, không lấy URL model. Check current source status/version lần nữa trước lưu/phát answer. Nếu nguồn bị thu hồi trong lúc gọi model, hủy answer dựa trên nguồn đó, trả source_changed có thể thử lại; không chỉ bỏ citation nhưng giữ nội dung cũ.
- Thiếu bằng chứng: trả lời thiếu nguồn/hỏi thêm. Bộ test chuẩn gồm hướng dẫn SmartTeach, tìm học liệu theo môn/lớp, không tìm thấy và hỏi ngoài phạm vi. Không tin chỉ dẫn nhúng trong tài liệu; model không có tools thay dữ liệu hoặc đọc thêm table.
- UI render văn bản/Markdown allowlist, không raw HTML, script, tracking image hoặc protocol URL tùy ý. Có trạng thái nguồn đã gỡ cho citation lịch sử, không tiếp tục mở nội dung từ endpoint nguồn.
- `chat_messages.expires_at = created_at + 30 days`; API/RLS không trả hết hạn, tin nhắn mới không gia hạn nội dung cũ. SQL purge chạy mỗi giờ độc lập traffic, hard delete message/citations, xóa thread rỗng. Teacher delete dùng DB transaction và ngăn request in-flight ghi lại nội dung (thread generation/tombstone); abort client không phải bảo vệ duy nhất.
- Audit/metrics không chứa prompt, answer, chunk text, roster hoặc key; giữ IDs, timestamp, action, result, latency, usage counts/error class. Không tạo admin export hoặc cơ chế hỗ trợ đọc raw chat.

## 7. Public config và money invariants

- Game ID seed giữ nguyên favorites, game URL; hide là soft disable, unknown/hidden trả 404. Static fallback chỉ khi chưa cấu hình Supabase, không khi DB có game hidden hoặc lỗi lookup. DB configured nhưng lỗi trả unavailable/retry, không hồi sinh bản seed.
- Site settings allowlist: contactEmail, announcement text, FAQ text, chatbotEnabled, librarySubmissionsEnabled và hiển thị thông báo. Không HTML/script, arbitrary CSS/JS hoặc sửa arbitrary env. Các quota AI ở module AI. Cờ tắt chatbot không tắt purge; cờ submissions không ẩn học liệu đã duyệt hoặc ngắt học sinh đang làm bài.
- Giá Free/monthly/yearly giữ hiện trạng. Admin membership chỉ xem metadata gói/đơn và điều chỉnh hạn; không endpoint sửa amount, order paid state, payment link hoặc account bank. Extend tháng/năm dùng cùng quy tắc calendar UTC của settlement; revoke chỉ thu hồi hạn, audit lý do. Admin manual adjustment và webhook settlement dùng cùng lock thứ tự, không mất hạn.

## 8. Cấu hình vận hành có tên cố định

- Giữ APP_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY của môi trường tương ứng. Không copy khóa local sang production.
- AI_KEYRING_JSON chỉ server: object có activeVersion và keys (map version → base64 của khóa 32 byte). Rotate bằng thêm version mới, re-encrypt, kiểm hết ciphertext cũ rồi mới bỏ khóa cũ; không ghi giá trị vào SQL, log hoặc repo.
- RAG_WORKER_SECRET chỉ server; Vault giữ smartteach_rag_worker_secret và smartteach_rag_worker_url. Production URL là canonical HTTPS + /api/internal/rag/jobs/run; local Docker dùng host.docker.internal tới port server đang chạy. Không gửi giá trị secret qua query string.
- Capacity guard ban đầu: tối đa 20.000 chunk đã lưu gồm active/staging và 512 MiB blob tài liệu quản trị gồm version cũ đang chờ cleanup. Reservation/check trước nạp phải atomic; báo capacity_exceeded, không cắt tài liệu hoặc bỏ version tốt. Trước reindex toàn corpus kiểm đủ chỗ cho generation mới; không ngầm nâng tier/billing khi thiếu chỗ.
- Admin operations hiển thị counts/bytes/last scheduler run và cảnh báo runtime chưa cấu hình. Kiểm dung lượng DB/Storage thật trước bật dịch vụ, vì quota hạ tầng còn chia sẻ với quiz/lớp/chat; các cap ứng dụng không là cam kết miễn phí của nhà cung cấp.

## 9. Tài liệu nguồn đối chiếu

- [Gemini SDK](https://ai.google.dev/gemini-api/docs/libraries), [embeddings/task type/dimension](https://ai.google.dev/gemini-api/docs/embeddings), [quota](https://ai.google.dev/gemini-api/docs/rate-limits), [Free Tier data terms](https://ai.google.dev/gemini-api/terms).
- [PDF.js](https://github.com/mozilla/pdf.js), [Mammoth raw text/security](https://github.com/mwilliamson/mammoth.js).
- [Supabase Cron](https://supabase.com/docs/guides/cron), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Storage resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [vector indexes](https://supabase.com/docs/guides/ai/vector-indexes).
