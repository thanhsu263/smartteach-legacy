# Phase 02 — Hoàn thiện game, tiện ích và màn hình hệ thống

## Overview

Hoàn thiện các chức năng đang chạy nhưng plan Figma cũ cố ý để lại, không đổi
logic game/tool/share. Đây là lát cắt presentation độc lập.

## Files / areas

- `src/app/games/**`, `src/components/game-*.tsx`, CSS Modules tương ứng.
- `src/app/tools/draw`, `groups`, `whiteboard`; `src/components/*-tool*`.
- `src/app/shared/quiz/[token]`, `src/components/quiz/shared-quiz-view*`.
- `src/app/privacy/**`, `src/app/not-found.*`, shared button/breadcrumb/empty states.
- `e2e/games.spec.ts`, `tools.spec.ts`, `privacy.spec.ts`, `a11y.spec.ts`,
  `headings.spec.ts`, `security.spec.ts`.

## Tasks

- [x] Áp frame đã duyệt cho game catalogue/detail/embed, giữ filter, favorite,
  credit, fullscreen và lỗi iframe hiện có.
- [x] Áp frame cho bốc thăm, chia nhóm, bảng trắng: ready/active/result/reset,
  long roster, invalid input, empty và fullscreen/projector context.
- [x] Hoàn thiện shared quiz preview/clone với loading, invalid/revoked token,
  signed-out/signed-in và quiz-limit error.
- [x] Đồng bộ privacy và 404 với Foundation; privacy mới chỉ mô tả behavior đã
  chạy, phần assignment/library được cập nhật cuối Phase 10.
- [x] Chuẩn hóa icon action, hover/focus/active/disabled/loading; không dùng emoji
  làm icon điều khiển và không đổi public props/business state.
- [x] Bảo đảm layout single-column/touch trên mobile, rail/shell tablet và
  projector-friendly desktop; canvas không bị nested-card hoặc overflow.
- [x] Bổ sung/điều chỉnh targeted unit/E2E chỉ cho hành vi presentation và
  accessibility bị thay đổi.

## Evidence hiện tại

- Game stage giữ tỉ lệ 16:9, `aria-busy`/status khi tải; catalogue/game/tool
  empty state nay có heading ngữ nghĩa và surface dùng token chung.
- Tool stage dùng surface đặc, không thêm blur quanh canvas; các flow bốc thăm,
  chia nhóm, countdown, whiteboard/fullscreen/touch giữ nguyên state/API.
- Privacy có mục lục với link tới đủ chín phần; 404 căn giữa ở compact state.
- `npm run typecheck`, `npm run lint` và 40 unit test catalog/utilities: đạt.
- Playwright game/tool/privacy/a11y/headings/security/shared quiz: **129/129 đạt**
  trên production build với Supabase local.
- Responsive route/overflow game và tool ở 320/375/768/1280/1440: đạt; assertion
  empty-state dùng heading semantic thay cho copy cũ.
- Visual smoke 375/768/1280: **1/1 đạt**, không lỗi console; ảnh evidence lưu trong
  `test-results/phase-02-visual-surface-*`.

## Quyết định phạm vi

- Shared quiz vẫn là route giáo viên có auth boundary ở `src/proxy.ts`; signed-out
  được chuyển sang login. Không mở preview công khai vì sẽ đổi nghiệp vụ/RLS.

## Acceptance criteria

- Từ landing/shell tới game hoặc tool chính không quá hai lần bấm.
- Mọi control dùng được bằng keyboard/touch, focus visible rõ; hover không phải
  nguồn thông tin duy nhất.
- 320/375/768/1280/1440 không tràn ngang; whiteboard/draw pointer behavior và
  redraw hiện có không regression.
- Shared quiz không lộ answer key ngoài nội dung đã cho phép và clone vẫn qua
  RPC hiện có.

## Verification

- `npm test -- src/lib/catalog.test.ts src/lib/utilities/utilities.test.ts`
- `npm run typecheck`, `npm run lint`
- Playwright targeted: games, tools, privacy, headings, public a11y/security.
- Screenshot + console check ở 375/768/1280, reduced-motion và touch/no-hover.

## Risks

- Không thay fixed test coordinates để che layout bug; test canvas phải dùng
  bounding box/tỷ lệ như convention hiện có.
- Không tăng số lớp blur/backdrop hoặc motion trang trí trên canvas lớp học.
