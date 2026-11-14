# Phase 03 — Kho và trình soạn quiz product-first

## Overview

Áp dụng direction B vào các task surface của quiz, giữ nguyên toàn bộ state và
API hiện có. Editor phải cho thấy danh sách, form và preview cùng một hệ phân cấp
mà không lift hoặc nhân đôi state nghiệp vụ.

## Files

- Cập nhật: `src/app/my-quizzes/page.tsx`, `src/app/my-quizzes/import/page.tsx`, `src/app/my-quizzes/my-quizzes.module.css`
- Cập nhật: `src/components/quiz/quizzes-manager.tsx`, `src/components/quiz/quizzes-manager.module.css`
- Cập nhật: `src/components/quiz/quiz-editor.tsx`, `src/components/quiz/quiz-editor.module.css`
- Cập nhật: `src/components/quiz/question-form.tsx`, `src/components/quiz/question-form.module.css`
- Tạo: `src/components/quiz/question-preview.tsx`, `src/components/quiz/question-preview.module.css`
- Cập nhật: `src/components/quiz/import-quiz.tsx`, `src/components/quiz/import-quiz.module.css`
- Cập nhật khi cần hierarchy: `quiz-problems.*`, `share-panel.*`, `shared-quiz-view.*`, `src/components/live/host/start-session.tsx`, `src/components/live/results/session-history.tsx`
- Cập nhật: `e2e/quiz-editor.spec.ts`, `e2e/quiz-import.spec.ts`, `e2e/host.spec.ts`, `e2e/results.spec.ts`

## Tasks

- [ ] Chuyển Quiz của tôi thành workspace có create action rõ, danh sách quiz
  dạng row/table thích ứng và action icon nhất quán. Giữ accessible name,
  confirmation và focus return hiện tại.
- [ ] Tổ chức editor desktop thành navigator câu hỏi + vùng form rộng; bên
  trong `QuestionForm`, render `QuestionPreview` từ chính `draft` nội bộ để có
  preview cập nhật tức thời mà không đổi props, không lift state và không chạm
  `saveQuestion`/dirty-switch flow.
- [ ] Preview hỗ trợ đủ single, true/false, multi và short text; chỉ trình bày,
  không thêm control nghiệp vụ hoặc gửi đáp án. Empty/new state phải có hướng dẫn.
- [ ] Tablet dùng master-detail hai vùng; mobile dùng một cột theo thứ tự danh
  sách → form → preview hoặc progressive disclosure rõ, không giấu action chính.
- [ ] Giữ icon lên/xuống/xoá, tooltip và vùng bấm 44px. Selected question có
  hình/label ngoài màu và không dùng border top dày kiểu side-stripe.
- [ ] Chuyển mode import file/paste thành segmented control đúng semantics;
  preview lỗi/hợp lệ dùng row/panel từ cùng hệ, không đổi parser hoặc create flow.
- [ ] Đồng bộ StartSession, QuizProblems, SharePanel, SharedQuizView và
  SessionHistory với toolbar/sheet/list vocabulary mà không đổi props hoặc RPC.
- [ ] Mở rộng Playwright: preview đổi theo nội dung đang gõ; đủ bốn dạng câu;
  keyboard/focus/dirty-confirm; overflow 320/375/768/1280; axe ở empty, error,
  loading, valid, invalid và confirmation states.

## Acceptance criteria

- Editor desktop có ba vùng nhận thức rõ; preview phản ánh draft hiện tại nhưng
  không tạo state nguồn thứ hai.
- Các test lưu thất bại, dirty switch, reorder race, xoá, chia sẻ và import hiện
  hữu tiếp tục đạt nguyên contract.
- Không sửa signature của `QuizEditor`, `QuestionForm`, `StartSession`,
  `SessionHistory`, `SharePanel` hoặc API trong `src/lib`.
- Không có nested-card noise; primary action và trạng thái đã chọn rõ trong
  squint test và vẫn đạt contrast.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/quiz-editor.spec.ts e2e/quiz-import.spec.ts e2e/host.spec.ts e2e/results.spec.ts`
- Browser thật với quiz rỗng, quiz đủ bốn dạng, lỗi chưa chơi được, lỗi mạng và mobile keyboard.

