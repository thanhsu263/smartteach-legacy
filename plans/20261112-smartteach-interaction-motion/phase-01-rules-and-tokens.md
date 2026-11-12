# Phase 01 · Quy tắc và token

## D1 · Đồng bộ quy tắc với tương tác đã chốt

Các thay đổi sau thuộc phase triển khai. Số dòng là vị trí trong bản `DESIGN.md` đã đọc khi lập kế hoạch.

| Vị trí | Chỉnh trong phase này |
| --- | --- |
| §1 Key Characteristics, đoạn chuyển động khoảng dòng 107 | Giữ 100–260 ms cho UI thông thường, dẫn ngoại lệ cục bộ của hero ở §7 và yêu cầu chữ/CTA có sẵn ngay. |
| §5 Buttons, dòng 169 | Đồng bộ hover với `--motion-state` 180 ms và focus-visible tức thì. Press dùng `--motion-press` 100 ms. Giữ target ≥44 × 44 CSS px cho nút/menu trong phạm vi, focus hai lớp và trạng thái chữ rõ. |
| §5 Navigation, dòng 193–196 | Ghi riêng landing sticky và ẩn/hiện ở desktop, anchor offset, `aria-current="location"`, menu landing ≤1000 px. Ghi menu shell mobile ≤719 px, sidebar hẹp có nhãn 720–959 px và rail/mở tạm/ghim ở ≥960 px. Escape trả về trigger. Chọn anchor landing đưa focus tới tiêu đề đích. |
| §6 Don't, dòng 214–215 | Giữ cấm nền động toàn màn hình, magnetic, motion trang trí theo cuộn/route và kính trên màn chiếu/iframe/canvas. Dẫn ngoại lệ wash giới hạn trong hero. Cho phép chuyển động header phục vụ điều hướng. |
| §7 Tệp, Motion grammar, Ngoại lệ Quiz Sheets, dòng 223–231 | Sửa path nền tĩnh thành `src/components/ambient-background.tsx`. Ghi wash cục bộ hữu hạn trong landing, tách khỏi Quiz Sheets phản ứng con trỏ. Giữ nền toàn app tĩnh và quy tắc tránh update React theo frame. Ghi lifecycle tooltip/dialog/loading, fallback, cleanup và reduced motion. |
| §5 Answer tiles, §7 Khả năng thích ứng, khoảng dòng 173–178 và 233 | Dùng làm ràng buộc kiểm chứng. Giữ nhãn/hình/trạng thái đáp án live và fallback reduced transparency/contrast. Bổ sung phạm vi đồng hồ fullscreen và vùng nhập liệu vào danh sách bảo vệ. |

File dự kiến là `DESIGN.md`, `src/styles/tokens.css`, và `src/styles/glass.css` nếu cần thêm selector opt-in có phạm vi. Giữ các alias còn caller. Đọc các guide local `01-app/01-getting-started/05-server-and-client-components.md`, `11-css.md`, `01-app/03-api-reference/02-components/link.md` phần hash/sticky offset và `01-app/02-guides/testing/playwright.md` trong `node_modules/next/dist/docs/` trước khi triển khai các phase. Các guide này đã được đối chiếu khi lập kế hoạch. Giữ page/layout ở server, browser API ở client boundary nhỏ và import CSS Module tại component liên quan.

## D2 · Chốt cách dùng token và lấy baseline

| Tương tác | Contract chung |
| --- | --- |
| Press | `--motion-press` 100 ms với `--ease-instant`. Vùng bấm ổn định. Dùng màu/viền hoặc co lớp trang trí bên trong. Trả về khi release/cancel. Disabled giữ chữ đọc được. |
| Hover và đổi state | `--motion-state` 180 ms với `--ease-fluid`. Hover chỉ cho fine pointer có hover. Keyboard có focus rõ ngay. Chọn, lỗi và thành công có chữ, icon hoặc semantics ngoài màu. Trạng thái hiện theo sự kiện thật và kết thúc ở giá trị cuối. |
| Lớp nổi | Vào `--motion-layer` 260 ms với `--ease-fluid`. Ra `--motion-state` 180 ms với `--ease-fluid-in` khi có thể giữ focus và ngữ nghĩa trong suốt vòng đời. Xem contract riêng cho dialog. Fallback là mở/đóng tức thì. |
| Hero | Dùng `--motion-hero` 420 ms với `--ease-fluid` cho reset. Thời lượng wash là hằng CSS cục bộ, không đưa thành token chung. |
| Reduced motion, contrast | Bỏ displacement, shimmer và cuộn mượt trong phạm vi thay đổi. Thể hiện state tức thì, giữ thứ tự focus. Dùng nền đặc khi giảm transparency hoặc thiếu `backdrop-filter`. Giữ tương phản chữ thường ≥4.5:1, chữ lớn và ranh giới control/focus cần thiết ≥3:1. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |

Chạy baseline trên production build hiện tại trước khi sửa UI, với cùng Node, trình duyệt, máy và fixture sẽ dùng ở phase 05. Lưu danh sách và kích thước JS/CSS first-load theo route, ảnh nghỉ và một trace cuộn `/`, mở sidebar ở `/tools/countdown`. Theo [phase 05](./phase-05-verification.md) để phép đo trước/sau dùng cùng cách. CSS và browser API đủ cho các tương tác đã chốt. Giữ `package.json` và lockfile.

### Nghiệm thu

- D1 · Review diff đúng các đoạn trên, đối chiếu từng mục với phase 02–04. `npm test -- src/styles/glass.test.ts src/styles/contrast.test.ts` tiếp tục kiểm nền tĩnh, token đang dùng, contrast và focus primitive. Giữ assertion nền tĩnh trong `glass.test.ts` vì wash mới thuộc landing.
- D2 · Có baseline có thể lặp lại và danh sách guardrail cho fullscreen, lớp nổi, input, live canvas. Rà selector dùng chung và chạy targeted `e2e/apple-interface.spec.ts` cùng `e2e/a11y.spec.ts` để phát hiện regression primitive trước khi mở rộng phạm vi.
