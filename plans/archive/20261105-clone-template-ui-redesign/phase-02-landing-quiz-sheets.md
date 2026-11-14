# Phase 02 — Landing và Quiz Sheets tương tác

## Overview

Biến landing thành surface thể hiện rõ vòng đời quiz. Đây là signature moment
duy nhất được phép dùng perspective và pointer parallax.

## Files

- Cập nhật: `src/app/page.tsx`, `src/app/page.module.css`
- Tạo: `src/components/quiz-flow-preview.tsx`
- Tạo: `src/components/quiz-flow-preview.module.css`
- Cập nhật khi cần icon nhất quán: `src/components/icons.tsx`
- Xoá sau khi `rg` xác nhận không còn dùng: `src/components/classroom-preview.tsx`, `src/components/classroom-preview.module.css`
- Cập nhật: `e2e/home.spec.ts`, `e2e/headings.spec.ts`, `e2e/apple-interface.spec.ts`, `e2e/a11y.spec.ts`, `e2e/tools.spec.ts`, `e2e/games.spec.ts`

## Tasks

- [ ] Giữ `page.tsx` là Server Component và nhúng một client island
  `QuizFlowPreview`. Component mới chỉ nhận dữ liệu mẫu serializable, không
  import Supabase, auth API hoặc module nghiệp vụ ghi dữ liệu.
- [ ] Dựng ba sheet `Soạn quiz`, `Chơi trực tiếp`, `Kết quả`. Sheet active có
  semantic UI thật; sheet sau chỉ tạo chiều sâu, dùng `aria-hidden` và `inert`
  để không nhận focus.
- [ ] Tab dùng `role=tablist/tab/tabpanel`, `aria-selected`, liên kết id đúng,
  hỗ trợ Left/Right/Home/End và roving tabindex. Click/touch đổi tab tương đương.
- [ ] Demo soạn cho phép chọn đáp án mẫu và phản hồi bằng hình/chữ; đổi tab
  không gọi API. Không thêm fake save, dead link hoặc control không hoạt động.
- [ ] Pointer parallax chỉ gắn trên stage ở `(hover: hover) and (pointer: fine)`
  và khi không reduced motion. Dùng một RAF, không React state mỗi frame, reset
  khi pointerleave, blur hoặc unmount; giới hạn chuyển động để target bấm ổn định.
- [ ] Mobile dưới breakpoint nội dung chỉ ưu tiên sheet active, không perspective,
  không rear-sheet overflow. Tablet giảm góc/offset; desktop dùng stack đầy đủ.
- [ ] Tái cấu trúc landing theo direction C: hero → flow ba bước có một UI
  excerpt lớn → quick actions/tool/game highlights → CTA kết. Giữ đường dẫn
  tới quiz, game, tools và classes trong tối đa hai lần bấm.
- [ ] Giữ đúng một h1, heading không nhảy cấp và một CTA vàng chính trong hero.
- [ ] Viết Playwright cho: tab/keyboard, chọn đáp án, pointer transform + reset,
  reduced motion, không quiz-write request, inactive sheet không focus, axe,
  overflow 320/375/768/1280px và click CTA sau pointermove nhanh.

## Acceptance criteria

- Người dùng hiểu `soạn → chơi → kết quả` trong hai giây đầu và thao tác được
  bằng chuột, bàn phím hoặc cảm ứng.
- Active sheet đạt WCAG AA; rear sheets không nằm trong accessibility tree.
- Không có animation vô hạn, React rerender mỗi pointer frame hoặc global listener.
- Không tràn ngang ở 320px/375px; mobile không chỉ là bản desktop thu nhỏ.
- CTA và route hiện tại vẫn đạt các contract `home`, `tools`, `games`, `headings`.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/home.spec.ts e2e/headings.spec.ts e2e/apple-interface.spec.ts e2e/a11y.spec.ts e2e/tools.spec.ts e2e/games.spec.ts`
- Browser thật: hover, tab/arrow keys, touch viewport, fast pointer sweep, reduced motion và console.

