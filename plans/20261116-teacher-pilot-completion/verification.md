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

## P9.1 — Gate local trên candidate 17/11/2026

Candidate: `main @ b33e7d5` + nâng `next` và `eslint-config-next` 16.4.2 → **16.4.6** (chỉ `package.json`/`package-lock.json`, chưa commit). Baseline review: `25e8529` (trước pilot). Diff: 372+38+3 file, gồm 36 migration mới. Log tại `artifacts/teacher-pilot/p9-1/`; đã quét không có mẫu token/key/connection string.

**Lý do nâng Next:** build trên 16.4.2 bị Next chặn bằng `SecurityFatalError`; `npm audit` xác nhận GHSA-mfr8-8qww-v76h (moderate, `>=16.3.0 <=16.4.4`, lộ thông tin root params khi gọi `'use cache'` qua `unstable_cache()`). App không dùng `unstable_cache`/root params nên rủi ro thực tế thấp, nhưng chủ dự án đã chọn vá. Lockfile chỉ đổi gói `next`, `@next/*`, `eslint-config-next`. Không chạy `next upgrade --agent` do log gợi ý.

| Lệnh/probe | Trạng thái | Log |
|---|---|---|
| `npm test` | VERIFIED: 44 files, 370/370 | `test.log` |
| `npm run typecheck`, `npm run lint` | VERIFIED | `typecheck.log`, `lint.log` |
| `npm run build` (Next 16.4.6) | VERIFIED | `build.log` |
| `npm run scan:bundle` | VERIFIED: 1094 tệp sạch, quét sau build 16.4.6 | `scan-bundle.log` |
| `npm audit --omit=dev` | 0 runtime vulnerability. Dev: 7 moderate, cùng nguồn `minimatch` qua typescript-eslint (chỉ lint, có từ trước), chưa sửa | — |
| `npm run test:db` (local đủ 50 migration) | VERIFIED: 258 đạt, 1 skip opt-in AI thật; chạy trên 16.4.2 nhưng không phụ thuộc Next | `db.log` |
| E2E toàn suite, 2 workers, build mới cổng 3100, **không** đặt APP_BASE_URL | 305 đạt / 8 lỗi / 2 skip / 3 không chạy | `e2e.log` |
| E2E chạy lại admin-rag, apple-interface, exam-pilot, membership, teacher-pilot với `APP_BASE_URL=http://localhost:3100`, build mới | VERIFIED: 48/48 (gồm 3 case chat trước đó không chạy) | `e2e-rerun-origin.log` |
| Hai case motion landing, `--repeat-each=5` | 2 workers: 4 đạt / 6 lỗi (FLAKY); 1 worker: **10/10 đạt** | `e2e-landing-repeat*.log` |

Không cộng các lượt thành một tổng. Skip có chủ đích: `exam-ai-import` (cần `SMARTTEACH_LIVE_AI_UI=1`, không gọi Gemini thật) và `rag-worker` (Vault local đã có cấu hình người dùng, test không ghi đè).

**Phân loại 8 lỗi lượt đầu:**
- 6 lỗi (admin game, exam-pilot ×2, membership 403≠400, teacher-pilot ×2): **môi trường test**. `.env.local` để `APP_BASE_URL=http://localhost:3000` cho dev server; guard Origin so khớp chính xác nên từ chối mutation từ cổng 3100 đúng thiết kế. Chạy lại với origin đúng thì đạt. E2E phải đặt `APP_BASE_URL` trùng `PLAYWRIGHT_PORT` (như plan đã ghi).
- 2 lỗi motion (`apple-interface` CardSwap hover/swap, header ẩn/hiện khi cuộn): **FLAKY khi chạy song song**, đạt 10/10 với 1 worker. Lượt UI trước cũng chạy file này với 1 worker và không đưa nó vào lượt 2 workers. Không sửa landing hay nới assertion. Verification gap: config chưa buộc file này chạy tuần tự.

**Review an ninh tầng DB/API (đọc catalog Postgres local và route mới):**
- Mọi hàm `SECURITY DEFINER` trong `public` đều đặt `search_path`. Hàm anon gọi được chỉ là luồng học sinh dùng token/PIN (join/play/assignment/library công khai).
- Hàm worker/thanh toán (`rag_*` job, `exam_import_claim/checkpoint/reserve_attempt`, `ai_*`, `chat_finish`, `bind/settle_membership_payment`, `bootstrap_admin`) chỉ service_role gọi được. Toàn bộ `admin_*` cho authenticated đều gọi `private.require_admin`.
- 18 policy `active_account_guard` là RESTRICTIVE. Mọi bảng public bật RLS; `exams`, `teacher_feedback` không có grant trực tiếp. Bucket `exam-imports`, `rag-documents` private, không có policy storage.
- Premium chặn ở DB: `create_exam_assignment`, `reserve_exam_import`, `complete_exam_import` kiểm `has_premium`; bài giao có trigger `assignments_require_premium`.
- Route mới đều có guard: `requireUser`/`requireUser(true)`, `billingUser` + origin, webhook xác minh chữ ký; payOS trả 503 khi thiếu env (đúng quyết định hoãn). Worker nội bộ dùng `timingSafeEqual`, secret ≥32 ký tự. CSV xuất có guard công thức `=+-@` và ký tự điều khiển đầu ô.
- Không có finding cần sửa trong phạm vi đã review.

**Review toàn diff `25e8529..8d54661` (hs-code-review, inline, không spawn agent):** ưu tiên theo rủi ro. Đọc kỹ 36 migration mới (thi online v2, chốt bài theo hạn, guard hạn nộp, import job, feedback, chat RAG), các route `/api/admin|chat|exam-imports|internal`, `admin/http`, `ai/gemini|crypto`, `chat/service`, `exams/import/jobs`, `exams/export/pdf`, `drafts/storage`, runner học sinh và chat widget. Phần UI landing/hero/admin CSS chỉ quét tìm mẫu nguy hiểm (`dangerouslySetInnerHTML`, `innerHTML`, `eval`, link ngoài), không review từng dòng.

Đã xác minh, không có lỗi:
- Payload học sinh v2 lấy câu hỏi qua `private.assignment_public_questions`, một whitelist (`index, kind, prompt, time_limit_seconds, options[].label`), nên không lộ `is_correct`/`accepted_answers`. Test DB `online-exams.test.ts:33` cũng assert điều này.
- Grader `private.is_answer_correct` khớp schema v2 (`kind`, `options[].label/is_correct`). Đề phát hành bắt buộc nhãn lựa chọn khác nhau, nên `key={option}` ở runner an toàn.
- Thứ tự khóa assignment → attempt nhất quán ở exchange/state/save/submit/finalize và cron `finalize_due_exam_attempts` (`skip locked`). Bài hết hạn được ghi `submitted_at = deadline_at`.
- Trigger `exam_answer_deadline` chỉ bắt `update of answer`, nên finalize ghi `is_correct` không bị chặn.
- Import đề: upload qua signed URL của service role (`upsert:false`); server tự hash lại, kiểm magic bytes; worker so hash trước khi trích xuất. Lease 45 giây, tối đa 2 lần gọi AI; job hết hạn hoặc bị hủy được dọn khỏi Storage.
- Chat: owner/generation/citation được kiểm lại trong `chat_finish`. Câu trả lời render dạng text, link nguồn là nội bộ. Font PDF có trong `.next/.../exams/[id]/export/route.js.nft.json`.

Finding (đều Low, không chặn pilot; **đã sửa**, xem mục "Sửa finding review" bên dưới):
1. **Low — job nhập đề crash ở bước trích xuất được nhận lại không giới hạn.** `exam_import_claim` chỉ kiểm `attempts` ở stage `generate`. Nếu worker chết/timeout khi trích xuất (tệp độc, PDF nặng), lease 45 giây hết thì job được claim lại khoảng mỗi phút cho tới khi hết hạn 24 giờ. Không tốn quota Gemini, chỉ tốn CPU worker và chặn giáo viên tạo lượt mới (`exam_import_busy`) cho tới khi hủy. Nguồn: `20261116130000_exam_import_jobs.sql`, `exam_import_claim`. Xác minh bằng đọc code, chưa probe runtime.
2. **Low — mã lỗi `attempt_budget_exhausted` từ `exam_import_reserve_attempt` bị gộp thành `unsupported_file`.** `dbError` (`src/lib/admin/http.ts`) không có mã này trong `safeCodes`, nên `jobs.ts` nhận `AppError("operation_failed")` và rơi về `unsupported_file`. Chỉ xảy ra khi có race, vì claim đã chặn `attempts>=2` trước, nhưng thông báo cho giáo viên sẽ sai. Xác minh bằng đọc code.

Ghi chú hiệu năng (không phải lỗi): `assignment_student_state` v2 lấy `FOR UPDATE` trên dòng assignment mỗi lần học sinh tải trạng thái, nên các lượt đọc của cả lớp được tuần tự hóa. Chấp nhận được với quy mô pilot.

**Sửa finding review (17/11/2026, chưa commit):**
- Finding 1: migration `20261117090000_exam_import_extract_stall.sql` thêm `extract_claims` và `extract_claim_cursor`, rồi thay `exam_import_claim`. Job ở stage extract được claim tối đa 3 lần tại cùng một cursor; lần thứ 4 chuyển sang `failed/unsupported_file` và vào cleanup. Batch PDF tiến cursor thì bộ đếm reset, nên không ảnh hưởng tệp lớn đang chạy tốt. Đã áp lên Supabase local bằng `supabase migration up --local` (không reset); chưa áp online.
- Finding 2: thêm `attempt_budget_exhausted` vào `safeCodes` của `dbError`. `jobs.ts` giờ lấy mã từ `AppError.code` (lỗi RPC) hoặc `Error.message` (lỗi cục bộ).
- Test DB mới trong `tests/db/exam-import-jobs.test.ts`: (a) trích xuất treo → 3 lần claim, sau đó `failed/unsupported_file`; (b) race hết lượt AI → kết quả và DTO giữ `attempt_budget_exhausted`.

| Lệnh | Kết quả | Log (`artifacts/teacher-pilot/p9-1-review-fix/`) |
|---|---|---|
| `npm test` | VERIFIED 370/370 | `test.log` |
| `npm run typecheck`, `npm run lint` | VERIFIED | `typecheck.log`, `lint.log` |
| DB import + provider smoke | VERIFIED 7 đạt, 1 skip opt-in | `db-import.log` |
| `npm run test:db` toàn bộ | 259 đạt / 1 lỗi / 1 skip | `db.log` |
| Chạy lại riêng `exam-import-jobs` ×2 | VERIFIED 7/7 cả hai lượt | `db-import-rerun-1.log`, `db-import-rerun-2.log` |

Lỗi trong lượt toàn bộ là test cũ "durable budget, lease fencing…" (`lease_lost` ở checkpoint `extracted`), phân loại **TEST-DEFECT/môi trường**:
- Vault local có `smartteach_exam_worker_url` trỏ `host.docker.internal:3000`, nên cron `smartteach-exam-import` mỗi phút gọi worker thật trên dev server của người dùng (`net._http_response`: 30 lần 200 trong 15 phút). Worker đó claim job của test song song.
- Lượt toàn suite dài khoảng 3 phút nên gặp cron tick; lượt riêng khoảng 10 giây thì không. P9.1 đạt là do trùng thời điểm.
- Chưa sửa: không đổi Vault/cron của người dùng. Hướng xử lý sau: tạm dừng job cron trong test hoặc lọc claim theo owner.

**Giới hạn review:** không chạy probe mới cho phần review. Mọi kết luận dựa trên đọc code cùng các gate P9.1 ở trên. Không đối chiếu Figma; ảnh 375/768/1280 chỉ dựa vào E2E UI/a11y trong suite (đạt), chưa chụp bộ ảnh riêng cho candidate này. Không gọi Gemini thật.

**Ghi chú cho P9.2:** 5 migration `20261115156000`–`20261115159000` có timestamp phút ≥60 (không hợp lệ về thời gian; CLI hiển thị số thô). Thứ tự lexicographic vẫn đúng, cần lưu ý khi đối chiếu migration history online. Worker nhập đề dùng `EXAM_IMPORT_WORKER_SECRET`, fallback `RAG_WORKER_SECRET`; `.env.local` hiện chỉ có biến sau.

Trước publish cần cập nhật nguồn `rag-documents/source/corpus.json` (chủ đề01/05/08) theo bản đã deploy rồi dựng/QA lại DOCX qua pipeline hiện có; chưa tải hoặc thay phiên bản trên kho RAG. Bộ hướng dẫn hiện có còn mô tả phiên bản online cũ. Không dùng runbook nội bộ hoặc corpus đề riêng làm kiến thức chung.
