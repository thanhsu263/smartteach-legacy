# Phase 04 — Kho, trình soạn và nhập quiz

## Mục tiêu

Áp dụng các frame Figma cho toàn bộ luồng quản lý quiz hiện có mà không thay đổi
contract API, props, validation, import format hoặc live-session logic.

## Công việc

1. Lấy design context cho các node danh sách `36:34356`, `36:34615`,
   `36:34735`; editor `36:39819`, `36:40059`, `36:40301`, `36:57415`,
   `36:57773`, `36:57601`, `36:58018`, `36:58242`; import `36:60368`,
   `36:60509`, `36:60928`.
2. `/my-quizzes`:
   - heading, CTA tạo/nhập, search title, sort `updatedAt`, empty/loading/error;
   - create form trong modal/sheet;
   - card dùng dữ liệu thật: title, question count, sharing, updated time;
   - giữ StartSession, edit, duplicate, delete và confirmation/focus restore;
   - không bịa môn/lớp/play count hoặc trạng thái “sẵn sàng” khi API chưa cung cấp.
3. `/my-quizzes/[id]`:
   - desktop: question list + editor + settings trong cấu trúc ba vùng;
   - tablet: list thu gọn và settings drawer;
   - mobile: question navigation, Questions/Settings bottom sheets và action bar
     không che nội dung/safe area;
   - giữ cả bốn question kinds, validation, manual save, dirty-switch guard,
     reorder, delete, StartSession, QuizProblems, SessionHistory và SharePanel;
   - trạng thái header phải nói thật “Đã lưu/Có thay đổi chưa lưu/Đang lưu/Lỗi lưu”,
     không ghi auto-save;
   - không thêm points, duplicate-question hoặc Preview chết từ mockup.
4. `QuestionForm` giữ nguyên tên props/public contract; chỉ tái tổ chức section và
   CSS để center/settings có thể responsive. Up/down/delete dùng icon + tooltip.
5. `/my-quizzes/import`:
   - stepper upload → preview → confirm và alert error theo Figma;
   - giữ cả file CSV/XLSX và tab dán văn bản;
   - drag/drop chỉ đọc file cục bộ bằng parser hiện tại, không upload ra ngoài;
   - preview/issues/create giữ nguyên validation và redirect.
6. Cập nhật test quiz/import cho role mới, drawer/sheet keyboard, mobile overflow,
   loading/error/saving và axe.

## File dự kiến

- `src/app/my-quizzes/page.tsx`
- `src/app/my-quizzes/[id]/page.tsx`
- `src/app/my-quizzes/import/page.tsx`
- `src/app/my-quizzes/my-quizzes.module.css`
- `src/components/quiz/quizzes-manager.tsx` / `.module.css`
- `src/components/quiz/quiz-editor.tsx` / `.module.css`
- `src/components/quiz/question-form.tsx` / `.module.css`
- `src/components/quiz/import-quiz.tsx` / `.module.css`
- `src/components/quiz/quiz-problems.*`, `share-panel.*`, session-history styles
- `e2e/quiz-editor.spec.ts`, `e2e/quiz-import.spec.ts`, `e2e/a11y-auth.spec.ts`

## Acceptance

- Không mất chức năng quiz hiện có và không đổi file import/schema/API.
- Desktop/tablet/mobile editor theo đúng pattern Figma và không che action/content.
- Mọi icon action có accessible name, tooltip và target ít nhất 44px.
- Switching câu khi dirty vẫn cảnh báo; save/reorder/delete trả focus hợp lý.
- Import CSV/XLSX/text, preview cảnh báo/lỗi và tạo quiz chạy như trước.
- Targeted quiz e2e + DB quiz/import tests + axe đạt.

## Evidence

- Screenshot list empty/populated, editor desktop/tablet/mobile, question/settings
  sheet, save error, import upload/preview/error.
- E2E bốn loại câu hỏi và nhập fixture mẫu; không sửa hai fixture thử nghiệm ngoài scope.
