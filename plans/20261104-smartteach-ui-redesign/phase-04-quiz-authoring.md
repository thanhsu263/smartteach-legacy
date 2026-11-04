# Phase 04 — Kho và trình soạn quiz

## Overview

Áp dụng flow teacher-facing cho danh sách, tạo/sửa/import/chia sẻ quiz; editor
ưu tiên pattern chuẩn, dirty state và icon control mà e2e bảo vệ.

## Files / areas

- src/app/my-quizzes/**
- src/components/quiz/quizzes-manager.*, quiz-editor.*, question-form.*,
  quiz-problems.*, import-quiz.*, share-panel.*, shared-quiz-view.*
- src/components/button.*, icons.tsx khi cần icon semantic chung
- e2e/quiz-editor.spec.ts, e2e/quiz-import.spec.ts, e2e/headings.spec.ts,
  e2e/security.spec.ts

## Tasks

- [x] 04.1 Refine library blank/loading/error/saved/shared/search-list state,
  giữ management action và accessible name.
- [x] 04.2 Áp dụng responsive editor layout cho question list, add-type action,
  form, validation, start/share zones; không đổi dirty/reorder logic.
- [x] 04.3 Giữ icon-only move/delete/duplicate với tooltip và 44px; confirmation
  action tiếp tục dùng text rõ hệ quả.
- [x] 04.4 Restyle CSV/XLSX import feedback, validation, shared-link lifecycle
  và shared read-only view; không đổi format/parsing/privacy.

## Acceptance criteria

- Semantic names, heading order, focus recovery, disabled/retry của e2e giữ
  nguyên.
- Form keyboard-friendly, 375px không tràn.
- Không đổi create/update/reorder/share/import payload.

## Verification

- npm run typecheck; npm run lint; npm test
- npm run test:e2e -- e2e/quiz-editor.spec.ts e2e/quiz-import.spec.ts e2e/headings.spec.ts e2e/security.spec.ts
- Axe/overflow desktop/mobile assertions, npm run test:db local.
