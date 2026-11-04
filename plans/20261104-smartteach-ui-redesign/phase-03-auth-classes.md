# Phase 03 — Xác thực và không gian lớp học

## Overview

Triển khai teacher workspace restrained theo flow Lớp của tôi: roster inline,
icon action có ngữ cảnh và mobile composition, không đổi auth/RLS/class API.

## Files / areas

- src/app/login/page.tsx, src/components/login-form.*, require-user.tsx
- src/app/my-classes/**, src/components/classes-manager.*, class-editor.*,
  name-list-input.*, favorites-section.*, favorite-button.*
- src/components/breadcrumb.*, use-focus-request.ts
- Auth/class unit, DB và a11y coverage hiện có

## Tasks

- [x] 03.1 Restyle sign-in/register, validation/loading và return-to-app state
  dùng form semantics/AuthProvider hiện có.
- [x] 03.2 Áp dụng desktop split workspace và mobile stack cho ClassesManager;
  giữ limit, parse names, reload/error notices và form labels.
- [x] 03.3 Đồng bộ class detail/favorites/delete confirmation/focus return với
  component vocabulary mới.
- [x] 03.4 Xác nhận RequireUser và signed-out affordance không rò content hay
  thay authorization.

## Acceptance criteria

- Empty/loading/error/max limit/destructive confirm không chỉ phụ thuộc màu.
- Roster create/update/delete giữ API call và focus contract; delete icon vẫn
  labelled/tooltip-backed.
- Workspace desktop là list+form; mobile là ordered stack, không mất action.

## Verification

- npm run typecheck; npm run lint; npm test
- Targeted auth/classes Playwright + e2e/a11y-auth.spec.ts và relevant a11y
  cases 1280px/375px.
- npm run test:db với Supabase local, không ghi remote.
