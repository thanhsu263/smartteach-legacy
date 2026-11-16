Mode: local
Status: implemented-local
Readiness: code local đã triển khai và kiểm chứng; sẵn sàng review, dịch vụ thật cần cấu hình/nghiệm thu riêng

# Quản trị toàn hệ thống và chatbot RAG

Nguồn quyết định: [Decision Brief đã chốt](../reports/brainstorm-2026-11-15-admin-rag-chatbot.md), gồm bổ sung người dùng chọn Supabase Cron → Next.js theo lô và giới hạn kho nhỏ. Ngày khảo sát: 2026-11-15. Không có `--gh`: không tạo issue, push hoặc deploy.

## Kết quả cần đạt

1. Khu vực `/admin` gồm 9 nhóm: Tổng quan; Tài khoản/phân quyền; AI/API; Tài liệu RAG; Duyệt học liệu; Danh mục game; Thành viên/đơn; Cấu hình website; Nhật ký/vận hành.
2. Giáo viên đăng nhập dùng popup “Hỏi SmartTeach” ở góc phải dưới để hỏi cách sử dụng và tìm học liệu. Nguồn: tài liệu quản trị PDF/DOCX có chữ và học liệu approved. Câu trả lời có nguồn kiểm chứng, liên kết thật.
3. Gemini Free Tier được cấu hình qua admin, key được mã hóa, dự phòng theo lỗi/nhóm quota; vector và văn bản/nguồn lưu Supabase. Không tự bật billing, tạo project hoặc tăng quota bằng vòng đổi key.
4. Chat riêng theo tài khoản, tự xóa sau 30 ngày và xóa ngay được. Admin không có quyền đọc nội dung riêng của giáo viên; bản học liệu tự gửi vào hàng duyệt là nội dung được chia sẻ cho quy trình duyệt, không mở quyền đọc quiz gốc.
5. Job nạp tài liệu chạy tiếp khi đóng tab: Postgres giữ queue/checkpoint, Supabase Cron gọi Next.js theo lô. Cleanup chat dùng Cron SQL, không phụ thuộc traffic.

## Ngoài phạm vi

OCR/ảnh, giáo viên tự tải tài liệu RAG, gia sư tổng quát, chatbot sửa dữ liệu/thực hiện giao dịch, admin đọc lớp/quiz riêng/kết quả/chat, đổi giá gói động, bộ dựng trang/biên tập scene 3D. payOS giữ hoãn kích hoạt; không thêm khóa payOS hoặc giao dịch thử thật. Không thay PRODUCT.md/DESIGN.md trong giai đoạn lập kế hoạch.

## Cơ sở từ repo

| Bằng chứng hiện có | Hệ quả đối với thực thi |
|---|---|
| `package.json`: Next 16.4.2, React 19.3, Supabase JS/SSR, Node 24 theo README; chưa có Gemini/PDF/DOCX SDK | Thêm phụ thuộc server có kiểm tra lockfile và build; không tạo app/framework thứ hai |
| `next.config.ts`: `cacheComponents: true` | Đọc auth/DB trong ranh giới Suspense; không thêm `runtime` export không tương thích. Kiểm metadata/404 và cache invalidation trên bản production |
| `src/proxy.ts`, `src/components/require-user.tsx`, `src/lib/auth/protected-paths.ts` | Mở rộng tiện ích auth nhưng quyền thật ở server/RPC/RLS; JWT cũ không được giữ quyền admin sau thu hồi |
| Các migration lớp/quiz/live/assignments và membership dùng RLS lẫn SECURITY DEFINER; `FavoritesProvider` đọc/ghi trực tiếp | Account lock phải chặn cả Data API/RPC hiện có, không chỉ page/API mới |
| `quiz_publications` + `publication_reports`; `moderate_quiz_publication` chỉ service role | Tạo facade quản trị DTO giới hạn, không cho admin truy vấn bảng private của giáo viên |
| `src/data/games.ts`, `src/config/site.ts`; `games/[id]/page.tsx` dựng static params/metadata từ danh mục tĩnh | Chuyển game/config có migration seed, runtime lookup và test game mới/ẩn/404. Không fallback hồi sinh game đã bị ẩn |
| `membership_entitlements/orders`, `settle_membership_payment`, `getBillingAdmin()` | Tách server admin client dùng chung đúng phạm vi, giữ settle/idempotency và giá cũ; cấp Premium thủ công có audit riêng |
| Supabase Postgres 17, Storage bật (50 MiB cấu hình local), `edge_runtime.enabled=false`; chưa có functions/worker/queue | Dùng private Storage + job DB + Next.js worker endpoint; không bật Edge Runtime |
| Retention quiz/assignments có Cron tùy chọn và fallback theo traffic | Không sao chép fallback-only cho chat 30 ngày; cần lịch SQL thật và probe không traffic |
| Vitest `src/**/*.test.ts`, DB `tests/db/**/*.test.ts`, Playwright `e2e/` + axe | Unit cho logic, Postgres thật cho quyền/đồng thời/retention, production browser cho hành vi UI |

Không reset hoặc gom vào kế hoạch các thay đổi hero/menu/payOS đang có trong working tree. Plan membership hiện có là nền code local, không là phụ thuộc đăng ký payOS thật.

## Hợp đồng chung

Xem [contracts.md](./contracts.md): quyền/DTO, route, schema, lifecycle job, key failover, giới hạn tài nguyên, retention và các bất biến. Các phase tham chiếu hợp đồng này; nếu build cần đổi quyết định sản phẩm/quyền/hạ tầng thì quay lại brainstorm, không sửa ngầm.

## Phases và phụ thuộc

| Phase | Kết quả nghiệm thu riêng | Phụ thuộc | Trạng thái |
|---|---|---|---|
| 1 | [Admin, tài khoản và ranh giới quyền](./phase-01-admin-access.md) | — | Verified local |
| 2 | [Duyệt học liệu, game và cấu hình website](./phase-02-content-management.md) | 1 | Verified local |
| 3 | [Thành viên, tổng quan và audit vận hành](./phase-03-membership-operations.md) | 1; 2 cho dashboard đầy đủ | Verified local |
| 4 | [Gemini, key mã hóa và hạn mức](./phase-04-ai-configuration.md) | 1 | Verified local |
| 5 | [Kho tài liệu vector và tác vụ nền](./phase-05-rag-ingestion.md) | 1, 2, 4 | Verified local |
| 6 | [Chat RAG, nguồn và lịch sử 30 ngày](./phase-06-rag-chat.md) | 4, 5 | Verified local |
| 7 | [Popup giáo viên và trải nghiệm nguồn](./phase-07-chat-popup.md) | 6; 2 cho cờ cấu hình | Verified local |
| 8 | [Nghiệm thu, vận hành và handoff](./phase-08-verification-rollout.md) | 1–7 | Local verified; live pending |

Thứ tự mặc định 1→2→3→4→5→6→7→8. Quan hệ trên là phụ thuộc thật, không yêu cầu chia agent/issue/commit tương ứng. Không tự chạy đa agent khi chưa có chỉ dẫn cho phép. Phase không hoàn tất chỉ vì route/UI đã có; phải có evidence trong từng task.

## Bao phủ 9 nhóm quản trị

| Nhóm | Task sở hữu |
|---|---|
| Tổng quan | P3.2 |
| Tài khoản/phân quyền | P1.1–P1.4 |
| AI/API | P4.1–P4.3 |
| Tài liệu RAG | P5.1–P5.4 |
| Duyệt học liệu | P2.1 |
| Danh mục game | P2.2 |
| Thành viên/đơn | P3.1 |
| Cấu hình website | P2.3 |
| Nhật ký/vận hành | P1.2, P3.2, P5.3, P8.3 |

## Ánh xạ tiêu chí của brief

| AC brief | Task/check quyết định kết quả |
|---|---|
| 1. Popup/auth/mobile/a11y | P1.3, P6.1, P7.1–P7.3; API 401/403 + Playwright 375/768/1280, keyboard, axe, reduced motion/fullscreen |
| 2. Trả lời grounded/không lộ private | P5.4, P6.1/P6.3, P7.2; fixture tiếng Việt, nguồn giả, prompt injection, withdraw giữa request, kiểm canary private |
| 3. Nạp/cập nhật/gỡ tài liệu | P5.1–P5.3; PDF/DOCX text, giới hạn, crash/reclaim, version switch, mất tab, hai worker |
| 4. Approved-only/thu hồi | P2.1, P5.4, P6.2; approved→hidden/withdraw/update, stale vector và citation không mở được |
| 5. Admin/teacher/private/key | P1.*, P4.1, P6.2; auth matrix, direct Data API, SQL grants, canary response/DOM/log/bundle |
| 6. Failover quota có giới hạn | P4.2–P4.3, P5.2, P6.1; 401/403/429/timeout, cùng project, tất cả key cạn, không fallback embedding khác model |
| 7. History owner/30 ngày/delete | P6.2; DB hai teacher + admin, fake clock, in-flight delete/logout, SQL Cron không traffic |
| 8. Audit không có secret/content | P1.2 + mutation của P2/P3/P4/P5, P8.2; audit atomic/idempotent, whitelist payload, canary |
| 9. Tương thích/payOS hoãn | P2.2/P2.3, P3.1, P8.1; regression game/new ID/404, tools, quiz, assignments/library/membership; không gọi payOS thật |

## Kiểm chứng và evidence

Lệnh hiện có: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run scan:bundle`; DB `npx vitest run --config vitest.db.config.mts <tệp liên quan>`; browser `npx playwright test <spec liên quan> --workers=2`. `playwright.config.ts` mặc định port 3100, build + start production; đặt `PLAYWRIGHT_PORT` và `APP_BASE_URL` cùng origin nếu dùng cổng riêng, không đụng `.next` của server dev đang chạy.

Chạy probe hẹp mỗi phase, cuối plan chạy unit đầy đủ và regression đúng vùng ảnh hưởng. Không sửa test đúng để che lỗi. Tests nhà cung cấp dùng gateway fake có kiểm soát; kiểm thử chữ ký payOS hiện có vẫn giữ, không tạo giao dịch tiền thật. Live Gemini smoke chỉ chạy với cấu hình của chủ dự án, không cần để unit/DB/E2E đi qua.

Evidence build mới đặt dưới `artifacts/admin-rag/` (log chỉ loại lỗi/ID, ảnh UI không có key hoặc nội dung riêng thật). Bằng chứng triển khai được ghi tại implementation-notes.md; kết quả plan trước đây không được coi là test evidence.

## Rủi ro và điều kiện đưa vào vận hành thật

| Rủi ro | Check/handoff |
|---|---|
| Cron/pg_net/Vault không bật hoặc Vercel protection chặn worker | P5.3 + P8.3 kiểm một job từ Cron thật, run heartbeat; không bật upload/chat nếu chưa đủ |
| PDF.js cần tài nguyên Node/native/worker khi build serverless | P5.1 compatibility probe Node 24 + production build, text-only, timeout/memory. Không chuyển sang OCR/worker ngoài đã chọn |
| Free Gemini đổi model/quota/điều khoản | P4 danh sách model Free Tier kiểm theo nguồn chính thức; admin kiểm kết nối; lỗi rõ, không tự tính tiền |
| Corpus private lọt prompt hoặc admin | P1 grants/RPC audit + P6 canary + P8 scan logs; không dùng service client trong thành phần client |
| Retry tốn quota hoặc job cũ publish sau gỡ | Lease/fencing + unique batch + kiểm generation ở finalize; P4/P5 race probes |
| Thay config/game làm sai cache/404 | P2 read-through versioned config, seeded stable IDs, metadata/page cùng nguồn, P8 production HTTP checks |
| Role khóa nhưng JWT/RPC cũ còn dùng được | P1 account-state guard ở RLS và SECURITY DEFINER, test token đã phát trước khi khóa |
| Chạy xóa phụ thuộc traffic/backup giữ nội dung | P6 filter expiry + Cron SQL, P8 restore/purge runbook; nêu giới hạn backup/provider trung thực |

Không thực hiện trong plan: áp migration production, cấp admin production, bật extension/lịch Cron bên ngoài, ghi Vault/Vercel secrets, deploy hoặc bật dịch vụ thật. `hs-build` chuẩn bị thay đổi local và evidence; các thao tác ngoài máy phải có target, tác động, recovery và authorization phù hợp `hs-devops` lúc thực thi. Không yêu cầu xác nhận lại các sửa local đã được build task cho phép.

## Readiness review / điểm bắt đầu

- Phạm vi, quyền riêng tư, nguồn, provider Free Tier, history và hạ tầng background đã được người dùng chốt; không còn quyết định sản phẩm chờ trả lời.
- Các đường dẫn hiện có ở bảng cơ sở đã khảo sát; đường dẫn đề xuất trong phase ghi rõ là **mới**. Hợp đồng FE/BE, invariants, hạn mức, verification và AC map có trong plan.
- Dependency còn thiếu để chạy dịch vụ thật: API key Gemini/project quota, khóa mã hóa và Cron secret, cấu hình extensions/Storage/scheduler/hosting đúng môi trường; được xử lý bằng task preflight/runbook, không là lý do để tạo thành công giả.
- hs-build đã triển khai và kiểm chứng local. Xem [ghi chú thực thi](./implementation-notes.md); phần live còn UNVERIFIED được liệt kê riêng.

## Nguồn kỹ thuật đã đối chiếu

- [Gemini SDK chính thức](https://ai.google.dev/gemini-api/docs/libraries), [embeddings](https://ai.google.dev/gemini-api/docs/embeddings), [quota theo project](https://ai.google.dev/gemini-api/docs/rate-limits), [điều khoản Free Tier](https://ai.google.dev/gemini-api/terms).
- [Supabase Cron SQL/HTTP](https://supabase.com/docs/guides/cron), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [RAG + RLS](https://supabase.com/docs/guides/ai/rag-with-permissions), [vector indexes](https://supabase.com/docs/guides/ai/vector-indexes), [resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads).
- [Vercel Function limits](https://vercel.com/docs/functions/limitations): kiểm tra môi trường thật thay vì đóng băng thông số plan/tier trong code.
- Local Next docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` và `02-route-segment-config/{runtime,maxDuration}.md`.
