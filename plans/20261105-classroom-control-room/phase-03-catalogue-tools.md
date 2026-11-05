# Phase 03 — Catalogue game, tool và stage

## Files/areas

- `src/app/games/**`, `src/components/game-{browser,card,embed}.*`
- `src/app/tools/**`, `tool-{card,page,stage}.*`, countdown/draw/groups/whiteboard components
- `e2e/games.spec.ts`, `tools.spec.ts`, public axe/overflow tests

## Tasks

- Thiết kế catalogue theo mục tiêu dạy học và hành động mở nhanh; filter/search/list/detail dựa trên logic hiện hữu, không thêm fake data/state.
- Tạo card/row density có phân cấp, hover/focus/active rõ; tránh grid lặp đồng dạng và side stripe.
- Cập nhật tool page/stage: controls nhất quán, empty/loading/error, responsive; tool stage/whiteboard chỉ motion phản hồi nghiệp vụ, không signature 3D.
- Đồng bộ game embed/loading/timeout/open-new-tab states với app shell mới.

## Acceptance/verification

- Các route game/tool vẫn mở trong tối đa hai click, keyboard/touch/overflow/a11y giữ nguyên hoặc tốt hơn.
- `games.spec.ts`, `tools.spec.ts`, route public axe checks đạt; 375/768/1280 screenshot review.
