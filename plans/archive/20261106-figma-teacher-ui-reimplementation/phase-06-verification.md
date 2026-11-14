# Phase 06 — Kiểm chứng, dọn nguồn Stitch và bàn giao khoảng trống

## Mục tiêu

Chứng minh diff Figma hoạt động ổn định trên bản build thật, dọn dấu vết thiết kế
Stitch khỏi phạm vi đã migrate và bàn giao rõ những route còn chờ frame.

## Công việc

1. Audit diff:
   - không thay `src/lib`, Supabase migrations/RLS/RPC, routing hoặc public prop names;
   - không dùng Tailwind/dependency/template runtime;
   - không có asset URL Figma tạm;
   - không chạm `tests/fixtures/quiz-thu-nghiem.*`.
2. Audit nguồn thiết kế:
   - `DESIGN.md` và production code của màn đã migrate chỉ trỏ Foundation/Figma;
   - compatibility alias cho route chưa có frame được đánh dấu và có owner/gate xóa;
   - `cloneTemplate/` không import; không xóa thư mục người dùng.
3. Kiểm thử trình duyệt thật trên bản build:
   - hover, active, focus keyboard, collapsed sidebar, mobile drawer;
   - login states, class modal/sheet, quiz editor drawers, import states;
   - countdown bốn trạng thái, fullscreen;
   - 320/375/768/1280/1440px, không tràn ngang;
   - reduced-motion, touch/no-hover, console/network errors.
4. Chạy quality gate:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run test:db`
   - `npm run test:e2e` hai lần liên tiếp trên build thật
   - `npm run scan:bundle`
5. Nếu DB/e2e auth cần local Supabase: chỉ dùng `npm run supabase:start` và
   `npm run supabase:env`; không ghi Supabase thật. Ghi rõ lỗi Docker nếu có.
6. Chụp before/after cho từng node đã triển khai và lưu evidence cục bộ trong
   `artifacts/figma-ui/`; không commit ảnh nếu repo policy không yêu cầu.
7. Tạo `implementation-notes.md` gồm:
   - file đã đổi, node Figma tương ứng;
   - sai khác có chủ ý do dữ liệu/logic;
   - frame còn thiếu và route chưa hoàn thiện;
   - test commands, kết quả, console và ảnh evidence.

## Acceptance

- Full matrix xanh; Playwright đạt hai lượt liên tiếp.
- Axe WCAG A/AA đạt 1280 và 375 cho route public/authenticated trong scope.
- Không overflow ngang, không console error, không flaky click do motion.
- Bundle scan không tăng client boundary ngoài mức giải thích được.
- Không còn production import/reference từ Stitch/cloneTemplate.
- Bàn giao không gọi route thiếu frame là “đã hoàn tất thiết kế”.

## Dừng và quay lại thiết kế khi

- Implementation cần thêm field/database/API để khớp Figma.
- Cần quyết định UX cho game, groups, draw, whiteboard, live hoặc shared/privacy.
- Một control trong Figma không có hành vi thật và không thể bỏ mà vẫn giữ nghĩa.
- Frame mới mâu thuẫn với Foundation hoặc hành vi đã test.

Không commit/push/deploy trong phase này nếu chưa có yêu cầu riêng của người dùng.
