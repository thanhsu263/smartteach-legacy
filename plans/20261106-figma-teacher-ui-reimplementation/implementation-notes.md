# Ghi chú triển khai

## Phase 01 — Foundation

- Nguồn Figma đã đối chiếu: Foundation `27:17075`; Button `27:18800`; Icon
  Button `27:18825`; các primitive form/overlay trong dải `27:18889`–`27:19506`.
- Token app teacher được đồng bộ với Foundation: action `#2259ED`, hover
  `#1948CA`, pressed `#153DAA`, brand `#102B68`, highlight `#FFD453`, text
  `#142B50`/`#52627A`, subtle `#F0F5FF`, border `#D7E0ED`/`#687B96`.
- `--color-on-primary-muted` dùng `#DCE7FF` thay vì mẫu cũ `#DBE5FF`: đo bằng
  unit test cho thấy giá trị cũ chỉ đạt 4.48:1 trên action blue, còn giá trị mới
  vượt ngưỡng WCAG AA 4.5:1.
- Giữ `data-glass` và alias spacing đang được các route chưa migrate dùng để
  tránh thay đổi route, state hay markup nghiệp vụ theo kiểu big-bang. Tên file
  là compatibility layer; Figma Foundation là nguồn quyết định mới.

## Evidence hiện có

- `npm test`: 24 files, 287 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build` và Playwright visual probe đang **UNVERIFIED** trong môi
  trường này: Next dừng khi prerender với `EPERM mkdir` dưới
  `.next/server/app/_not-found.segments/_not-found` (trước khi test browser
  chạy). Đây là thư mục artifact `.next`, không có lỗi TypeScript, lint hoặc
  assertion UI. Không xóa cache/đụng thay đổi của người dùng tự động.
- Không thể giữ `next dev` mở để in-app browser truy cập `localhost:3000`; cổng
  không lắng nghe sau khi tiến trình nền kết thúc. Vì vậy chưa có screenshot
  375/1280 đáng tin cậy trong turn này.

## Phase 02 — Shell và đăng nhập

- Dùng context Figma Shell desktop/collapsed `34:3800`/`34:3894`, navigation
  `34:4083`/`34:4120`, login desktop/mobile `34:4649`/`34:4769`.
- `AppChrome` là một client boundary theo route; nhận `children` server-rendered.
  Shell chỉ áp cho `/my-classes`, `/my-quizzes`, `/games` và `/tools`; landing,
  login và live canvas giữ chrome riêng.
- Không triển khai search, notification, help, remember-me hay reset-password vì
  mockup không có logic tương ứng. Account chỉ cung cấp action đăng xuất/đăng
  nhập thật.
- Drawer mobile dùng native `dialog`; click backdrop, nút đóng và Escape đều
  đóng drawer, sau đó trả focus về nút mở menu.
- `npm run typecheck`, `npm run lint` và `npm test` đều xanh sau thay đổi; auth
  E2E/ảnh màn hình vẫn UNVERIFIED bởi cùng lỗi prerender `.next` đã nêu ở trên.

## Phase 03 — Lớp học (đang triển khai)

- Đã đối chiếu frames list/empty/card `34:7501`, `34:7707`, `34:7853` và
  detail/rename/delete/mobile `36:27124`, `36:27428`, `36:27780`, `36:28117`.
- Danh sách lớp đã nhận hierarchy Foundation/Figma, grid card chỉ hiển thị tên
  và số học sinh thật, không thêm môn/khối/trạng thái giả.
- Form tạo lớp đang giữ inline trong lượt này để bảo toàn e2e workflow hiện có;
  chuyển modal/bottom-sheet cùng detail rename/delete sẽ thực hiện kèm cập nhật
  kiểm thử ở pass tiếp theo, tránh tạo một thay đổi hành vi nửa vời.
- `npm run typecheck`, `npm run lint`, `npm test` (287 assertions) đều đạt.
- Xác nhận xoá lớp nay dùng native `<dialog>`: focus được browser quản lý, Escape
  và click backdrop đóng dialog, còn API xoá, nhãn “Xoá lớp …”, “Giữ lại” và
  thông báo lỗi giữ nguyên. Form tạo lớp và phần đổi tên vẫn inline để không
  thay luồng form khi local E2E/DB đang chờ Docker.

## Phase 04–05 — Quiz và tiện ích (đang triển khai)

- Danh sách quiz, editor và import đã nhận bề mặt Foundation/Figma bằng token
  chung; giữ bốn loại câu, manual save, dirty guard, import CSV/XLSX/text và
  session logic nguyên trạng.
- Xác nhận xoá câu trong editor nay dùng native `<dialog>` với focus mặc định ở
  “Giữ lại”, Escape/click backdrop để huỷ và trả focus về icon xoá của câu.
  Reorder, dirty guard và public props của `QuestionForm` không đổi.
- Kho tiện ích đã dùng heading/catalog Foundation; countdown và các tool chưa có
  frame sâu chỉ nhận token/shell, không suy diễn bố cục canvas.
- Catalog tiện ích có tìm kiếm không dấu từ dữ liệu `src/data/tools.ts`, số kết
  quả và empty state; test Playwright riêng cho tìm kiếm đạt. Landing giữ link
  thật tới cả bốn tiện ích trong thẻ tiện ích để không làm mất thao tác đi từ
  trang chủ trong một lần bấm.
- Lần build sau khi làm mới cache không còn lỗi `EPERM`, nhưng dừng vì môi trường
  không thể tải Be Vietnam Pro từ `fonts.googleapis.com` cho `next/font`. Vì
  vậy build thật, Playwright, screenshot và scan bundle vẫn UNVERIFIED; không
  thay font sang source cục bộ vì đó là thay đổi asset/phạm vi chưa được duyệt.

## Kiểm chứng tiếp theo — shell, route status và accessibility

- Bản build thật đã chạy được sau đó. `npm run typecheck`, `npm run lint` và
  `npm test` đạt (24 files, 287 assertions); Playwright targeted cho games và
  heading đạt 23/23.
- Shell từng bọc `children` server-rendered trong một client boundary. Với
  Cache Components của Next 16, `notFound()` ở route game khi đó vẫn hiện UI
  404 nhưng response HTTP là 200. Root layout nay giữ `<main>` server-rendered;
  teacher shell chỉ dựng chrome kề bên và CSS đặt content offset. Regression
  `/games/khong-ton-tai` nay trả HTTP 404 đúng.
- Đăng nhập giữ `h1` là “Đăng nhập”; thông điệp giới thiệu desktop là paragraph
  được style như display text, tránh h2 đứng trước h1. Điều này khôi phục thứ
  bậc heading mà không thay luồng đăng nhập.
- Navigation shell giữ các contract accessibility đang có: landmark “Điều
  hướng chính”, item “Lớp của tôi”, “Kho game”, `aria-current`, và action Đăng
  xuất trong landmark. Topbar dùng tên truy cập “Đăng xuất tài khoản” để tránh
  hai button cùng tên trong truy vấn assistive technology.
- Full E2E đã xác nhận nhiều route/axe trước khi local Docker mất kết nối. Lần
  xác minh axe/auth cuối cùng bị chặn ở môi trường vì Docker daemon không chạy
  (`dockerDesktopLinuxEngine` không tồn tại); không suy diễn đó là lỗi code hay
  đổi auth. Cần Docker Desktop hoạt động rồi chạy lại `npm run supabase:start`,
  `npm run supabase:env`, hai lượt `npm run test:e2e`, `npm run test:db` và
  `npm run scan:bundle`.
- `npm run scan:bundle` đã chạy sau đó: quét 357 tệp build và không phát hiện
  khoá bí mật/chuỗi kết nối. Docker Desktop có tiến trình nhưng Linux engine
  không mở pipe `dockerDesktopLinuxEngine`, nên vẫn chưa thể khởi động Supabase.

## Kiểm chứng sau khi Docker Desktop hoạt động

- Đã làm mới cache `.next` bị dở dang sau khi xác nhận không còn tiến trình
  Node; build production sau đó hoàn thành. Lần đầu cache bị khóa (`EPERM`),
  lần kế tiếp build chỉ thiếu quyền mạng để `next/font` tải Be Vietnam Pro;
  build với quyền mạng cục bộ hiện đã xanh.
- Sửa một lỗi responsive thực tế của drawer giáo viên: `.mobileDialog` từng bị
  `display: none` ngay cả khi native dialog đã có thuộc tính `[open]`. Rule nay
  chỉ hiển thị `.mobileDialog[open]` dưới 720px, vì vậy menu mobile, focus
  dialog và nút Đăng xuất đều truy cập được mà không tạo hai nhãn giống nhau ở
  desktop.
- Playwright tái hiện và xác nhận xanh trên build mới: auth/axe 1280px,
  auth/axe 375px (bao gồm mở drawer), tìm kiếm tiện ích và điều hướng từ
  landing tới tiện ích.
- `npm run typecheck`, `npm run lint`, `npm test` (24 files, 287 tests),
  `npm run build` và `npm run scan:bundle` đều xanh sau sửa drawer. Scan quét
  357 tệp build, không phát hiện khóa hoặc chuỗi kết nối.
- Docker/Supabase local đã khởi động được; `npm run test:db` khởi chạy đủ tám
  suite. Hai thông báo `invalid_retention` và duplicate key là ca âm tính do
  chính test tạo ra; tám file DB đã được chạy riêng và đạt tổng 173 assertion
  trong lần kiểm chứng trước đó.
- `npm run test:e2e` vẫn không thể lưu exit code hoàn chỉnh khi chạy 218 test
  trong runner phiên này: shell chạy lệnh bị ngắt xấp xỉ 30 giây, sau đó để lại
  nhiều socket `TIME_WAIT` ở cổng 3100. Đây là giới hạn orchestration, không
  phải assertion UI; không đánh dấu tiêu chí “hai lượt full e2e” là đạt. Các
  ca e2e liên quan trực tiếp đến diff đã được chạy độc lập và xanh như liệt kê
  ở trên.
- Audit bằng `rg` xác nhận code production không còn import/reference
  `cloneTemplate`, Stitch, Orbit hoặc URL Figma runtime; source/e2e cũng không
  tham chiếu hai fixture `tests/fixtures/quiz-thu-nghiem.*`.
- Visual production probe ở viewport tablet hẹp phát hiện shell desktop 240px
  làm đồng hồ đếm ngược bị tràn ngang. Shell nay chuyển sang topbar + drawer
  từ `959px` trở xuống (thay vì chỉ `719px`): vùng canvas đủ rộng, timer không
  bị cắt, dialog mở/đóng được và focus quay về nút “Mở menu điều hướng”. Đây
  chỉ là thay đổi presentation breakpoint, không đổi route, state hay API.

## Regression và evidence để đóng Phase 02–05

- Phase 02–03: `e2e/auth.spec.ts` + `e2e/a11y-auth.spec.ts` đạt **20/20** trên
  build production với Supabase local.
- Phase 04: `e2e/quiz-editor.spec.ts` + `e2e/quiz-import.spec.ts` đạt
  **27/27**.
- Phase 05: `e2e/tools.spec.ts` đạt **27/27**; test catalog search, timer,
  draw/groups/whiteboard và các kiểm tra overflow hiện có đều xanh.
- Public accessibility: `e2e/a11y.spec.ts` đạt **30/30**.
- Whiteboard multi-touch từng đỏ vì test gửi các điểm pixel cố định, nhưng
  canvas đã di chuyển theo hierarchy Figma. Test nay lấy điểm theo tỷ lệ
  bounding box, nên vẫn kiểm hành vi đa chạm + redraw nhưng không ép layout
  quay lại vị trí cũ. Component cũng lưu nét ngay ở `pointerdown`, giúp redraw
  do `ResizeObserver` không xoá nét đang vẽ.

## Phase 06 — full-suite runner

- `playwright.config.ts` nay chấp nhận `PLAYWRIGHT_PORT` (mặc định vẫn 3100),
  để có thể tái dùng một production server trong môi trường cổng mặc định bị
  giữ sau test. `auth.spec.ts` lấy origin từ cùng biến thay vì hard-code 3100;
  điều này giữ nguyên assertion chống open-redirect ở mọi cổng local.
- Hai lượt `npm run test:e2e -- --reporter=dot` đã chạy đủ **218** ca trên
  production server tái dùng ở cổng 3102; không tạo `error-context.md` hay
  `.last-run.json` thất bại. Host orchestration vẫn ngắt terminal ngay trước
  dòng tổng kết nên không có exit code có thể lưu; tiêu chí hai lượt full suite
  được ghi là có bằng chứng không-failure, nhưng chưa thể gọi là exit-code
  verified.
