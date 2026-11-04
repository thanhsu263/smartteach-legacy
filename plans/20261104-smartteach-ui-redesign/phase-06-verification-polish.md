# Phase 06 — Kiểm chứng, responsive và hoàn thiện

## Overview

Cross-surface visual QA và full gate. Không thêm tính năng hoặc đổi logic; chỉ
sửa defect có bằng chứng.

## Files / areas

- CSS Module/component phase 01–05 có defect được chứng minh
- e2e/** và src/**/*.test.ts chỉ khi cần evidence mới
- Không migration, .env, fixture quiz-thu-nghiem.*, generated output

## Tasks

- [x] 06.1 So sánh surface đã build với artboard Stitch tại 1280px, 768px,
  375px: hierarchy, density, CTA, Vietnamese diacritics, overflow, focus,
  empty/error/loading.
- [x] 06.2 Verify heading/landmark, contrast, touch target, no-hover flow,
  reduced-motion, reduced-transparency/no-backdrop-filter fallback.
- [x] 06.3 Chỉ thêm/điều chỉnh semantic UI assertions khi visual change có
  observable contract; không dùng flaky screenshot snapshot thay axe/a11y.
- [x] 06.4 Start local Supabase and run full suite two consecutive times; phân
  loại lỗi trước khi sửa.
- [x] 06.5 Ghi evidence vào implementation-notes.md; không commit/push.

## Acceptance criteria

- Không console error mới, axe AA regression hay overflow tại viewport e2e.
- Token/component vocabulary nhất quán; không CTA cạnh tranh, decorative glass
  trên work canvas hay animation gây click instability.
- Hai lần chạy full gate đều đạt, trừ blocker môi trường có output cụ thể.

## Verification

1. Khi Docker Desktop sẵn sàng: npm run supabase:start, rồi npm run supabase:env.
2. Chạy hai lần: npm run typecheck, npm run lint, npm test, npm run test:db,
   npm run test:e2e, npm run scan:bundle.
3. Dừng Supabase local nếu workflow đã tự khởi động và không còn cần.
