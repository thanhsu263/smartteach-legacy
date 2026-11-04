# Implementation notes

## Reopened implementation — 2026-11-04

The prior checklist recorded Stitch-aligned phases as complete before their
screen hierarchy had been implemented in the production components. The
approved local Stitch screens are now treated as the presentation contract;
each surface will be changed and verified before it is marked complete again.
The local HTML is reference material only: production remains Next.js App
Router with CSS Modules and real SmartTeach routes/data, never copied Stitch
HTML, Tailwind, or mock activity data.

## Production surface implementation — 2026-11-04

- Trang chủ hiện triển khai hierarchy của screen flow: hero contained, quick
  start, tool rows và vùng chuẩn bị tiếp theo, với dữ liệu/route SmartTeach
  thật thay vì số liệu giả.
- `/games`, `/tools`, `/my-classes`, `/my-quizzes`, `/host`, `/login` và 404
  cùng dùng hierarchy banner xanh, nhãn định hướng và CTA/thẻ có thứ bậc.
  Các form/danh sách đang có giữ nguyên state, RPC và xác nhận thao tác.
- `/my-quizzes/[id]` tách rõ danh sách câu (vàng) và vùng soạn (xanh); nút
  sắp xếp/xoá vẫn là `IconButton` có accessible name/tooltip. `/play` dùng
  header quiz nối form nhập PIN, không mang site chrome vào canvas học sinh.
- Các canvas host/player/kết quả tiếp tục ưu tiên chữ lớn, bề mặt gần đặc và
  hiệu năng khi trình chiếu; không ép backdrop blur hoặc animation trang vào
  lúc đổi pha live.
- Targeted evidence sau implementation: typecheck/lint; Playwright `play`
  19 passed, catalogue/headings 48 passed sau sửa contract, auth/a11y-auth
  20 passed, quiz editor 16 passed, host/results/a11y 25 passed, public axe
  30 passed. Một lần axe phát hiện `label-content-name-mismatch` tại tool
  action trên homepage; sửa thành accessible title ẩn + copy trình bày
  `aria-hidden`, rồi toàn bộ axe xanh.

## Final verification — 2026-11-04

- `npm run typecheck`, `npm run lint`, `npm test` đều đạt; unit suite: 24 file,
  285 test.
- `npm run test:db` đạt exit code 0: 8 file, 173 test; output `duplicate key`,
  `invalid_retention` và `pg_cron` là nhánh negative/fallback có chủ đích.
- Full Playwright sau các sửa cuối chạy **hai lần liên tiếp**, mỗi lần 219/219
  passed (khoảng 1.3 phút); bao phủ axe desktop/mobile, overflow, keyboard,
  reduced motion và live flows.
- `npm run scan:bundle` quét 356 tệp `.next/static` và `.next/server/app`,
  không phát hiện khoá bí mật hoặc chuỗi kết nối. Máy quét không truy cập được
  Supabase cục bộ để đối chiếu giá trị thật nên vẫn quét theo pattern.

## Route-aware chrome and accessibility tree

`usePathname()` in Next 16 needs a `Suspense` boundary during prerendering.
The boundary must never wrap page `children`: a fallback that repeats them
leaves a hidden duplicate page tree in the DOM, while a `null` fallback turns
server `notFound()` into a 200 response. The skip link and `main` stay
server-rendered in the root layout. Separate route-aware client components
decide only whether to render the header or footer after their own boundaries
resolve.

## Local verification runtime

The agent sandbox cannot bind a localhost port. Playwright must run outside
that sandbox. Interrupted Playwright processes can leave `next start` on port
3100; inspect its command line and stop only that test-owned process tree
before re-running. This is a local test-environment constraint, not a product
runtime configuration change.

## Phase 06 evidence — 2026-11-04

- Rà soát bản production cục bộ ở 1280px, 768px và 375px: homepage giữ hierarchy
  của screen flow, nav chuyển sang trigger Menu ở mobile, CTA chính vẫn là vàng,
  và không tràn ngang. Canvas `/play` tại 375px không có site chrome cạnh tranh,
  có form nhập PIN/biệt danh đọc rõ và console không có warning/error.
- `npm run typecheck`, `npm run lint` và `npm test` đạt; unit suite: 24 file,
  285 test.
- `npm run test:db -- --reporter=dot` đạt exit code 0: 8 file, 173 test. Các log
  unique constraint, `invalid_retention` và `pg_cron` là nhánh negative/fallback
  được kiểm thử, không phải failure của runner.
- Full Playwright đã chạy hai lượt liên tiếp không tạo failure artifact; lượt xác
  nhận theo session trả exit code 0 với 219 test passed (1.5 phút). Bundle scan
  quét 356 tệp build, không phát hiện secret hoặc chuỗi kết nối.
