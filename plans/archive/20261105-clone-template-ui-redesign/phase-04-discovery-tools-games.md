# Phase 04 — Kho game, tiện ích và tool stage

## Overview

Đưa ngôn ngữ toolbar, window/panel và list của template vào các surface khám
phá, nhưng giữ game/canvas công cụ là vùng thao tác đặc, ổn định khi chiếu.

## Files

- Cập nhật: `src/app/games/page.tsx`, `src/app/games/games.module.css`
- Cập nhật: `src/components/game-browser.*`, `game-card.*`, `game-embed.*`, `favorite-button.*`
- Cập nhật: `src/app/tools/page.tsx`, `src/app/tools/tools.module.css`
- Cập nhật: `src/components/tool-card.*`, `tool-page.*`, `tool-stage.*`, `saved-class-picker.*`, `name-list-input.*`
- Cập nhật có chọn lọc lớp trình bày: `countdown-tool.module.css`, `draw-tool.module.css`, `groups-tool.module.css`, `whiteboard-tool.module.css`
- Cập nhật: `e2e/games.spec.ts`, `e2e/tools.spec.ts`, `e2e/a11y.spec.ts`, `e2e/apple-interface.spec.ts`

## Tasks

- [ ] Biến filter game thành toolbar thích ứng: search là control chính, môn/lớp
  là filter phụ, count/status đứng đúng ngữ cảnh. Không đổi `filterGames`.
- [ ] Dùng featured/list hierarchy thay vì lưới card đồng dạng vô tận; card vẫn
  giữ route, favorite và metadata thật. Empty/filter states chỉ rõ bước tiếp theo.
- [ ] Kho công cụ dùng một featured tool và danh sách/row cho phần còn lại;
  không thêm fake metrics hoặc nội dung mẫu ngoài dữ liệu `src/data/tools`.
- [ ] ToolPage/ToolStage nhận window vocabulary từ template ở chrome và toolbar,
  nhưng body đếm giờ/bốc thăm/chia nhóm/bảng trắng dùng nền đặc, không blur/tilt.
- [ ] Giữ fullscreen, touch drawing, saved-class picker, labels và aria-pressed
  hiện tại. Hover không phải cách duy nhất để khám phá action.
- [ ] Kiểm viewport 320/375/768/1280, touch + pointer, fullscreen và focus order;
  axe ở filter empty, countdown error/end, draw exhausted, groups error/result và whiteboard controls.

## Acceptance criteria

- Từ landing tới từng tool vẫn một lần bấm; game nổi bật vẫn mở tối đa hai lần bấm.
- Filter/search không đổi kết quả, reset hay hỗ trợ tìm không dấu.
- Tool canvas/game iframe không có backdrop blur, perspective hoặc parallax.
- Fullscreen và touch drawing tiếp tục hoạt động; không tràn ngang.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/games.spec.ts e2e/tools.spec.ts e2e/a11y.spec.ts e2e/apple-interface.spec.ts`
- Browser thật: search/filter, favorite feedback, fullscreen, touch emulation và console.

