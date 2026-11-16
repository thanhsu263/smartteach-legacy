# Phase 6 — Chat RAG, nguồn và lịch sử 30 ngày

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable
Depends on: Phases 4, 5

## Kết quả

API hỏi đáp tiếng Việt có nguồn kiểm chứng, tìm học liệu approved, không tự thao tác dữ liệu. Lịch sử chỉ owner truy cập, xóa ngay và hết hạn đúng semantics; admin không có đường đọc raw chat.

## Files / areas

- **Mới:** supabase/migrations/20261115150000_rag_chat.sql, 20261115151000_chat_retention.sql; src/lib/chat/{types,service,retrieval,citations,history,prompt,errors,stream}.ts; mở rộng src/lib/rag/sources.ts.
- **Mới:** src/app/api/chat/config/route.ts, threads và messages/source handlers theo contracts; private SQL purge/heartbeat.
- **Mới:** src/lib/chat/*.test.ts, route tests, tests/db/{chat-history,rag-retrieval,chat-retention}.test.ts; fixture đánh giá tests/fixtures/rag/queries.json.
- **Sửa:** operations phase 3 và worker runbook để hiển thị retention status, không hiển thị nội dung.

## Tasks

- [x] **P6.1 — Retrieval và answer service.** Auth active/owner/thread idempotency/quota trước provider, query embedding đúng model/generation, tìm cosine + filters topic/grade/subject và eligibility helper phase 5. Chỉ đưa context bounded, có phân cách dữ liệu không tin cậy; system prompt bám mục tiêu hướng dẫn/tìm học liệu. Giữ nguồn server-side và validate JSON/citation IDs của model, recheck eligibility ngay trước lưu/phát. SSE state phản ánh bước thật, answer cuối sau validation, error/EOF rõ, abort/provider timeout bounded.
  - Verify: fixture hướng dẫn, tìm quiz phân số lớp 6, thiếu môn/lớp, không nguồn, ngoài phạm vi. Chỉ nguồn có trong retrieval set được cite; model bịa URL/source ID bị loại, nguồn bị gỡ giữa gọi model không phát answer cũ. Injection trong tài liệu/yêu cầu đọc private data không gọi tool hoặc truy vấn vượt quyền. Context/token cap/malformed output/empty answer an toàn, không có raw key/SDK error. Không có model call khi thiếu key/kho chưa sẵn sàng hoặc account blocked.
- [x] **P6.2 — History owner, idempotency và purge.** CRUD thread/message/citations qua owner RLS/RPC, TTL từng message 30 ngày; cap history/context, pagination. requestId unique bảo vệ double submit/reconnect. Delete thread nguyên tử với generation/tombstone để in-flight request không ghi answer trở lại. SQL purge mỗi giờ, exclude expired trong mọi reads/context ngay cả trước purge; không giữ prompt/answer bản sao ở audit/global response cache.
  - Verify: teacher A/B/admin/anon; B/admin không GET/SELECT/RPC/export chat A; expires_at boundary ngay trước/sau 30 ngày, tin mới không kéo dài tin cũ. Teacher delete trong khi gọi model, browser logout/user switch và retry requestId cũ không resurrect. Duplicate POST không nhân provider call hoặc assistant message đã commit. Cron SQL chạy khi không có HTTP traffic, xóa message/citations và thread rỗng; heartbeat lỗi thật được báo.
- [x] **P6.3 — API nguồn và chiến lược context.** Teacher xem đoạn nguồn đang active qua source ID, PDF page hoặc DOCX paragraph/mục; library link trỏ preview thật. Không signed link blob dài hạn, không trả private Storage path hoặc full tài liệu chưa công bố. Lịch sử có nguồn đã gỡ hiện trạng thái nguồn không còn truy cập; assistant history từ nguồn đã thu hồi không được tái dùng vào context.
  - Verify: random/private/stale source ID, hidden library, nguồn admin đang processing và nguồn đã gỡ đều không mở được nội dung. Public-shaped source không có is_correct/accepted_answers/owner roster. Không coi answer cũ trong history là nguồn tri thức mới để vượt withdraw.

## Acceptance / evidence

Tối thiểu 20 query fixture tự biên soạn: 8 hướng dẫn, 6 tìm học liệu, 3 thiếu/ngoài nguồn, 3 injection/private probes. Mỗi query ghi expected eligible source IDs và outcome (answer/clarify/no_source/deny), không chấm theo câu văn cố định. Canary quyền, invalid citation và retrieval eligibility phải đạt 100% trong deterministic tests; chất lượng Gemini thật đánh giá riêng, không suy từ mock.

Unit cho orchestration/prompt/citation; Postgres thật cho ranking filters, owner, concurrency và purge; route test cho HTTP/SSE contract và no-store/auth. UI thuộc phase 7, live provider smoke thuộc phase 8.

## Risks

RAG không bảo đảm model không bịa; source validation server và trường hợp thiếu nguồn là yêu cầu bắt buộc. Không stream raw model token rồi mới phát hiện nguồn sai. Purge không thay chính sách giữ dữ liệu của Google/backup; runbook và thông báo phải phân biệt phạm vi ứng dụng kiểm soát.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
