# Phase 05 — Host, player và kết quả

## Files/areas

- `src/app/host/**`, `components/live/host/**`, `components/live/results/**`
- `src/app/play/page.tsx`, `components/live/player/**`, `shared/quiz/**`
- `e2e/host*.spec.ts`, `play*.spec.ts`, `live.spec.ts`, `results.spec.ts`, auto-advance/treasure tests

## Tasks

- Áp dụng language mới cho lobby/question/reveal/leaderboard/podium/results mà vẫn tối ưu chiếu bảng: chữ lớn, surface đặc, status bằng chữ/hình/màu, control dễ thấy.
- Player giữ một task/viewport, answer tiles và streak/countdown rõ trên touch; host/result hierarchy đồng nhất nhưng không dashboard hoá.
- Cập nhật shared quiz/read-only và session history surfaces theo workspace vocabulary.
- Cấm 3D tilt, pointer follow, heavy blur, decorative scroll animation trên mọi live/game canvas.

## Acceptance/verification

- Existing live/host/player/result/realtime/auto-advance contracts đạt; keyboard, focus, AA và mobile overflow được xác minh.
- DOM/computed-style test chứng minh live surfaces không nhận signature motion marker/filter bị cấm.
