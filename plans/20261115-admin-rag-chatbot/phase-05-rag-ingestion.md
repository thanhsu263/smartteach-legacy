# Phase 5 — Kho tài liệu vector và tác vụ nền

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable
Depends on: Phases 1, 2, 4

## Kết quả

Admin tải tài liệu trong giới hạn đã chốt, theo dõi được tiến trình; pipeline trích chữ/embedding chạy theo lô dù tab đã đóng. Nguồn đang active/approved được index và nguồn bị gỡ không được publish lại bởi job cũ.

## Files / areas

- **Mới:** supabase/migrations/20261115140000_rag_documents.sql và 20261115141000_rag_schedule.sql; src/lib/rag/{types,limits,documents,extract-pdf,extract-docx,chunking,embedding,jobs,scheduler,sources}.ts.
- **Mới:** src/app/admin/rag/documents/... và API upload/complete/reindex/delete như contracts; src/app/api/internal/rag/jobs/run/route.ts; src/components/admin/rag-documents.tsx/CSS; scripts/configure-rag-cron.mjs.
- **Sửa:** package.json/lock cho pdfjs-dist, mammoth và resumable upload client nếu cần; next.config.ts chỉ cho server dependency packaging; .env.example cho khóa scheduler/master và URL vận hành, không commit secret.
- **Mới:** src/lib/rag/*.test.ts, tests/db/{rag-jobs,rag-sources}.test.ts, route tests, e2e/admin-rag.spec.ts; tests/fixtures/rag/ gồm PDF/DOCX tự tạo, không dữ liệu thật/bản quyền không rõ.

## Tasks

- [x] **P5.1 — Kiểm parser, private Storage và upload.** Làm compatibility probe PDF.js Node 24 + Next production (worker/native resource tracing, optional canvas dependency nếu bản cài cần, không render ảnh/OCR); DOCX dùng Mammoth raw text, external file access tắt. Tạo vector extension/schema, private bucket và DB metadata. Admin tạo reservation scoped path, upload trực tiếp Storage, complete kiểm object bytes/magic/hash rồi enqueue; orphan reservation/blob được cleanup. Không đưa binary 10 MiB qua Vercel handler.
  - Verify: PDF text tiếng Việt có dấu 1/200 trang, DOCX có paragraph; oversized bytes/pages/raw text, zip bomb, encrypted/corrupt/scan-only, upload chưa xong, thay MIME/path/hash đều có lỗi rõ. Hai admin tạo reservation cạnh cap 50 không vượt. Teacher không upload/list bucket. Production bundle load parser và một file text thật trong runtime Node, ghi thời gian/memory; không đánh dấu bằng unit mock parser.
- [x] **P5.2 — Extraction/chunk/embedding có phiên bản.** PDF giữ page locator; DOCX paragraph/section locator, không bịa page. Chunk bounded theo contracts; normalize embedding 768 và pin model/generation. Lưu chunk/batch idempotent, checkpoint sau mỗi bước. Version mới chỉ activate khi toàn bộ chunks hợp lệ, version cũ tiếp tục active trong lúc reindex; delete/tombstone chặn mọi version ngay.
  - Verify: Unicode/Vietnamese boundary, token cap model, vector length/finite/norm; retries không nhân chunk. Thử quota giữa batch → waiting_quota, không đánh fail tệp vô lý hoặc đổi model; chạy lại tiếp cursor. Race reindex/delete/activate không publish dữ liệu đã gỡ. Thất bại phiên bản mới không làm mất phiên bản tốt đang hoạt động.
- [x] **P5.3 — Worker và Cron thực sự.** Endpoint scheduler-auth claim một step có lease/fencing, thời lượng/calls bounded; không giữ xử lý bằng timer sau response. Supabase Cron mỗi phút gọi qua pg_net, helper lấy canonical worker URL/secret từ Vault. Script cấu hình local rõ target; production cần authorization riêng. Docker local dùng URL host.docker.internal tới server host, không localhost của container; production dùng HTTPS canonical. Không bật Edge Runtime. Heartbeat/counts/error class vào operations.
  - Verify: hai request scheduler đồng thời không cùng hoàn tất job; kill sau checkpoint và reclaim lease; stale lease không ghi finalize; crash sau API response có retry bounded được ghi nhận (không hứa provider exactly-once). User/admin token, secret sai, method/body sai đều bị chặn. Fake clock + manual worker probe cho local; có thêm Cron thật chạy khi browser đóng và không có traffic. Missing extension/secret/HTTP protection hiển thị scheduler unavailable, không fake job ready.
- [x] **P5.4 — Đồng bộ học liệu và màn hình admin.** Consume publication revision/outbox phase 2; backfill approved hiện có bằng payload đã loại đáp án. Source key publicationId/revision unique, enqueue/update/remove transaction-safe. Retrieval eligibility chuẩn bị helper kiểm active version và approved current state, không đọc snapshot nguồn private. Admin UI upload/progress/status/filter/môn/lớp/retry/gỡ, giải thích giới hạn và lỗi. Có trạng thái kho chưa có hướng dẫn SmartTeach thay vì AI bịa hướng dẫn.
  - Verify: approved→hidden/withdraw/update trong khi embedding chạy, stale vector bị loại ngay; reopen tab thấy job thật và progress không lùi/nhảy ready giả. Bộ fixture có PDF hướng dẫn SmartTeach biên soạn theo luồng đã kiểm tra và quiz approved để phase 6 đánh giá; nguồn live do admin cung cấp/duyệt riêng.

## Acceptance / evidence

Parser thật + DB jobs thật + gateway fake deterministic; upload/progress UI thật. Nghiệm thu batch không cần API Google thật, nhưng tệp text thực tế và production parser cần chạy. Scheduling có integration check riêng, không dùng việc mở trang để kích tiến trình.

P5.1/P5.2 bao phủ capacity guard toàn kho theo contracts: blob/version/chunk không né cap bằng concurrency, update hoặc orphan upload. Preflight reindex kiểm chỗ staging; lỗi dung lượng giữ nguyên source version đang hoạt động. Không coi cap 50 tệp là bảo đảm mọi tổ hợp tệp đều vừa quota Supabase của môi trường.

## Risks

pg_net/Cron/Vault và hosting protection là prerequisite runtime, không mặc định đang cấu hình. Tài liệu có thể không trích được chữ dù copy được trong viewer; báo lỗi text extraction và giữ index cũ, không âm thầm OCR. Không ghi nội dung file/chunk hoặc URL có token vào log. Mọi worker write kiểm source generation để delete có hiệu lực cả lúc job đang chạy.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
