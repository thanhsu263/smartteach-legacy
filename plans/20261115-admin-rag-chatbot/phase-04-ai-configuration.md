# Phase 4 — Gemini, key mã hóa và hạn mức

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable
Depends on: Phase 1

## Kết quả

Admin cấu hình và kiểm tra Gemini được; server chọn key/model hợp lệ, giữ quota theo project/model và dừng có kiểm soát khi hết cấu hình. Chưa có chatbot trả lời trước khi nguồn RAG sẵn sàng.

## Files / areas

- **Mới:** supabase/migrations/20261115130000_ai_configuration.sql; src/lib/ai/{types,models,credentials,crypto,gemini,quota,errors}.ts; src/app/admin/ai/..., API AI trong contracts; src/components/admin/ai-settings.tsx/CSS.
- **Mới:** src/lib/ai/*.test.ts, route tests, tests/db/ai-quota.test.ts, e2e/admin-ai.spec.ts.
- **Sửa:** package.json/lock thêm SDK Google chính thức @google/genai sau kiểm phiên bản tương thích; .env.example, bundle scanner patterns và helper server-only nếu cần. Không cài SDK phía client, không dùng package legacy @google/generative-ai để bắt đầu mới.

## Tasks

- [x] **P4.1 — Credential vault ứng dụng.** Private table + RPC metadata DTO, create/replace key là write-only input; delete/disable có audit. AES-256-GCM, IV ngẫu nhiên, authentication tag, AAD ràng buộc credential/provider/project, key version; master env chỉ server, không nằm cùng DB. Không có master key thì báo chưa cấu hình, không lưu plaintext fallback. Quy trình rotate master hỗ trợ đọc phiên bản cũ trong chuyển tiếp và re-encrypt theo batch trước retire.
  - Verify: roundtrip/tamper/wrong AAD/wrong master/rotation; teacher và admin browser không SELECT/get ciphertext hoặc raw key. Canary key không có trong metadata/API response/log/DOM/.next static/prerender. Chỉ last4/label/projectRef cần thiết hiển thị, không raw secret.
- [x] **P4.2 — Adapter và quota chung.** SDK timeout/abort và retries bị khống chế bởi wrapper; reserve quota ở DB, concurrent calls không vượt cap. Group key theo provider/projectRef/model; disabled/invalid/cooldown states, tối đa retries theo contracts. Phân biệt 401/403 invalid-key với permission/model config lỗi, 429 minute/day, 5xx và timeout. Không tự coi mọi 403 là key sai rồi disable cả pool; chuẩn hóa dựa mã provider. Usage metadata không là “remaining quota” chính xác.
  - Verify: gateway fake table cho mọi loại lỗi; 2 key cùng project/model gặp 429 không quay vòng; nhóm khác hợp lệ được cân nhắc trong cap; tất cả cạn trả unavailable/retry, không gọi paid model. Race 20 request chỉ cấp số slot cho phép; không retry request unsafe theo SDK ngầm.
- [x] **P4.3 — Model/config UI và kiểm kết nối.** Server catalog model được xác minh Free Tier/capability từ docs chính thức lúc build; chat model chưa chọn thì chatbot unavailable, không mặc định tên model suy đoán. Admin chọn model trong allowlist, giới hạn output/user cap, thêm key/projectRef và chạy probe nhỏ thật khi cấu hình. Embedding mặc định/type/dim theo contracts, không đổi model tự động khi failover; đổi generation phải reindex ở phase 5. Model/provider endpoints cố định SDK, không cho admin nhập URL fetch tùy ý. Chức năng test trả healthy/error code + timestamp, không raw SDK payload.
  - Verify: cấu hình unknown/paid-only/model sai loại bị từ chối; test kết nối được mock trong automation; disabled chatbot có hiệu lực server; UX empty/error/quota/disabled, nhập secret một lần không echo; GET list/model không lộ key.
- [x] **P4.4 — Điều kiện dữ liệu và vận hành.** Tạo hướng dẫn cấu hình master/key trong runbook, kiểm Free Tier terms hiện hành và thông báo AI dự kiến trước bật cho teacher. Không tự gửi dữ liệu teacher hoặc tài liệu thực tế trong test kết nối; dùng prompt chẩn đoán tối thiểu. Jobs/chat sau này phải đi qua cùng adapter/quota, không gọi provider vòng ngoài.
  - Verify: offline test không truy cập Google, live smoke là bước riêng có credential chủ dự án. Config chuyển model sau API deprecation có lỗi rõ thay vì âm thầm dùng model trả phí.

## Acceptance / evidence

Private schema + DB concurrency tests, crypto unit, provider boundary test và admin UI đạt. Mọi public DTO/no-store/origin check theo contracts. Đưa counts/errors vào operations phase 3, không ghi prompt/key/SDK raw error.

## Risks

Gemini Free Tier có quota/model/terms thay đổi; không đóng băng số lượt Google vào app. Tài liệu/messaging gửi Google thuộc chính sách Free Tier đã thông báo; không tự thêm lớp/điểm/quiz private vào prompt. ProjectRef không kiểm chứng được bằng việc nhìn chuỗi key: admin phải cấu hình đúng, UI nêu rõ nhóm quota thay vì hứa quota riêng mỗi key.

P4.3/P4.4 yêu cầu kiểm tier của project trong AI Studio trước bật cấu hình thật: cùng một model ID có thể được tính phí ở project bật billing. Allowlist model chỉ là một lớp kiểm tra, không thay xác minh project Free Tier. Ghi điều kiện này trong UI setup/runbook, không tự mở billing hoặc hứa miễn phí không điều kiện.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
