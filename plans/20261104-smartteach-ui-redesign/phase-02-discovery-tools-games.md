# Phase 02 — Khám phá công cụ và game

## Overview

Đưa home, kho công cụ và kho game về flow mở hoạt động nhanh đã duyệt, giữ
nguyên search/filter/embed/fullscreen.

## Files / areas

- src/app/page.tsx, src/app/games/**, src/app/tools/**, src/app/privacy/page.tsx
- src/components/classroom-preview.*, game-browser.*, game-card.*, game-embed.*
- src/components/tool-card.*, tool-page.*, tool-stage.*, countdown-tool.*,
  groups-tool.*, draw-tool.*, whiteboard-tool.*, saved-class-picker.*
- e2e/home.spec.ts, e2e/games.spec.ts, e2e/tools.spec.ts, e2e/a11y.spec.ts

## Tasks

- [x] 02.1 Ánh xạ home hero, quick start, tool rows và tiếp tục công việc theo
  approved flow, chỉ dùng dữ liệu/link hiện có.
- [x] 02.2 Chuyển catalog tools/games sang search/filter/list scanning-friendly
  với empty/error/loading state hiện có, không che filter trên mobile.
- [x] 02.3 Refine tool/game stage và controls quanh canvas/embed; fullscreen,
  loading/timeout và behavior timer/draw/groups/whiteboard không đổi.
- [x] 02.4 Thu gọn copy mobile không bỏ action chính; links tự mô tả, không
  dựa hover.

## Acceptance criteria

- Home đến tool/game chính vẫn trong tối đa hai click.
- Search/filter/game load/open-new-tab và utility behavior không đổi.
- Tool/game 375px không scroll ngang; touch/no-hover dùng được.

## Verification

- npm run typecheck; npm run lint; npm test
- npm run test:e2e -- e2e/home.spec.ts e2e/games.spec.ts e2e/tools.spec.ts e2e/a11y.spec.ts
- Axe và browser screenshots tại 1280px/375px.
