# Phase 01 — Nền tảng thị giác và interaction contract

## Overview

Chuẩn hoá token và giới hạn chuyển động trước khi tạo surface mới. Phase này
giải quyết xung đột giữa brief mới (parallax riêng cho Quiz Sheets) với
`DESIGN.md` và test hiện đang cấm tilt toàn cục.

## Files

- Cập nhật: `DESIGN.md`
- Cập nhật: `src/styles/tokens.css`, `src/styles/glass.css`, `src/app/globals.css`
- Có thể cập nhật nếu primitive cần thêm vai trò: `src/components/button.tsx`, `src/components/button.module.css`, `src/components/icons.tsx`
- Đối chiếu contract hiện hữu: `e2e/apple-interface.spec.ts`; assertion cho Quiz Sheets được cập nhật ở Phase 02 khi component tồn tại.
- Tạo khi bắt đầu build: `implementation-notes.md`

## Tasks

- [ ] Chụp baseline trước thay đổi ở 375px, 768px và 1280px cho `/`,
  `/my-quizzes`, một editor có dữ liệu, `/games`, `/tools`, `/play` và một
  trạng thái host/results; ghi đường dẫn và nhận xét vào implementation notes.
- [ ] Bổ sung token semantic cho hero field, paper sheet, depth stack,
  perspective, grain, tab indicator và motion hero. Mọi màu vẫn ánh xạ từ
  xanh dương–vàng hiện có; shadow/easing không được hard-code lặp trong module.
- [ ] Giữ motion product ở 100–260ms; chỉ signature transition của Quiz Sheets
  được phép dài hơn và vẫn không auto-loop. Không dùng bounce/elastic.
- [ ] Cập nhật `DESIGN.md`: cho phép parallax/tilt giới hạn trong landing Quiz
  Sheets trên fine pointer; tiếp tục cấm magnetic, cursor effect toàn trang,
  scroll choreography và tilt trên task/live canvas.
- [ ] Giữ global surface gần đặc và blur có mục đích. Thêm primitive dùng chung
  chỉ khi ít nhất hai surface thực sự dùng; style đặc thù Quiz Sheets nằm trong
  CSS Module của component.
- [ ] Ghi rõ test contract cần thay ở Phase 02: không animation vô hạn; không
  `data-magnetic`; parallax chỉ tồn tại trong Quiz Sheets; host, player, game
  và tool stage không có marker/transform 3D. Phase này chưa nới assertion khi
  component được phép chưa tồn tại.

## Acceptance criteria

- Token mới có vai trò rõ và không tạo màu thương hiệu thứ ba hoặc CTA vàng thứ hai.
- `DESIGN.md`, CSS và E2E cùng mô tả một contract, không còn mâu thuẫn “tilt toàn cục”.
- Không thay `package.json`, lockfile, route, API hoặc `src/lib`.
- `npm run typecheck`, `npm run lint` và contract `e2e/apple-interface.spec.ts`
  hiện hữu vẫn đạt sau thay đổi token/docs của phase này.

## Risks

- Không đưa style 3D chuyên biệt vào `[data-glass]`; nếu làm vậy mọi button/card
  có thể bị ảnh hưởng và phá click stability.
- Không cập nhật test theo cách chỉ đổi selector để “cho xanh”; assertion phải
  chứng minh giới hạn parallax và reduced motion khi được thay ở Phase 02.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/apple-interface.spec.ts`

