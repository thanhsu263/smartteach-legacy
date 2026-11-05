# Phase 04 — Workspace lớp học và quiz

## Files/areas

- `src/app/my-classes/**`, `class{es,-editor}.*`, pickers/name input
- `src/app/my-quizzes/**`, `components/quiz/**`, import/share/session history
- `e2e/quiz-editor.spec.ts`, `quiz-import.spec.ts`, auth/a11y workspace checks

## Tasks

- Xây workspace shell cho list → detail → action: navigator/class or quiz list, toolbar, form/detail panel và predictable mobile sequence.
- Giữ state source/props/save/reorder/import/share nguyên vẹn; chỉ bọc/trình bày lại. Thêm preview hoặc workflow visualization chỉ nếu sống trong draft/state hiện hữu, không duplicate source of truth.
- Áp dụng signature workflow thứ hai, nếu cần, chỉ cho một quiz/class progress map cục bộ và tắt trên touch/reduced motion.
- Thiết kế import, share, problems, confirmation, loading/error/empty/success theo component vocabulary; retain focus restoration.

## Acceptance/verification

- CRUD, dirty confirmation, reorder race, import, sharing và focus contracts không đổi.
- Visual state coverage cho empty/loading/invalid/valid/error/share confirm; axe + overflow 320/375/768/1280.
- `quiz-editor`, `quiz-import`, `auth`, DB tests liên quan đạt khi Supabase local sẵn sàng.
