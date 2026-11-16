Mode: local
Status: implemented-local; local-core-verified; online pending
Readiness: handoff-ready-local; acceptance exclusions trong verification.md; triển khai online cần preflight và authorization riêng
Created: 2026-11-16

# Hoàn thiện SmartTeach cho 2–3 giáo viên dùng thử

Nguồn: [Decision Brief đã chốt](../reports/brainstorm-2026-11-16-teacher-pilot-completion.md), 30 tiêu chí; [inventory Figma](../reports/figma-2026-11-16-smartteach-teacher-flow.json). Không có --gh: không tạo issue, commit, push hoặc deploy trong bước lập kế hoạch.

## Kết quả và phạm vi

Giáo viên khôi phục/đổi mật khẩu, khôi phục nội dung chưa lưu trên cùng trình duyệt, xuất kết quả CSV, gửi/theo dõi góp ý, soạn/nhập/xuất đề và tổ chức kiểm tra online đúng quyền gói. Website nghiệm thu: https://smartteachvn.vercel.app/; chưa xác minh schema/config/build online trong tác vụ này.

Free: quiz hiện có; soạn đề; nhập DOCX/PDF có chữ/XLSX/CSV đúng mẫu; xuất đề Word/PDF. Premium: thêm AI trích xuất bố cục tự do và tạo/phát hành kiểm tra online. Giữ 50.000đ/tháng, 500.000đ/năm; payOS hoãn. Không khóa quiz Free hoặc quyền đọc/đóng bài đã phát hành khi hết Premium.

Ngoài phạm vi: OCR, hình/công thức, .doc/.xls cũ, giữ bố cục tệp nguồn, AI sinh đề/đoán đáp án, chấm tự luận ngữ nghĩa, đồng bộ nháp nhiều máy, tài khoản học sinh, ngân hàng câu hỏi, báo cáo liên buổi, sửa hero/motion toàn trang, admin đọc dữ liệu riêng, kích hoạt payOS. Không cập nhật PRODUCT.md/DESIGN.md trong planning.

## Chuẩn bị domain và bằng chứng

Routing: frontend + backend + devops → prepare (chỉ đọc). Đã đọc PRODUCT.md/DESIGN.md, brief UX, shell/form, auth, RPC/RLS, import, gateway AI, jobs/Cron, cấu hình Next/Supabase và test entry points. Dùng visual system hiện tại, không chạy lại phỏng vấn thiết kế hoặc viết lại context đã có.

| Khu vực đã kiểm | Hiện trạng quyết định kế hoạch |
|---|---|
| src/components/login-form.tsx; src/app/auth/callback/route.ts; src/lib/auth/safe-next.ts | Email/Google, PKCE exchange và redirect nội bộ; chưa recovery/change password |
| src/components/auth-provider.tsx; teacher-shell.tsx; admin/sign-out-account.tsx | Đăng xuất dùng chung nhưng hiện bỏ qua lỗi SDK; cần kết quả thật trước dọn nháp |
| src/components/quiz/{quiz-editor,question-form}.tsx; src/lib/quiz/{types,limits,validate}.ts | Nháp trong state, một form/câu đang mở; 4 loại; tối đa 50 câu, 6 lựa chọn; không có persistence nháp |
| src/lib/live/{rpc,results}.ts; components/live/results/results-screen.tsx | host_results owner-only sau kết thúc; có nickname, rank, điểm, answered/correct, removed/left |
| src/lib/assignments/{api,types}.ts; assignment-detail.tsx | Có roster/receipt; score hiện bằng số câu đúng; chưa điểm có trọng số hoặc đồng hồ toàn bài |
| migrations 20261111090000, 20261111091000, 20261112090000 | Snapshot bất biến từ lúc tạo assignment; token expiry phụ thuộc hạn nộp, không phải thời lượng bài. Không dùng token_expires_at làm đồng hồ thi |
| migrations 20261115090000, 20261115100000 | Premium trigger cho assignment, active-account guard/RLS và SECURITY DEFINER. Hàm mới/replace phải giữ guard tường minh; script guard cũ không tự áp lại |
| src/lib/quiz/import/ | Đã có CSV/XLSX/text browser parser, zip guard, errors theo hàng; parser cũ có warning khi cắt hàng. Luồng đề mới phải từ chối vượt giới hạn, không cắt mất câu |
| src/lib/rag/extract.ts; src/lib/ai/{gemini,models}.ts | Mammoth/PDF.js server, withGemini + project quota; không có file gateway.ts. Tái sử dụng hàm, không dùng bảng/bucket RAG cho đề riêng |
| src/lib/admin/http.ts; components/admin/admin-shell.tsx | requireUser/account_session, Origin guard, error envelope, pagination, no-store; workspace-feedback.tsx chỉ là component status, chưa là nghiệp vụ góp ý |
| next.config.ts; package.json; playwright.config.ts; vitest.db.config.mts | Next 16.4.2 + cacheComponents; tracing PDF worker chỉ áp route RAG cũ; production E2E 3100; DB test tuần tự |
| supabase/config.toml | Cấu hình local khác production; secure_password_change false, SMTP mặc định hạn chế. Không config push lên remote |

Đã đọc Next docs cài tại node_modules/next/dist/docs: authentication-with-cache-components.md, route.md, cookies.md. Server auth đọc trong Suspense; không thêm cấu hình runtime/cache lỗi thời hoặc cache chung dữ liệu riêng. PRODUCT/README có mô tả tương lai đã cũ; code thắng khi mô tả hiện trạng.

## Hợp đồng và màn hình

[contracts.md](./contracts.md) là hợp đồng xuyên phase: dữ liệu, route/RPC, entitlement, giới hạn, lưu nháp, thời gian/chấm điểm, import, jobs và UI/Figma. Tên đánh dấu mới là đề xuất triển khai, chưa tồn tại. Đổi quyết định sản phẩm/quyền/kiến trúc vượt hợp đồng phải quay lại brainstorm.

## Phases

| Phase | Kết quả kiểm chứng riêng | Phụ thuộc thật | Trạng thái |
|---|---|---|---|
| 1 | [Khôi phục/đổi mật khẩu](./phase-01-account-recovery.md) | — | Implemented-local; xem verification.md |
| 2 | [Khôi phục nháp cục bộ](./phase-02-local-drafts.md) | —; tích hợp signOut của 1 | Implemented-local; xem verification.md |
| 3 | [CSV kết quả](./phase-03-results-csv.md) | —; bổ sung điểm mới sau 7 | Implemented-local; xem verification.md |
| 4 | [Góp ý giáo viên/admin](./phase-04-feedback.md) | Nền admin đã có local | Implemented-local; xem verification.md |
| 5 | [Soạn đề Free và cấu trúc dữ liệu](./phase-05-exam-authoring.md) | 2 để dùng adapter nháp | Implemented-local; xem verification.md |
| 6 | [Nhập theo mẫu và xuất Word/PDF](./phase-06-template-import-export.md) | 5 | Implemented-local; xem verification.md |
| 7 | [Kiểm tra online có thời hạn và điểm](./phase-07-online-exams.md) | 5; 3 cho CSV điểm | Implemented-local; xem verification.md |
| 8 | [AI nhập đề riêng chạy nền](./phase-08-ai-import.md) | 5, 6; nền AI/Cron local | Implemented-local; xem verification.md |
| 9 | [Nghiệm thu và chuẩn bị dùng thử online](./phase-09-pilot-readiness.md) | 1–8 | Implemented-local; xem verification.md |

Thứ tự mặc định 1→2→3→4→5→6→7→8→9. Không tự chia agent, issue hoặc commit theo phase. Không yêu cầu chờ phase trước nếu không có phụ thuộc trong bảng.

Nền [admin/RAG](../20261115-admin-rag-chatbot/plan.md) đã implemented-local, live pending. Plan này không thay thế hoặc archive plan đó. Phải đối chiếu các migration/secret/Cron nền khi chuẩn bị online; không coi local verified là production đã sẵn sàng. Working tree có 165 thay đổi trước planning: giữ nguyên, ghi baseline ở lần build đầu.

## Ánh xạ 30 tiêu chí của brief

| AC | Task | Evidence quyết định |
|---|---|---|
| 1 | P1.1, P1.2, P9.2 | Mailpit recovery thật local; SMTP online có phép; mật khẩu cũ/mới |
| 2 | P1.2 | Đúng account, reauth nonce/policy, tài khoản Google |
| 3 | P1.1, P1.2 | Link sai/hết hạn/dùng lại; email không tồn tại cùng phản hồi |
| 4 | P1.1, P9.2 | Callback canonical; malicious next; không token trong log |
| 5 | P2.1, P2.2 | Reload/đóng tab, câu mới/cũ và 4 loại |
| 6 | P2.2 | Restore/discard/save failure/success, rời form |
| 7 | P2.3 | A→logout→B; logout thất bại/cancel; phiên hết hạn |
| 8 | P2.1, P2.2, P5.2 | Storage đầy/bị chặn, server revision và hai tab xung đột |
| 9 | P3.1 | Một session đã kết thúc, removed/left/rank |
| 10 | P3.2 | Roster đủ trạng thái, ô điểm trống chưa nộp |
| 11 | P3.1 | UTF-8 BOM, CSV quote/newline, formula injection |
| 12 | P3.2 | Teacher khác/admin/anon bị từ chối; scan file không có token |
| 13 | P4.1, P4.2 | Gửi thật, retry cùng request ID, xem của mình |
| 14 | P4.1, P4.2 | Admin lọc/chuyển 3 trạng thái; không mở quyền private khác |
| 15 | P4.1 | Bounds/rate limit, XSS, metadata whitelist |
| 16 | P9.1 | Browser 375/768/1280, keyboard/axe, 2 teacher + admin |
| 17 | P7.1, P9.1 | Legacy fixtures quiz/assignment, Google/email, gates membership |
| 18 | P9.2 | Candidate/schema/env/backup matrix, post-release smoke thực |
| 19 | P9.3 | Kịch bản và feedback từ 2–3 giáo viên thật |
| 20 | P5.1, P5.2 | Free authoring/sections/points/duration, draft không hoàn chỉnh |
| 21 | P6.1, P6.2 | Fixture 4 định dạng, roundtrip, lỗi vị trí, không gọi AI |
| 22 | P8.1, P8.2, P8.3 | Consent, nguồn/đáp án truy vết, teacher review, canary RAG |
| 23 | P5.1, P7.1, P8.1 | UI/API/RPC/direct data permission; expiry khi đang thi |
| 24 | P6.1, P8.2 | Scan/mixed/image/formula/zip bomb/oversize/quota/timeout |
| 25 | P6.3 | DOCX đọc sửa được, PDF render/chọn text tiếng Việt, answer-key canary |
| 26 | P7.1, P7.2 | Server clock, renewal/reload/close/deadline/offline |
| 27 | P7.1 | Immutable v2 snapshot, weights, exact match, concurrency/idempotency |
| 28 | P7.2, P3.2, P8.3 | CSV điểm mới, auth matrix và private canaries |
| 29 | P8.1–P8.3 | Tab đóng/reclaim/duplicate; corpus thật có golden teacher-reviewed |
| 30 | P5.2, P6.2, P9.1 | Figma mapping và review ảnh 375/768/1280, trạng thái lưu thật |

## Verification và readiness review

- Task chỉ Done khi có bằng chứng hành vi và negative cases, không chỉ route/UI tồn tại.
- Unit: npm test (Vitest src/**/*.test.ts); DB: npm run test:db -- <tệp liên quan>, dùng stack local và helpers tạo fixture; không reset DB chung.
- Chạy hẹp theo phase; gate tổng: npm test, npm run typecheck, npm run lint, npm run build, npm run scan:bundle; DB/E2E tập liên quan auth, quiz, live, assignments, membership, admin/RAG và feature mới.
- E2E: npx playwright test <spec> --workers=2; production server 3100 hoặc PLAYWRIGHT_PORT cùng APP_BASE_URL. Không dùng lại server cũ để nhận đạt giả, không chạy dev/build chung .next. Cần test riêng no-reduced-motion bên cạnh mặc định reduce.
- Lưu bằng chứng build dưới artifacts/teacher-pilot/ và implementation-notes.md do hs-build tạo; log không nội dung đề/điểm/secret thật. Không dùng kết quả test của plan cũ như evidence mới.
- Planning chỉ kiểm tài liệu, đường dẫn, giao diện hiện hành và nguồn chính thức; chưa chạy hoặc tuyên bố test tính năng mới.

Readiness checklist đã đối chiếu: 30 AC có task/check; đường dẫn thật được phân biệt mới; FE/BE hợp đồng chung; quyền và tương thích cũ rõ; giới hạn và lỗi có evidence; không còn quyết định sản phẩm chặn build local. Khả năng thư viện xuất file, PDF extraction và model AI trên build thật là task validation có điều kiện đạt; nếu thất bại không được giảm phạm vi ngầm.

## Rủi ro và handoff

| Rủi ro | Check/handoff |
|---|---|
| Production còn phiên bản cũ, migration nền chưa áp | P9.2: so manifest/migration history đúng project, review candidate toàn bộ, không reset |
| SMTP mặc định không gửi cho nhóm thử | P1 local Mailpit; P9.2 kiểm provider/limit/template/allowlist thật trước pilot |
| Chạy nháp làm mất nội dung vì logout/tab/save race | P2 fake storage + browser 2 tab + delayed save |
| Điểm mới phá score cũ/token renewal kéo dài giờ thi | P7 migration additive và DB compatibility/race tests |
| Parser mất dòng hoặc AI bỏ câu/suy đáp án | P6/P8 strict review, provenance, không thành công khi thiếu coverage |
| Node/export/font/PDF worker lỗi serverless | P6.3 production probe; tracing/font license/file budget; P9 deployed smoke |
| Quota AI hoặc Cron không chạy, job trùng | P8 persistent checkpoint/fencing/bounded retry/preflight heartbeat; không cho nhận AI job khi chưa sẵn sàng |
| Dữ liệu đề riêng vào admin/RAG/log | P4/P5/P8 auth canary, private bucket, audit whitelist |

Migrations local dùng quy trình repo, không sửa migration lịch sử đã áp. Remote migration, SMTP/template/secret/Vault/Cron production, cấp Premium thật, deploy/push cần đúng target, tác động, recovery và authorization ở thời điểm thực thi. Plan không cấp phép các thao tác đó.

Code local đã triển khai qua P1–P8; P9 có runbook và evidence. Xem [verification.md](./verification.md) để biết gate đã đạt và phần online/teacher acceptance còn mở.
