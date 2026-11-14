# Implementation notes — cloneTemplate UI redesign

## Phase 01

- Baseline desktop của trang chủ đã lưu tại
  `artifacts/clone-template-baseline-home-1280.png`.
- Browser automation có thể mở localhost sau khi dev server chạy ngoài sandbox.
  Ảnh baseline 375px/768px và các route có dữ liệu sẽ được chụp trong phase
  tương ứng, vì chúng cần các trạng thái workspace/live cụ thể.
- Contract được chốt: parallax chỉ là một client island cục bộ trong Quiz
  Sheets của landing; không mở rộng `[data-glass]`, không có listener toàn
  trang và không có auto-loop.

## Phase 02

- `QuizFlowPreview` thay minh hoạ lớp học cũ. Ba tab Soạn quiz, Chơi trực tiếp
  và Kết quả chỉ quản lý state demo cục bộ; không import auth, Supabase hoặc
  module nghiệp vụ.
- Các sheet sau là trang trí (`aria-hidden` + `inert`). Trên mobile chúng bị
  ẩn hoàn toàn; sheet hoạt động không còn perspective.
- Ảnh sau thay đổi: `artifacts/clone-template-after-home-1280.png`.
- Evidence: `npm run typecheck`, `npm run lint`, `npx playwright test
  e2e/apple-interface.spec.ts` (16/16) đều đạt. Lượt nhóm 103 test trước đó
  có một lần assertion CTA không tái hiện; test riêng và lặp hai lượt sau đó
  đều đạt, nên không nới hoặc bỏ assertion.

## Phase 03 (in progress)

- `QuestionPreview` được render từ `draft` bên trong `QuestionForm`, vì vậy
  nội dung xem trước đồng bộ tức thời nhưng không thay signature props hoặc
  luồng save/dirty hiện có.
- Ở 1280px, preview là cột phụ sticky của form; dưới breakpoint này nó trở về
  luồng một cột để không ép hẹp vùng nhập liệu.
- Evidence ban đầu: `npm run typecheck`, `npm run lint`, và Playwright luồng
  đủ bốn dạng câu hỏi (gồm assertion preview mới) đều đạt.
