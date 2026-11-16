# Phase 8 — AI trích xuất đề riêng chạy nền

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC22–24,28–29. Phụ thuộc5–6; nền gateway và Cron admin/RAG đã có local, production chưa mặc định sẵn sàng.

## Files

Hiện có: src/lib/ai/{gemini,models,errors}.ts; src/lib/rag/extract.ts và jobs.ts làm mẫu; admin/http.ts; route worker RAG; migration AI quotas/RAG schedule; next.config.ts; docs/admin-rag-operations.md.
Mới: migrations *_exam_import_jobs.sql, *_exam_import_schedule.sql; private Storage bucket exam-imports; src/lib/exams/import/{jobs,ai,provenance}.ts; API exam-imports và internal/exams/jobs/run; components/exams/ai-import.tsx; tests/db/exam-import-jobs.test.ts; unit extraction tests; e2e/exam-ai-import.spec.ts. Runbook mới do build tạo dưới docs/teacher-pilot-operations.md; không đổi RAG embedding.

## Tasks

- [x] **P8.1 Reserve/upload/jobs và quyền.** Persistent state machine, checkpoint, lease/fencing, rate limit, idempotency và cleanup theo contracts§8; signed upload private đúng path/hash, không upsert. Validate active/Premium ở reserve, complete, retry và trước từng provider call; owner vẫn đọc status/review sau expiry. Worker bounded30s, timing-safe Bearer, không fire-and-forget. Cron mỗi phút invoke endpoint riêng; secret có target rõ, preflight/heartbeat mới tách khỏi RAG. Cancel/delete/cleanup khiến worker stale không được phục hồi job; apply transactional đúng một exam.
  - Verify: DB/route A/B/admin/anon/blocked/Free, direct private table/bucket requests; signed path tamper, size/hash sai, duplicate reserve/complete/apply; crash và hai worker reclaim cùng lúc, cancel/delete/apply races, quota qua mốc ngày Việt Nam. Job DB còn khi tắt server. Raw source/result không xuất hiện trong admin document list hoặc RAG.
- [ ] **P8.2 Extraction có schema/provenance và budget.** Reuse extract batches và withGemini SDK hiện có; không ép ví dụ Interactions mới vào gateway đang generateContent. Mỗi step reserve DB một attempt rồi gọi withGemini budget.remaining=1, tổng≤2/job kể cả failover/reclaim; timeout12s/call, input/output/fulltext có bound. Quota chung project và3 jobs/ngày/account, không đổi key để vượt quota. Instruction chỉ trích, cấm tool/network và bỏ qua câu lệnh trong tệp. Thiếu đáp án cần sửa; kiểm JSON/domain/finishReason/coverage/provenance, không gọi AI lần3 để tự sửa. Quota wait trong24h theo not_before; retry sau crash không reset budget. Quá giới hạn input thì hướng dẫn tách tệp trước gọi.
  - Verify: fake gateway quota/auth/timeout/truncated/invalid JSON, field không hỗ trợ, đáp án không có trong nguồn, prompt injection và locator/quote sai. Profile payload và token reservation upper bound, DB budget sống qua reclaim/retry. Corpus≥8 tệp tự do có chữ (2 mỗi format), đủ4kind, tiếng Việt, thiếu đáp án và nội dung không hỗ trợ; golden do giáo viên kiểm trước. Provider smoke được phép với key đã cấu hình, đối chiếu từng câu/lựa chọn/đáp án/điểm; discrepancy phải được đánh dấu để sửa. Mock không chứng minh extraction thật.
- [x] **P8.3 UI review/apply và vận hành.** Consent trước chọn AI; status queued/extracting/generating/waiting_quota/needs_review/failed/cancelled/expired rõ. Mở lại trang xem được job, có cancel/delete và thông báo hạn24h. Xem đoạn nguồn/locator cùng draft, xác nhận đáp án trước lưu; apply không publish. Render text an toàn. Preflight nêu lý do không nhận job; admin chỉ xem aggregate job/heartbeat/error codes, không nội dung hoặc đường tải riêng. Purge nguồn sau apply/cancel/expiry, retry nếu Storage lỗi, không xóa đề đã lưu.
  - Verify: browser tạo→đóng tab→mở lại→review→apply, retry trả cùng ID; quota/no-heartbeat/error recovery. Canary từ đề riêng hỏi RAG không retrieve được; audit/log/bundle không file body/key/token. Sau24h nguồn bị dọn đúng hợp đồng. Probe Cron thật local, stop/resume worker và cleanup retry; online activation táchP9.

## Done

Không nhận tệp rồi để queued vĩnh viễn khi preflight fail. Không dùng nguồn nhập làm kiến thức chung, không hứa AI đúng100%, không dùng bản nhập chưa review làm khóa chấm.
