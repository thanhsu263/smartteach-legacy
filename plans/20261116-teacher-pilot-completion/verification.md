# Bằng chứng và tiến trình build local

Ngày 16/11/2026. `main @ 25e8529`, working tree chưa commit; có 165 thay đổi trước tác vụ. Không dùng kết quả của plan cũ làm bằng chứng cho tính năng mới. Không push/deploy/remote migration hoặc kích hoạt payOS.

## Tiến trình

| Phase | Đã triển khai/kiểm chứng | Chưa nghiệm thu đầy đủ |
|---|---|---|
| 1 — Tài khoản | Forgot/reset/change; email Mailpit thật, link dùng một lần, mật khẩu cũ/mới; callback/redirect guards; responsive/axe | SMTP và Google OAuth thật trên online; secure-password-change/nonce với policy bật và phiên cũ |
| 2 — Nháp | IndexedDB quiz/đề; restore/save; CAS hai tab/ABA/quota; mất phiên; logout hủy/lỗi/thành công và A→B | Toàn bộ browser storage-blocked/crash-at-exit và ma trận delayed save của bốn loại; không hứa browser flush khi bị kill |
| 3 — CSV | BOM/escaping/formula guard; download quiz thật và roster v2 thật; điểm trọng số khác số câu; owner-only RPC | CSV ứng dụng bảng tính của giáo viên thật; không cần quyền admin đọc riêng |
| 4 — Góp ý | RPC guards/idempotency/quota concurrent; teacher gửi/history; admin lọc/chuyển trạng thái; B không đọc A; responsive | Vòng phản hồi từ giáo viên thật |
| 5 — Soạn đề | Free owner CRUD, optimistic revision, nháp chưa đủ; bốn loại, phần/điểm/thời lượng; 375/768/1280 + axe; tablet chọn vùng | Nghiệm thu thao tác giáo viên và toàn bộ tổ hợp 10 phần/50 câu trong UI |
| 6 — Nhập/xuất | Bốn định dạng qua production route local → preview → save; DOCX XML chỉnh sửa được; PDF tiếng Việt chọn text, render/QA; canary đáp án không vào bản học sinh | Mở file bằng Microsoft Word/LibreOffice thực, kiểm font/PDF worker trên Vercel; corpus scan/mixed/malformed đa dạng ngoài fixture hiện có |
| 7 — Online | Immutable v2, integer weights, deadline server, renewal không tăng giờ; legacy regression; Premium expiry/close/Cron; browser clock lệch + nộp → CSV | Load/concurrency sát deadline trên host thật và thử mất mạng/đóng máy dài hạn |
| 8 — AI nhập riêng | Bucket/job/RPC/lease/budget/apply/cancel/expiry; worker Storage/Postgres với provider giả; smoke Gemini thật; browser upload → đóng/mở tab → review → apply/cleanup với worker HTTP và Gemini thật; corpus 8 tệp tổng hợp; Cron local/HTTP guard | Corpus chưa được giáo viên xác nhận/chạy đủ provider; golden không được tự coi là teacher-reviewed |
| 9 — Dùng thử | Build/test/DB/E2E, ảnh browser, runbook và checklist release/pilot | Production SHA/schema/env/Auth/SMTP/Vault/Cron/host smoke, review độc lập và phản hồi thật 2–3 giáo viên |

## Kết quả đã chạy

| Lệnh/probe | Kết quả |
|---|---|
| `npm test` | **370 tests, 44 files PASS** sau hardening schema/keys/points |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | Production build local PASS; E2E dùng build thật, không dev server |
| `npm run test:db` | **257 PASS**, 1 opt-in live-AI test SKIPPED; 25 files PASS + 1 SKIPPED. Các thông báo invalid_retention/unique violation là negative fixtures, không phải lỗi suite |
| `tests/db/exam-import-jobs.test.ts` | 5 PASS, gồm worker thật đọc private Storage → checkpoint → provider giả → review → apply → cleanup |
| `SMARTTEACH_LIVE_AI_SMOKE=1 … exam-ai-provider-smoke.test.ts` | **1 PASS với Gemini thật**, không mock SDK/provider; một request/job, nội dung tổng hợp, kiểm source/key/points và attempts=1 |
| E2E 8 spec auth/assignments/membership/quiz/results/pilot | **59 PASS** trên production build trước hardening AI/CSS cuối |
| E2E cuối 5 spec admin-rag/draft/exam/results/teacher-pilot | **25 PASS**, bao gồm CSV download thật, admin triage, HTTP worker 403 và responsive góp ý sau sửa |
| E2E chốt sau sửa hydration, 11 spec | **70/70 PASS**, production build mới; gồm đầy đủ các spec trên, auth/assignment/membership/quiz, AI UI dùng Gemini thật và hydration trên bốn route |
| DB chốt 4 spec exams/exam-import-jobs/online-exams/teacher-feedback | **13/13 PASS**, thêm ma trận admin/blocked và 3 request tranh chỗ thứ50. Full DB257 phía trên chạy trước khi thêm test giới hạn này; không gộp số thành một lượt chạy giả |
| `npm run scan:bundle` | PASS candidate cuối:1093 tệp, có so khớp key local; không phát hiện secret/connection string |
| `npm audit --omit=dev` | 0 vulnerability runtime tại thời điểm kiểm; không chạy audit fix |
| Cron local → HTTP worker | Cuối tác vụ chuyển target từ cổng test3100 sang dev3000 đang có sẵn; `pg_net` trả200, heartbeat mới và key healthy. Giữ dev server của người dùng, server test đã dừng |
| PDF | `pdftoppm` render `student-exam.pdf`; xem ảnh trực tiếp, dấu tiếng Việt, lề/đáp án/số trang đúng cho fixture; extraction roundtrip/canary PASS |

Ảnh/bản xuất fixture tại `artifacts/teacher-pilot/`: exam-editor-375/768/1280.png, feedback-375/768/1280.png, student-result.png, student-exam.docx/pdf và student-exam-preview.png. Chỉ có dữ liệu tổng hợp.

## Lỗi đã tìm ra và nguyên nhân

- Khoảng đệm page80px lồng shell gây tràn mobile: bỏ padding lồng, dùng grid track `minmax(0,1fr)`, tablet panel switch; browser/axe đã kiểm lại.
- Helper login chỉ so pathname nên không chấp nhận next có query: sửa helper so pathname+search, giữ nguyên assertion bảo mật và regression next.
- SDK xóa phiên local cả khi signOut server500: xử lý thông báo/nháp theo session thật, không giả đã thu hồi server; E2E kiểm lại.
- Gemini trả400 với schema counted arrays lồng nhau; control schema nhỏ được nhận. Đơn giản hóa grammar, vẫn giữ domain limits; smoke thật đạt. Các lần thất bại trước không được tính PASS.
- Khóa đáp án có thật nhưng thuộc câu khác: thêm regression tái hiện rồi buộc liên kết đúng câu hoặc để trống. Điểm không có trong đoạn nguồn cũng để trống thay vì dùng số model tự điền.
- Một số failure E2E là fixture/selector: tên RPC `p_path`, nút dialog `Xác nhận`, regex đáp án trùng nút “Câu4”; đã sửa test theo UI/RPC thực, không thay luật nghiệp vụ để đạt test.
- Smoke prose source có dấu chấm sau lựa chọn: assertion chỉ chuẩn hóa dấu câu cuối mơ hồ, vẫn kiểm nội dung/thứ tự/key. Không coi hai biến thể dấu chấm hợp lệ là lỗi chấm điểm.
- React418 khi auth resolve trước Suspense hydrate: dev diagnostic xác định menu SSR “Đăng nhập” khác nhánh client “Góp ý”. Snapshot hydration trong useAuth đã sửa; regression production bốn route đạt, không suppress warning.

## Handoff

Xem [runbook](../../docs/teacher-pilot-operations.md) và [ghi nhận triển khai](./implementation-notes.md). Local đã áp migration đến `20261116133000_exam_import_preflight.sql`, không sửa các migration đã áp. Cron riêng `smartteach-exam-import` và SQL `smartteach-exam-finalize`; Next.js phải chạy mới có heartbeat HTTP mới. Test fixture Vault được dọn; cấu hình local thật do `configure-exam-cron.mjs` thiết lập.

Không đánh dấu 30 AC hoàn tất trên online. Các ô task chưa tick trong phase thể hiện phần verification/acceptance còn thiếu, không có nghĩa code chưa được triển khai. Cần review toàn candidate gồm cả thay đổi có trước khi ship; không tự commit gộp working tree.

Trước publish cần cập nhật nguồn `rag-documents/source/corpus.json` (chủ đề01/05/08) theo bản đã deploy rồi dựng/QA lại DOCX qua pipeline hiện có; chưa tải hoặc thay phiên bản trên kho RAG. Bộ hướng dẫn hiện có còn mô tả phiên bản online cũ. Không dùng runbook nội bộ hoặc corpus đề riêng làm kiến thức chung.
