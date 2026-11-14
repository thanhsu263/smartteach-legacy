# Phase 05 — Kho tiện ích và đồng hồ

## Mục tiêu

Triển khai hai bề mặt tiện ích đã có frame Figma và giữ các tool chưa có frame ở
trạng thái hoạt động, accessible, không bị ép theo một thiết kế suy đoán.

## Công việc

1. Lấy design context cho `45:3235`, `45:3421`, `45:5838`, `45:5998`,
   `45:6170`, `45:6342`.
2. `/tools`:
   - desktop shell và mobile top bar;
   - search/filter cục bộ chỉ từ `src/data/tools.ts`;
   - card cho Countdown, Groups, Draw, Whiteboard với title/description thật;
   - không tạo “Dùng gần đây” bằng dữ liệu giả hoặc local persistence chưa được duyệt;
   - empty/no-result state bằng Foundation.
3. `/tools/countdown`:
   - ready/running/last-10-seconds/finished theo bốn frame;
   - giữ reducer, clock interval, audio opt-in, presets, custom input, reset/pause,
     fullscreen và validation hiện tại;
   - trạng thái nguy cấp/finished có text/icon bên cạnh màu; không rung/flash mạnh.
4. `/tools/draw`, `/tools/groups`, `/tools/whiteboard`:
   - chỉ nhận shell, token, button/input/icon và ToolStage chung;
   - không tái bố cục sâu cho tới khi có frame Figma;
   - canvas/fullscreen và touch interaction không nhận blur/transform decorative.
5. `/games` và `/games/[id]` chỉ nhận shell/compatibility token nếu cần; không
   tuyên bố hoàn tất theo Figma.
6. Cập nhật tools e2e/a11y/overflow cho catalog và bốn trạng thái timer.

## File dự kiến

- `src/app/tools/page.tsx`
- `src/app/tools/tools.module.css`
- `src/components/tool-card.tsx` / `.module.css`
- `src/components/tool-page.tsx` / `.module.css`
- `src/components/tool-stage.tsx` / `.module.css`
- `src/components/countdown-tool.tsx` / `.module.css`
- compatibility changes có kiểm soát ở groups/draw/whiteboard/game styles
- `e2e/tools.spec.ts`, `e2e/a11y.spec.ts`, overflow tests

## Acceptance

- Catalog khớp hierarchy Figma ở 1440/375 và chỉ hiển thị dữ liệu thật.
- Countdown chuyển đúng bốn trạng thái, điều khiển bàn phím và fullscreen không đổi.
- Không có timer animation gây flaky click; reduced-motion không mất thông tin.
- Các tool/game chưa có frame vẫn chạy và test hiện hữu không thoái lui.
- Targeted tools/a11y tests đạt.

## Evidence

- Screenshot catalog desktop/mobile và countdown ready/running/last10/finished.
- E2E timer bằng fake clock, fullscreen, draw/groups/whiteboard regression.
