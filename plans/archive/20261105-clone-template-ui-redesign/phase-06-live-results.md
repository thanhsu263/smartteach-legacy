# Phase 06 — Host, player và kết quả

## Overview

Hoàn thiện chu trình thứ hai và thứ ba của screen flow trên các màn thật. Chỉ
đồng bộ hierarchy, toolbar, trạng thái và data presentation; không đưa 3D/glass
vào canvas trình chiếu hoặc đổi live state machine.

## Files

- Cập nhật lớp trình bày: `src/components/live/host/*.tsx`, `src/components/live/host/host.module.css`
- Cập nhật lớp trình bày: `src/components/live/player/*.tsx`, `src/components/live/player/player.module.css`
- Cập nhật lớp trình bày: `src/components/live/results/*.tsx`, `src/components/live/results/results.module.css`
- Cập nhật: `src/app/host/page.tsx`, `src/app/host/host.module.css`
- Chỉ cập nhật wrapper khi cần: `src/app/host/layout.tsx`, `src/app/play/page.tsx`, `src/app/host/[id]/*`
- Cập nhật: `e2e/host.spec.ts`, `e2e/host-a11y.spec.ts`, `e2e/play.spec.ts`, `e2e/play-a11y.spec.ts`, `e2e/results.spec.ts`, `e2e/auto-advance.spec.ts`, `e2e/treasure.spec.ts`

## Tasks

- [ ] Host lobby/question/reveal/podium dùng hierarchy và toolbar nhất quán,
  giữ chữ lớn, PIN, QR, số người và primary action đọc được từ cuối lớp.
- [ ] Player giữ answer tiles, shape, letter và trạng thái bằng chữ; chỉ tinh
  chỉnh spacing/depth/transition cho state change. Không dùng hover-only hoặc 3D.
- [ ] Results dùng table/list/progress vocabulary từ template với sticky/context
  header có chủ đích; mobile chuyển table theo pattern hiện hữu, không ép min-width
  gây overflow và không ẩn dữ liệu quan trọng.
- [ ] SessionHistory ở `/host` và editor dùng cùng row/panel pattern, giữ load more,
  orphaned quiz label, delete confirmation và focus return.
- [ ] Auto-advance/loading/reconnect chỉ animate trạng thái; reduced motion bỏ
  transition không cần thiết nhưng vẫn báo bằng chữ và live region.
- [ ] Thêm assertion DOM/computed style rằng live canvases không perspective,
  parallax marker hoặc backdrop-filter nặng.

## Acceptance criteria

- Toàn bộ trạng thái lobby → question → reveal → final/results giữ đúng nghiệp vụ.
- Host/player/results đạt axe và không tràn ở 375px/1280px.
- Space/fullscreen/auto-advance/reconnect và score contract hiện hữu vẫn đạt.
- Không có site chrome trên live canvas, không tilt và không blur nội dung chiếu.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/host.spec.ts e2e/host-a11y.spec.ts e2e/play.spec.ts e2e/play-a11y.spec.ts e2e/results.spec.ts e2e/auto-advance.spec.ts e2e/treasure.spec.ts`
- Browser thật: projector-like 1280px, mobile 375px, fullscreen, keyboard Space/Tab và throttled reconnect.

