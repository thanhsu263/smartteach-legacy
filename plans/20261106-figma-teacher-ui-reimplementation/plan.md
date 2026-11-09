Mode: local
Status: active

# Kế hoạch triển khai UI SmartTeach theo Figma

## Mục tiêu

Thay nguồn quyết định thị giác của các bề mặt giáo viên từ Google Stitch/
`cloneTemplate` sang file Figma SmartTeach đã được người dùng duyệt. Giữ nguyên
route, API, schema, RLS, state nghiệp vụ và dữ liệu hiện có; chỉ tổ chức lại
markup trình bày, CSS Modules, component dùng chung, trạng thái tương tác và
responsive.

Kế hoạch này **chỉ cam kết hoàn thiện các màn hình đã có frame Figma**. Các
route chưa có frame vẫn phải chạy, đạt accessibility và dùng được, nhưng không
được coi là đã thiết kế xong và không được suy diễn từ Stitch.

## Nguồn quyết định

1. Hành vi đã chạy và bộ kiểm thử hiện tại là nguồn đúng cho nghiệp vụ.
2. [Figma Foundations, page `27:2`](https://www.figma.com/design/4EEncl4e3CIzdTFNAMm0ry/SmartTeach?node-id=27-2) là nguồn đúng cho token, typography, component và state.
3. [Figma Teacher Screen, page `34:4060`](https://www.figma.com/design/4EEncl4e3CIzdTFNAMm0ry/SmartTeach?node-id=34-4060) là nguồn đúng cho bố cục và responsive của các màn hình được liệt kê bên dưới.
4. `PRODUCT.md`, `DESIGN.md` và mã nguồn hiện tại cung cấp ràng buộc sản phẩm;
   `DESIGN.md` phải được đồng bộ lại nếu mâu thuẫn với Foundations.
5. Google Stitch, `cloneTemplate/` và plan cũ không còn quyền quyết định. Không
   xóa các thư mục tham khảo của người dùng; chỉ ngừng dùng chúng làm nguồn thiết kế.

## Quyết định đã khóa

- Không thêm Tailwind hoặc copy React/Tailwind do Figma sinh; chuyển thiết kế
  sang Next.js 16, React 19, TypeScript và CSS Modules hiện có.
- Màu chuẩn của bề mặt giáo viên lấy từ Figma: Action `#2259ED`, Brand
  `#102B68`, Highlight `#FFD453`, Text `#142B50`/`#52627A`, Subtle
  `#F0F5FF`, Border `#D7E0ED`, Control border `#687B96`.
- Be Vietnam Pro tiếp tục nạp qua `next/font` với subset tiếng Việt.
- Không render control chết hoặc dữ liệu giả chỉ để giống mockup. Những phần
  Figma chưa có backend tương ứng sẽ bị loại khỏi implementation:
  - global search trên top bar;
  - môn học/khối lớp/trạng thái tham gia nếu model không có dữ liệu;
  - tab Hoạt động/Kết quả của lớp;
  - điểm câu hỏi, nhân bản câu, Preview độc lập và auto-save nếu logic chưa có;
  - ghi nhớ đăng nhập và quên mật khẩu nếu auth hiện tại chưa hỗ trợ.
- Chức năng hiện có nhưng chưa xuất hiện trong frame phải được giữ: Google OAuth,
  đăng ký email, game yêu thích, bốn loại câu hỏi, nhập bằng văn bản, lịch sử
  phiên, chia sẻ quiz, fullscreen và các trạng thái lỗi/loading hiện hữu.
- Các khác biệt trên được trình bày bằng component Foundation và hierarchy Figma,
  không thay nghiệp vụ để ép khớp ảnh.
- Landing đã được triển khai theo Figma ở commit `cae7fa6`; chỉ đồng bộ token
  không làm thay đổi nội dung, CTA hoặc bố cục landing trong plan này.
- Không commit, push, deploy hoặc ghi Supabase/Vercel/GitHub thật trong plan.

## Bản đồ Figma đã đủ để triển khai

| Nhóm | Node Figma chính | Route / bề mặt | Mức bao phủ |
| --- | --- | --- | --- |
| Foundation | `27:17075`, `27:18800`–`27:19506` | Token và primitive toàn app | Desktop specimen + state Default/Hover/Focus/Pressed/Disabled/Loading khi áp dụng |
| Shell | `34:3800`, `34:3894`, `34:4083`, `34:4120` | Chrome giáo viên | Desktop mở rộng/thu gọn; mobile suy ra từ frame mobile đã có, không dùng Stitch |
| Auth | `34:4649`, `34:4769` | `/login` | Desktop + mobile; mở rộng bằng hành vi auth hiện có |
| Danh sách lớp | `34:7501`, `34:7707`, `34:7853` | `/my-classes` | Có dữ liệu, empty và card states desktop |
| Chi tiết lớp | `36:27124`, `36:27428`, `36:27780`, `36:28117` | `/my-classes/[id]` | Desktop, rename/delete state và mobile bottom sheet |
| Danh sách quiz | `36:34356`, `36:34615`, `36:34735` | `/my-quizzes` | Có dữ liệu, empty, card/control states desktop |
| Trình soạn quiz | `36:39819`, `36:40059`, `36:40301`, `36:57415`, `36:57773`, `36:57601`, `36:58018`, `36:58242` | `/my-quizzes/[id]` | Desktop, tablet, mobile, question/settings panels, saving/error visuals |
| Nhập quiz | `36:60368`, `36:60509`, `36:60928` | `/my-quizzes/import` | Upload, preview và error desktop |
| Kho tiện ích | `45:3235`, `45:3421` | `/tools` | Desktop + mobile |
| Đồng hồ | `45:5838`, `45:5998`, `45:6170`, `45:6342` | `/tools/countdown` | Ready, running, last 10 seconds, finished |

## Khoảng trống thiết kế cố ý không suy diễn

- `/games`, `/games/[id]`.
- `/tools/draw`, `/tools/groups`, `/tools/whiteboard` ngoài chrome và primitive chung.
- `/host`, `/host/[id]`, `/host/[id]/results`, `/play`.
- `/shared/quiz/[token]`, `/privacy`, 404.
- Chi tiết mobile riêng cho danh sách lớp/quiz và import; implementation dùng
  breakpoint và pattern mobile đã có trong cùng page Figma, nhưng phải chụp ảnh
  xác nhận và không được thêm luồng mới.

Các route trên giữ nguyên UI đang hoạt động hoặc chỉ nhận token/component chung.
Muốn hoàn thiện chúng cần frame Figma mới và một plan nối tiếp.

## Phases

| Phase | Tên | Trạng thái |
| --- | --- | --- |
| 01 | [Đối soát baseline và triển khai Foundation](./phase-01-foundation.md) | Implemented — static gate, WCAG targeted và visual production probe đã đạt |
| 02 | [App shell và đăng nhập](./phase-02-shell-auth.md) | Implemented — desktop/mobile shell và auth/a11y e2e đạt |
| 03 | [Quản lý lớp học](./phase-03-classes.md) | Implemented — list/detail, destructive dialog và auth/a11y flow đạt |
| 04 | [Kho, trình soạn và nhập quiz](./phase-04-quizzes.md) | Implemented — editor/import e2e đạt 27/27 |
| 05 | [Kho tiện ích và đồng hồ](./phase-05-tools.md) | Implemented — catalog, countdown và whiteboard regression e2e đạt 27/27 |
| 06 | [Kiểm chứng, dọn nguồn Stitch và bàn giao khoảng trống](./phase-06-verification.md) | Implemented — build/static gates, audit và hai lượt full e2e sharded (219/219 mỗi lượt) đạt |

## Bản đồ acceptance

| Tiêu chí | Phase | Evidence bắt buộc |
| --- | --- | --- |
| Token và primitive khớp Foundations, không hard-code rải rác | 01 | Unit token/contrast + screenshot specimen local |
| Không còn nguồn thiết kế Stitch trong production của phạm vi đã migrate | 01–06 | `rg` reference audit + diff review |
| Shell expanded/collapsed/mobile dùng bàn phím được | 02 | Playwright + manual focus/tooltip/drawer |
| Login giữ đủ sign-in, sign-up, Google, lỗi và callback | 02 | Auth e2e + axe desktop/mobile |
| Lớp học giữ create/rename/add/edit/delete và empty/loading/error | 03 | Auth e2e + screenshots node-matched |
| Quiz giữ create/import/edit/reorder/delete/share/host/history và bốn loại câu | 04 | Quiz editor/import e2e + DB tests |
| Tool catalog và countdown khớp desktop/mobile cùng bốn trạng thái timer | 05 | Tools e2e + visual state screenshots |
| Không tràn ngang 375px, focus rõ, WCAG AA và reduced motion | 01–06 | Axe/overflow 375/1280 + reduced-motion checks |
| Không đổi API/schema/routing/business state | 01–06 | Diff audit ngoài presentation files + full tests |
| Toàn bộ quality gate xanh hai lượt e2e liên tiếp | 06 | Command log và Playwright reports |

## Thứ tự và ràng buộc thực thi

- Phase 01 phải hoàn thành trước mọi phase khác.
- Phase 02 tạo shell dùng chung; Phase 03–05 không tự tạo chrome riêng.
- Phase 03 và 04 có thể triển khai độc lập sau Phase 02, nhưng Phase 04 phải giữ
  nguyên contract props của `QuizEditor`/`QuestionForm`.
- Mỗi phase chỉ kết thúc khi targeted test và ảnh 375/768/1280 tương ứng đạt.
- Khi dựng code từ Figma, luôn gọi lại `get_design_context` cho node cụ thể và
  tải asset SVG cần thiết vào repo; không dùng URL asset tạm của Figma lúc runtime.
- Trước khi sửa Next.js, đọc lại guide tương ứng trong
  `node_modules/next/dist/docs/01-app/`; giữ page/layout là Server Component và
  chỉ đặt client boundary ở shell/form tương tác.

## Rủi ro chính

| Rủi ro | Kiểm soát |
| --- | --- |
| Figma hiển thị dữ liệu chưa có trong model | Chỉ render dữ liệu thật; ghi sai khác trong implementation notes |
| Shell client kéo toàn app vào client bundle | Truyền Server Component qua `children`; không import page server vào shell client |
| Modal/drawer làm mất focus hoặc đóng quá sớm | Native dialog semantics/focus trap, Escape, restore focus, test keyboard và animation exit |
| Editor responsive ghi đè state hoặc transform | Chỉ đổi wrapper/CSS; state soạn câu vẫn ở component hiện tại |
| Token mới làm hỏng landing/live canvas | Compatibility aliases, visual regression riêng cho landing/host/play trước khi bỏ alias |
| Workspace đang có staged/untracked thay đổi | Không reset; đối chiếu `HEAD`, index và worktree theo từng file, không chạm hai fixture `quiz-thu-nghiem.*` |
| Test click chập chờn do motion | Không di chuyển hit target khi focus/click; reduced-motion mặc định trong Playwright |

## Handoff

`hs-build` bắt đầu ở Phase 01. Mọi sai khác Figma do thiếu dữ liệu hoặc hành vi
phải được ghi vào `implementation-notes.md`; không tự mở rộng schema/API. Không
commit hoặc push cho tới khi người dùng yêu cầu riêng.
