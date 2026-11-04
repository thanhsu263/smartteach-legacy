# Phase 01 — Handoff thiết kế và nền tảng chrome

## Overview

Chốt reference còn thiếu và dựng vocabulary token/chrome chung trước khi thay
đổi surface. Không thay đổi nghiệp vụ.

## Files / areas

- .stitch/metadata.json và project Stitch (reference only)
- src/app/layout.tsx, src/app/globals.css
- src/styles/tokens.css, src/styles/glass.css
- src/components/site-header.*, site-nav.*, site-footer.*, button.*, icons.tsx,
  ambient-background.*
- Có thể thêm presentation-only route-aware chrome component trong src/components
- e2e/home.spec.ts, e2e/a11y.spec.ts, e2e/apple-interface.spec.ts

## Tasks

- [ ] 01.1 Hoàn thiện artboard desktop/mobile cho login, tools/games, quiz
  library/editor/import, shared quiz, results/history và live state còn thiếu.
  Cập nhật .stitch/metadata.json; cần xác nhận external write khi build.
- [x] 01.2 Đối chiếu DESIGN.md với globals.css/tokens.css; đưa presentation
  values lặp lại về token vai trò, giữ brand color và semantic state tokens.
- [x] 01.3 Refine header/nav/footer/skip link: current location có nhãn +
  indicator, menu mobile từ trigger gốc, Esc và focus return giữ nguyên.
- [x] 01.4 Tách chrome khỏi live canvas bằng client pathname-aware presentation
  wrapper trong một root layout. Provider và main#main của route thường giữ
  nguyên, không dùng nhiều root layouts.
- [x] 01.5 Chuẩn hoá hover/focus/active/disabled/loading cho Button,
  IconButton, input, row, chip, panel, sheet và skeleton; giữ reduced motion,
  no-blur fallback, pointer media queries và focus ring.

## Acceptance criteria

- Không rải color/easing/shadow khi token vai trò đã có.
- Nav accessible, Escape, aria-expanded/current và skip link vẫn hoạt động;
  desktop/mobile không tràn.
- Host/player/results không có site chrome cạnh tranh, route thường giữ
  provider/footer/main landmark.

## Verification

- npm run typecheck; npm run lint; npm test
- npm run test:e2e -- e2e/home.spec.ts e2e/a11y.spec.ts e2e/apple-interface.spec.ts
- Browser review desktop/mobile, keyboard Tab + Esc, reduced motion.
