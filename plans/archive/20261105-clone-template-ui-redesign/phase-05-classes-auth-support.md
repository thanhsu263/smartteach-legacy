# Phase 05 — Lớp học, xác thực và bề mặt hỗ trợ

## Overview

Đồng bộ các workspace giáo viên và các surface hỗ trợ với mẫu product-first,
không biến chúng thành dashboard CRM hoặc thêm sidebar làm tăng số lần bấm.

## Files

- Cập nhật: `src/components/site-header.*`, `site-nav.*`, `site-footer.*`, `breadcrumb.*`, `app-chrome.tsx` khi chỉ cần trình bày
- Cập nhật: `src/app/my-classes/page.tsx`, `src/app/my-classes/my-classes.module.css`
- Cập nhật: `src/components/classes-manager.*`, `class-editor.*`, `favorites-section.*`, `saved-class-picker.*`
- Cập nhật: `src/app/login/page.tsx`, `src/app/login/login.module.css`, `src/components/login-form.*`
- Cập nhật: `src/app/privacy/*`, `src/app/not-found.*`
- Cập nhật: `e2e/auth.spec.ts`, `e2e/a11y-auth.spec.ts`, `e2e/home.spec.ts`, `e2e/a11y.spec.ts`, `e2e/headings.spec.ts`

## Tasks

- [ ] Giữ top navigation và route-aware chrome; chỉ tinh chỉnh material, active
  state, menu origin và mobile sheet. Không chuyển toàn app sang CRM sidebar.
- [ ] Đưa ClassesManager về workspace create/list rõ, ClassEditor thành master
  list + add/edit panel thích ứng; giữ nguyên API, inline rename/delete và focus.
- [ ] Đồng bộ Favorites và SavedClassPicker với row/toolbar vocabulary, tránh
  nested cards và giữ empty/loading/error states có hướng dẫn.
- [ ] Login dùng một task sheet duy nhất, mode sign-in/sign-up chuyển trạng thái
  có thông báo và focus rõ; không đổi next redirect hoặc auth behavior.
- [ ] Privacy giữ measure 65–75ch và hierarchy đọc dài; 404 dùng cùng CTA/panel
  nhưng không thêm animation trình diễn.
- [ ] Menu mobile đóng bằng Esc/click route và trả focus; focus trap chỉ áp dụng
  nếu chuyển menu thành modal sheet thật, không làm background vẫn tabbable.
- [ ] Chạy keyboard traversal, 200% zoom, axe và overflow cho authenticated,
  unauthenticated, empty, error, confirmation và long-name states.

## Acceptance criteria

- Header/footer không xuất hiện trên `/play` và `/host/[id]` như contract hiện tại.
- Lớp học giữ đầy đủ tạo/sửa/xoá/dùng lại, confirmation và focus return.
- Auth redirect, next sanitization và ownership isolation không đổi.
- Privacy/404/login/classes cùng hệ visual nhưng không lạm dụng card hoặc blur.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/auth.spec.ts e2e/a11y-auth.spec.ts e2e/home.spec.ts e2e/a11y.spec.ts e2e/headings.spec.ts`
- Browser thật: mobile menu, keyboard-only auth/classes, zoom 200% và console.

