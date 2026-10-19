# Ghi chú triển khai

## Phase 1 - Nền tảng và giao diện

Kết quả kiểm tra trên bản hiện tại (chưa có git, nên chưa có revision):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Đạt |
| `npm run lint` | Đạt, không cảnh báo |
| `npm test` (Vitest) | 20/20 đạt: tương phản WCAG của các cặp token màu |
| `npm run build` | Đạt; 5 trang tĩnh (`/`, `/games`, `/tools`, `/login`, `/icon.svg`) |
| `npm run test:e2e` (Playwright, Chromium) | 9/9 đạt |
| Kiểm tra bằng mắt | Đã xem ảnh chụp trang chủ ở 375px và 1280px, menu điện thoại đang mở, trang `/games` ở 1280px |

Playwright phủ: thương hiệu đọc từ `src/config/site.ts`, không cuộn ngang ở 375px và 1280px, font Be Vietnam Pro đã nạp, mọi liên kết header mở được và có h1, `aria-current`, liên kết "Bỏ qua tới nội dung", viền focus bàn phím, menu điện thoại (mở, đóng bằng nút và Esc, điều hướng).

## Quyết định và lệch so với plan

- **CSS thuần, không Tailwind.** Token là biến CSS trong `src/app/globals.css`, kiểu dáng theo CSS Modules. Giữ ít phụ thuộc, khớp chữ "token CSS" trong plan.
- **Trang tạm cho `/games`, `/tools`, `/login`.** Header và footer cần liên kết hợp lệ nhưng ba trang này thuộc phase 2-4. Phase đó thay nội dung bằng trang thật; `src/components/coming-soon.tsx` xoá khi không còn dùng.
- **Nhãn "Kho game" thay "Khám phá"** trên header để rõ nghĩa với giáo viên, khớp tên dùng ở phase 2.
- **Bốn tiện ích ở trang chủ chưa là liên kết**, vì trang riêng của từng tiện ích có ở phase 3. Một nút "Xem tất cả tiện ích" dẫn tới `/tools`.
- **Khu "Trò chơi nổi bật" là trạng thái trống** theo đúng plan; phase 2 cấp dữ liệu.
- **Năm bản quyền đặt trong cấu hình** (`siteConfig.copyrightYear`), vì Next.js 16 với Cache Components không cho đọc ngày giờ hiện tại ở component tĩnh.
- **Bỏ `vite-tsconfig-paths`.** Vitest 5 hỗ trợ sẵn `resolve.tsconfigPaths`. Cấu hình là `vitest.config.mts`.
- **`typecheck` chạy `next typegen` trước `tsc`**, vì kiểu `LayoutProps` được sinh ra lúc build/dev.
- **`PRODUCT.md` và `DESIGN.md` đã tạo** từ câu trả lời của người dùng và Design Brief. DESIGN.md dùng hex làm nguồn duy nhất, cùng giá trị với `globals.css`; chưa chạy lại `spec` ở chế độ quét code.
- **Chưa chạy `git init`.** Plan ghi "nếu người dùng đồng ý"; thư mục vẫn chưa phải git repo.

## Điều cần biết cho các phase sau

- `next.config.ts` do scaffold bật `cacheComponents` và `partialPrefetching`. Với Cache Components, truy cập `cookies()` hay `headers()` (phase 4, Supabase) phải nằm trong ranh giới `<Suspense>`, và không dùng `new Date()` trong component tĩnh.
- `npm audit` báo 5 lỗ hổng mức cao, đều nằm trong chuỗi công cụ lint của scaffold (`eslint-config-next` → `fast-glob` → `braces`, DoS khi xử lý mẫu glob lồng sâu). Chỉ chạy lúc lint, không vào bản chạy thật. Gợi ý `npm audit fix --force` hạ `eslint-config-next` xuống 14, sai hướng nên không áp dụng; xem lại khi có bản vá.
- Playwright dùng cổng 3100 và `npm run dev`; có thể đổi sang build + start khi thiết lập CI ở phase 5.
- Còn một kiểm tra của phase 1 chưa làm được: "từ trang chủ tới game hoặc tiện ích trong tối đa 2 lần bấm" cần trang game và tiện ích thật, nên chuyển sang nghiệm thu ở phase 2-3.

## Phase 2 - Kho game và nhúng game

Kết quả kiểm tra (chưa commit, working tree còn thay đổi so với `30a79ba`):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt |
| `npm test` (Vitest) | 36/36 đạt: thêm 16 test cho `src/lib/catalog.ts` (lọc theo môn, lớp, từ khoá không dấu, tính toàn vẹn danh mục) |
| `npm run build` | Đạt; `/games/gargamel-bat-xi-trum` được dựng tĩnh |
| `npm run test:e2e` | 20/20 đạt, chạy hai lần liên tiếp trên bản build thật |
| Kiểm tra bằng mắt | Đã xem `/games` ở 375px và 1280px, trang chơi ở 1280px và 375px với game thật đã tải trong iframe |
| Game thật trong iframe | Kiểm tra bằng script Playwright: iframe `src` đúng, lớp phủ "Đang tải" ẩn sau khi tải, game hiển thị trong khung ở cả hai viewport |

Các test e2e về trạng thái tải dùng game giả (chặn mạng); việc game thật chạy được kiểm tra riêng như bảng trên.

### Quyết định và lệch so với plan

- **Bỏ trường `thumbnail`.** Chưa có ảnh đại diện thật cho game, và ảnh trong game có nhân vật của bên thứ ba. Thẻ game dùng khối biểu tượng chung. Thêm trường này khi có ảnh phù hợp.
- **Thêm trường `featured`** để trang chủ biết game nào hiện ở "Trò chơi nổi bật". Khi không có game nổi bật, trang chủ quay về trạng thái trống như phase 1.
- **Môn và lớp rỗng nghĩa là "mọi môn" / "mọi lớp".** Game gọi tên dùng được ở mọi lớp nên để rỗng; bộ lọc luôn giữ lại các game như vậy. Danh sách môn và lớp (`SUBJECTS`, `GRADES`) là quyết định tạm, sửa trong `src/lib/catalog.ts`.
- **Mô tả game viết từ việc xem game chạy thật**, không phải từ tài liệu của game; chủ dự án nên đọc lại cho đúng ý.
- **Tắt `partialPrefetching` trong `next.config.ts`.** Scaffold bật sẵn nhưng dự án không dùng. Khi bật, id không có trong danh mục trả về HTTP 200 (trang chuyển luồng rồi mới gọi `notFound()`), chỉ có thẻ `noindex`; khi tắt, đúng mã 404. `cacheComponents` vẫn bật. Phát hiện nhờ chạy e2e trên bản build thật (chế độ dev lại trả 404 nên che mất lỗi).
- **Thêm `src/app/not-found.tsx` bằng tiếng Việt** để mọi trang 404 (kể cả id game sai) không rơi về trang mặc định tiếng Anh.
- **Playwright chạy bản build thật** (`npm run build && npm run start`) thay cho `next dev`. Lần chạy dev trước đó dùng chung thư mục `.next` với `next build` và từng báo `SyntaxError: Unexpected end of JSON input`, làm hai test thất bại; sau khi xoá `.next` và chạy lại thì đạt. Bản build thật cũng bỏ vấn đề đó.
- **Iframe chỉ dựng sau khi hydrate** (`useSyncExternalStore`), để sự kiện `load` không bị bỏ lỡ. `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"`; nút "Mở trong tab mới" luôn hiện vì không thể phát hiện lỗi tải iframe khác origin. Sau 8 giây chưa tải xong, lớp phủ gợi ý dùng nút đó. Nút "Toàn màn hình" ẩn khi trình duyệt không hỗ trợ (ví dụ iPhone).

### Còn lại cho phase này

- Chưa kiểm tra trên điện thoại thật (âm thanh, toàn màn hình, cảm ứng): plan yêu cầu kiểm tra thủ công.
- Quyết định bản quyền của game (Peyo/IMPS, Ubisoft) vẫn chờ chủ dự án trước khi công khai ở phase 5. Trang chơi đang hiển thị đúng dòng ghi nguồn của chính game.

## Phase 3 - Tiện ích lớp học

Kết quả kiểm tra (chưa commit, working tree còn thay đổi so với `2dea2c0`):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt |
| `npm test` (Vitest) | 56/56 đạt: thêm 20 test cho logic bốc thăm, chia nhóm, đếm ngược (`src/lib/utilities/utilities.test.ts`) |
| `npm run build` | Đạt; 4 trang tiện ích được dựng tĩnh |
| `npm run test:e2e` | 43/43 đạt, chạy hai lần liên tiếp trên bản build thật |
| Kiểm tra bằng mắt | Đã xem đồng hồ (1280px), bốc thăm (375px), chia nhóm (1280px), bảng trắng có nét vẽ (1280px) |

Playwright phủ: cả bốn tiện ích mở được khi chưa đăng nhập ở 375px và 1280px và không cuộn ngang; từ trang chủ tới từng tiện ích trong 1 lần bấm; đếm ngược, tạm dừng, chạy tiếp, đặt lại và hết giờ (đồng hồ giả của Playwright); bốc thăm không lặp, bốc hết thì dừng và có lời nhắn; chia nhóm theo số nhóm và theo số người, báo lỗi; bảng trắng vẽ, tẩy, xoá và vẽ bằng cảm ứng giả lập; chiếu toàn màn hình và thoát.

### Quyết định và lệch so với plan

- **Logic thuần nằm ở `src/lib/utilities/`**, giao diện ở các component `*-tool.tsx`; các hàm nhận bộ sinh số và mốc thời gian làm tham số để kiểm thử xác định.
- **Tên trùng được giữ nguyên** khi bốc thăm và chia nhóm, vì có thể là hai bạn khác nhau (game cũ cũng có "Anh 01", "Anh 04"). Plan chỉ nói "xử lý trùng tên".
- **Đồng hồ đếm theo mốc kết thúc** (`endsAt`) chứ không trừ dần từng tick, nên tab bị trình duyệt làm chậm vẫn hết giờ đúng lúc. Giới hạn 99 phút 59 giây.
- **Chia theo "số người mỗi nhóm"** tính số nhóm bằng phần nguyên trên của tổng chia cho số đó rồi chia đều, nên mọi nhóm không vượt quá giới hạn và chênh nhau tối đa 1 người (7 người, mỗi nhóm 2: ra 4 nhóm gồm 2-2-2-1).
- **Bảng trắng lưu nét vẽ theo toạ độ chuẩn hoá** và vẽ lại khi khung đổi kích thước (ví dụ vào toàn màn hình), nên không mất nét. Không có hoàn tác và không lưu nội dung, đúng phạm vi plan. Màu bút là hex khớp token trong DESIGN.md vì canvas không đọc được biến CSS.
- **Lỗi phát hiện khi viết test:** canvas đặt trực tiếp trong bố cục flex làm kích thước bitmap tác động ngược lên bố cục, `ResizeObserver` bắn liên tục (46 lần trong 1,5 giây, chiều cao tăng dần) và xoá sạch nét vẽ. Sửa bằng cách đặt canvas tuyệt đối trong một khung có chiều cao cố định; giờ chỉ bắn 1 lần ban đầu.
- **Thêm lời nhắn khi bốc hết cả lớp** cạnh nút, vì nút bị tắt mà không có giải thích; tên bạn vừa bốc vẫn hiện ở khung kết quả.
- **Hiệu ứng quay tên** kéo dài khoảng 0,9 giây và bị bỏ qua khi hệ thống bật giảm chuyển động.
- **Thêm các thành phần dùng chung:** `ToolStage` (khung có nút toàn màn hình), `ToolPage`, `ToolCard`, `Breadcrumb` (trang game cũng dùng lại), `NameListInput`. Trang chủ và `/tools` lấy danh sách từ `src/data/tools.ts`; thẻ tiện ích ở trang chủ giờ là liên kết.
- **Chưa lưu danh sách tên** giữa các lần mở trang; việc lưu lớp thuộc phase 4.

### Còn lại cho phase này

- Chưa kiểm tra trên thiết bị thật: cảm ứng và độ mượt của canvas trên điện thoại cũ, âm báo hết giờ (test không nghe được âm thanh), toàn màn hình trên iPhone (không hỗ trợ nên nút ẩn đi).
