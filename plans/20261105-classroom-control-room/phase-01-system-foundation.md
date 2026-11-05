# Phase 01 — System foundation và motion contract

## Files/areas

- `DESIGN.md`, `src/app/globals.css`, `src/styles/tokens.css`, `src/styles/glass.css`
- `src/components/button.*`, `icons.tsx`, ambient/app chrome primitives khi cần
- `e2e/apple-interface.spec.ts`, contrast/unit contracts liên quan

## Tasks

- Thay visual contract cũ bằng token semantic Classroom Control Room: indigo/cobalt primary, CTA vàng duy nhất, neutral lạnh, elevated/surface, focus/selected và success/warn/error/info/data roles.
- Chuẩn hoá typography, spacing, elevation, controls, list rows, tabs, status/chip, loading/empty/error primitives qua CSS Modules; không mang glass/3D vào mọi card.
- Tạo utility client tối thiểu cho scoped pointer inertia và observer reveal; typed cleanup, no global pointer listener, no React frame state, reduced-motion/touch/visibility fallback.
- Thay contract Quiz Sheets tạm thời bằng ranh giới signature mới; test không cho marker 3D trên host/player/game/tool stage/whiteboard.
- Cập nhật DESIGN.md để phản ánh direction mới và loại bỏ mọi ngoại lệ của plan đã superseded.

## Acceptance/verification

- Token không có palette/brand Orbit và không hard-code role mới rải trong module.
- `npm run typecheck`, `npm run lint`, targeted Apple/reduced-motion/contrast tests đạt.
- Test DOM xác minh không có infinite auto-loop, global pointer marker hoặc blur/3D trên live/tool canvas.
