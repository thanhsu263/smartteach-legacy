# Phase 01 — Đối soát baseline và triển khai Foundation

## Mục tiêu

Tạo một lớp Foundation duy nhất từ Figma, ngừng dùng Stitch làm nguồn quyết định
và dựng primitive đủ state trước khi sửa từng màn hình.

## Công việc

1. Chụp baseline và phân loại thay đổi hiện có:
   - đối chiếu `git diff --cached`, `git diff` và `HEAD` cho mọi file sẽ chạm;
   - xác định phần staged nào thuộc plan Stitch cũ, phần nào thuộc landing Figma;
   - không reset worktree, không sửa `tests/fixtures/quiz-thu-nghiem.csv/.xlsx`.
2. Đọc lại `AGENTS.md` và guide Next.js 16 về layouts/pages, Server/Client
   Components, CSS, font và Playwright trước khi code.
3. Gọi Figma `get_design_context` cho `27:17075` và từng component cần dùng;
   lưu node mapping trong `implementation-notes.md`.
4. Đồng bộ `DESIGN.md`, `src/app/globals.css` và `src/styles/tokens.css` với
   semantic roles của Foundations:
   - màu, text, border, status, spacing 4–64, radius 8/12/16;
   - type roles Display/Heading 1/Heading 2/Heading 3/Title/Body/Label/Caption;
   - focus ring hai lớp, target tối thiểu 44px, motion 100–260ms;
   - compatibility alias cho landing/live/unmigrated pages, không để hai nguồn màu.
5. Thay lớp shared interaction hiện tại bằng Foundation styles (có thể giữ tên
   file tạm thời để tránh big-bang), bao phủ:
   - Button, Icon Button, Chip, Tabs;
   - Input, Textarea, Select, Search;
   - Card, Tooltip, Modal, Drawer, Toast, Empty State, Skeleton, Progress;
   - Default/Hover/Focus/Pressed/Disabled/Loading/Error/Complete theo node có sẵn.
6. Cập nhật `Button`, `IconButton`, icon set và CSS Modules dùng chung. Không thêm
   dependency icon; dùng SVG component nội bộ với `aria-hidden` đúng chỗ.
7. Bổ sung/đổi tên test token/contrast/component-state để khóa giá trị Figma,
   min target, focus và reduced-motion.

## File dự kiến

- `DESIGN.md`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/styles/tokens.css`
- `src/styles/glass.css` hoặc file Foundation thay thế
- `src/styles/contrast.test.ts`
- `src/styles/glass.test.ts` hoặc test Foundation thay thế
- `src/components/button.tsx`
- `src/components/button.module.css`
- `src/components/icons.tsx`
- primitive/modal/drawer/toast mới nếu cần, đặt trong `src/components/ui/`

## Acceptance

- Giá trị semantic khớp Figma và `DESIGN.md`; đổi role chỉ cần sửa một nơi.
- Mọi primitive có state áp dụng được bằng keyboard/touch, không phụ thuộc hover.
- Không có Tailwind, URL asset Figma tạm hoặc import từ `cloneTemplate`.
- Landing tại `/` không đổi hierarchy/nội dung và vẫn đạt test hiện có.
- `npm run typecheck`, `npm run lint`, `npm test` đạt.

## Evidence

- Unit tests token/contrast/state.
- Screenshot trang specimen cục bộ hoặc Story harness ở 375/1280px (không thêm
  route production chỉ để demo).
- `rg -n "stitch|cloneTemplate|control-room" src DESIGN.md` không còn reference
  có quyền quyết định trong code mới; reference tương thích nếu còn phải được ghi chú.
