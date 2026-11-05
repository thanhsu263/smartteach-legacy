# Phase 06 — Accessibility, responsive và release verification

## Tasks

- Rà tất cả route/component cho Orbit/CRM/template text/data/asset reference, hard-coded semantic color, focus/landmark/heading drift, reduced-motion và responsive overflow.
- Chụp before/after quan trọng 320/375/768/1280, real browser check hover/click/focus/Escape/scroll/fast pointer/reduced motion, console sạch.
- Chạy đầy đủ và ghi evidence theo `implementation-notes.md`: typecheck, lint, unit, DB local, E2E production build hai lượt liên tiếp, bundle scan.
- Phân loại từng blocker code/test/environment; không weaken/skip test để đạt xanh.

## Acceptance/verification

- Không có vi phạm axe A/AA, overflow, console error hoặc flaky known test chưa được phân loại.
- Hai lượt liên tiếp của full E2E và toàn command matrix đạt; `scan:bundle` không có dependency/template asset trái scope.
- `hs-code-review` review diff trước bất kỳ commit/push nào.
