# Implementation notes

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
