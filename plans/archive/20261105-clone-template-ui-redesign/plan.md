Mode: local
Status: superseded by ../20261106-figma-teacher-ui-reimplementation/plan.md

# Kế hoạch vận dụng cloneTemplate cho toàn bộ UI SmartTeach — ĐÃ HUỶ

## Mục tiêu

Triển khai hướng kết hợp A + B + C đã duyệt: landing dùng cụm Quiz Sheets
tương tác theo chuột; trình soạn quiz dùng bố cục product-first có xem trước;
các workspace còn lại dùng chung ngôn ngữ panel, toolbar, list/table và sheet
chi tiết lấy cảm hứng từ `cloneTemplate`. Giữ nguyên nghiệp vụ, route, API,
schema, state machine và stack Next.js/CSS Modules hiện tại.

> Đã huỷ ngày 2026-11-05 theo yêu cầu chủ dự án. Không tiếp tục các phase bên
> dưới; kế hoạch tái thiết kế toàn diện thay thế nó sẽ được lập riêng.

## Nguồn quyết định

- [Decision Brief](../../reports/brainstorm-2026-11-05-clone-template-ui-redesign.md)
- `PRODUCT.md` và `DESIGN.md`
- `cloneTemplate/` là reference chỉ đọc cho composition, sheet stack và interaction; không import vào production.
- Mã nguồn và test hiện tại; kế hoạch `../../20261104-smartteach-ui-redesign/` là baseline đã kiểm chứng, không bị sửa hoặc xoá bởi plan này.

## Phạm vi

### Bao gồm

- Token, motion contract và app chrome dùng chung.
- Landing page, Quiz Sheets demo và story flow ba bước.
- Kho quiz, trình soạn, xem trước câu hỏi, nhập/chia sẻ quiz và lịch sử phiên.
- Kho game, kho công cụ, wrapper từng công cụ, lớp học, đăng nhập, privacy và 404.
- Host/player/results ở mức đồng bộ hierarchy và trạng thái, nhưng vẫn tối ưu cho trình chiếu.
- Kiểm thử interaction, responsive, keyboard, WCAG AA, reduced motion, overflow và hiệu năng cảm nhận.

### Không bao gồm

- Thay đổi `src/lib`, Supabase schema/RLS/RPC, logic tính điểm, format import, routing hoặc tên props công khai.
- Tailwind, Shadcn, TanStack Router, GSAP, Blink SDK hoặc dependency của `cloneTemplate`.
- Tilt/parallax trên host, player, game, bảng trắng hoặc các control nghiệp vụ.
- Ghi dịch vụ ngoài, deploy, commit hoặc push.
- Sửa `tests/fixtures/quiz-thu-nghiem.csv` và `tests/fixtures/quiz-thu-nghiem.xlsx`.

## Phases

| Phase | Tên | Trạng thái |
| --- | --- | --- |
| 01 | [Nền tảng thị giác và interaction contract](./phase-01-foundation-contract.md) | Superseded |
| 02 | [Landing và Quiz Sheets tương tác](./phase-02-landing-quiz-sheets.md) | Superseded |
| 03 | [Kho và trình soạn quiz product-first](./phase-03-quiz-authoring.md) | Cancelled |
| 04 | [Kho game, tiện ích và tool stage](./phase-04-discovery-tools-games.md) | Cancelled |
| 05 | [Lớp học, xác thực và bề mặt hỗ trợ](./phase-05-classes-auth-support.md) | Cancelled |
| 06 | [Host, player và kết quả](./phase-06-live-results.md) | Cancelled |
| 07 | [Kiểm chứng toàn hệ thống và hoàn thiện](./phase-07-verification-polish.md) | Cancelled |

## Quy ước thực thi

- Trước khi viết code, đọc `AGENTS.md` và các guide Next.js 16 liên quan trong
  `node_modules/next/dist/docs/`, đặc biệt `use-client`, Server/Client
  Components, CSS Modules và Playwright.
- Giữ `src/app/page.tsx` là Server Component; chỉ Quiz Sheets là client island
  nhỏ với props serializable. Không kéo toàn landing vào client bundle.
- Pointer parallax dùng `requestAnimationFrame`, chỉ ghi `style`/CSS variables,
  không `setState` mỗi frame, không auto-loop và huỷ sạch listener/RAF khi unmount.
- Chỉ một CTA vàng chính trên mỗi màn hình. Xanh biểu đạt điều hướng/lựa chọn;
  trạng thái luôn có chữ hoặc hình, không chỉ màu.
- Nội dung làm việc dùng bề mặt gần đặc. Blur chỉ cho header/menu/sheet nổi;
  không chồng quá 2–3 lớp filter trong cùng vùng nhìn.
- Mọi control có default, hover, focus-visible, active, disabled và khi áp dụng:
  loading/error/success. Vùng chạm tối thiểu 44px.
- Các phase chỉ thay lớp trình bày. Nếu implementation cần đổi API, state
  nghiệp vụ hoặc schema, dừng và quay lại brainstorm thay vì tự mở rộng scope.

## Bản đồ acceptance

| Tiêu chí từ Decision Brief | Phase | Evidence quyết định |
| --- | --- | --- |
| Landing có ba Quiz Sheets, tab và phản hồi chuột | 02 | Playwright desktop pointer/tab/keyboard + screenshot 1280px |
| Demo chọn đáp án được nhưng không ghi Supabase | 02 | Source boundary + Playwright quan sát không có quiz write request |
| Editor product-first, không đổi lưu/sửa/xoá/sắp xếp | 03 | E2E quiz-editor hiện hữu + test preview mới |
| Các trang quản lý dùng chung panel/toolbar/list/sheet | 03–05 | Screenshot 375/768/1280px + targeted route tests |
| Host/player/game/whiteboard không tilt hoặc blur nặng | 04, 06 | Computed-style/DOM contract + host/play/tool tests |
| Không thêm stack/dependency template | 01, 07 | Diff `package.json`/lockfile và bundle scan |
| WCAG AA, keyboard, reduced motion, không tràn | 01–07 | Axe và overflow ở 1280px/375px; reduced-motion tests |
| Toàn bộ test và bundle scan đạt | 07 | Full command matrix, Playwright hai lượt liên tiếp |

## Phụ thuộc và thứ tự

- Phase 01 là nền cho mọi phase sau.
- Phase 02 và 03 xác lập hai mẫu quan trọng nhất (brand landing và product
  workspace); Phase 04–06 chỉ tái sử dụng các mẫu đã ổn định, không tạo hệ mới.
- Phase 07 chỉ bắt đầu sau khi targeted checks của Phase 02–06 đạt.
- Không có migration, production write hoặc external publication trong plan.

## Rủi ro và kiểm soát

| Rủi ro | Kiểm soát / evidence |
| --- | --- |
| Sheet 3D làm click chập chờn | Giới hạn góc và độ lệch; không magnetic; test click sau pointermove nhanh và reset khi pointerleave |
| RAF chạy liên tục hoặc layout thrash | Chỉ schedule khi có pointer event, dùng một RAF, đo rect tối đa một lần/frame, huỷ khi leave/unmount |
| Sheet sau lọt vào accessibility tree | `aria-hidden` + `inert` cho panel không hoạt động; Axe và keyboard traversal |
| Mobile thu nhỏ desktop thay vì tái cấu trúc | Chỉ render/trình bày sheet trước, tắt perspective/parallax, test 320/375/768px |
| Editor ba vùng làm đổi state hiện tại | Preview nhận `draft` bên trong `QuestionForm`; không lift state, không đổi props hoặc save flow |
| Xung đột test cấm tilt toàn cục | Sửa contract thành “parallax chỉ được phép trong Quiz Sheets”; vẫn cấm ở mọi canvas/task surface khác |
| Màu sheet sau quá nhạt gây contrast fail | Chỉ sheet hoạt động chứa nội dung truy cập; active sheet đạt AA; rear sheet là lớp trang trí bị ẩn semantics |
| Phạm vi toàn hệ thống tạo CSS drift | Xong mẫu foundation/landing/editor trước; các phase sau tái dùng token và primitive, không hard-code shadow/easing mới |

## Handoff

`hs-build` bắt đầu Phase 01, ghi evidence và mọi sai khác được duyệt vào
`implementation-notes.md`. Không commit hoặc push cho tới khi người dùng yêu cầu.

