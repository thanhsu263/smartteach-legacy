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

## Sửa sau review phase 1-3

Review `hs-code-review` (commit 30a79ba, 2dea2c0, 613ac25) tìm ra hai lỗi Medium và một lỗi Low đã tái hiện được. Mỗi lỗi có test hồi quy; các test đó đã được chạy trên mã chưa sửa và thất bại (bốc thăm: không tìm thấy "Còn 1 / 2 bạn"; bảng trắng: 38 pixel còn lại so với hơn 931 mong đợi; tiêu đề: `/tools` nhảy h1 → h3 và trang chủ có h2 trong h2), rồi đạt sau khi sửa.

| Lỗi | Nguyên nhân gốc | Sửa | Test hồi quy |
|---|---|---|---|
| Bốc thăm đếm sai và khoá nút sau khi bật lại "Không bốc lại" (hiện "Còn -2 / 2 bạn") | Đếm bằng `taken.length`, mà lịch sử có thể chứa cùng một người nhiều lần khi tuỳ chọn tắt | Hàm `remainingCount` chỉ đếm người khác nhau còn trong danh sách ([draw.ts](../../src/lib/utilities/draw.ts)); component dùng nó cho cả "còn lại" và "bốc hết" | 4 unit test `remainingCount`; e2e "bật lại 'Không bốc lại' sau nhiều lượt bốc lặp" (cố định `Math.random` để kết quả xác định) |
| Bảng trắng mất nét của ngón đang vẽ khi có ngón thứ hai chạm | `handleDown` ghi đè `drawing.current` nên nét đầu không bao giờ vào danh sách nét và biến mất ở lần vẽ lại | Bỏ qua con trỏ thứ hai khi nét đầu còn được bắt; nếu con trỏ cũ đã mất quyền bắt thì lưu nét dở rồi nhận nét mới; thêm `onLostPointerCapture` | e2e "chạm hai ngón không làm mất nét" (giả lập hai ngón, đổi kích thước, so điểm ảnh còn lại) |
| Cấp tiêu đề nhảy (`/tools` h1 → h3; trang chủ h2 lồng trong h2) | Thẻ game và thẻ tiện ích cố định cấp tiêu đề (h2 và h3) bất kể nằm ở đâu | Prop bắt buộc `headingLevel` (2 hoặc 3) cho `GameCard` và `ToolCard`; trang chủ dùng 3, `/games` và `/tools` dùng 2 | e2e `headings.spec.ts`: mọi trang có đúng một h1 và không nhảy cấp, cộng kiểm tra chính xác cấu trúc tiêu đề trang chủ |

Quyết định: khi đang có nét vẽ, ngón thứ hai bị bỏ qua (ưu tiên con trỏ đầu) thay vì vẽ song song. Cách này tránh vệt do lòng bàn tay chạm vào bảng cảm ứng; muốn hai người vẽ cùng lúc thì đổi sang lưu nét theo từng `pointerId`.

Kết quả sau sửa: typecheck, lint đạt; 60 unit test và 55 e2e đạt (hai lần liên tiếp trên bản build thật). Chưa sửa các mục Low 2 (DESIGN.md thiếu token `--color-on-primary-muted`) và ba verification gap còn lại của review.

## Phase 4 - Đăng nhập, lớp và yêu thích

Kết quả kiểm tra (chưa commit, working tree còn thay đổi so với `5dd371b`). Backend kiểm thử là stack Supabase chạy cục bộ trong Docker (`npm run supabase:start`), theo lựa chọn của chủ dự án.

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt |
| `npm test` (Vitest) | 75/75 đạt: thêm test cho `safeNextPath`, lời nhắn lỗi đăng nhập và cơ sở dữ liệu, kiểm tra tên/số lượng |
| `npm run test:db` (RLS trên Postgres thật của Supabase) | 13/13 đạt. Đã kiểm tra tính hiệu lực bằng cách tạm phá bảo vệ: mở chính sách đọc của `classes` làm hỏng 2 test; tắt trigger giới hạn lớp làm hỏng test giới hạn; khôi phục thì đạt lại |
| `npm run test:e2e` | 69/69 đạt, hai lần liên tiếp trên bản build thật có Supabase cục bộ |
| E2E khi không có Supabase (không có `.env.local`) | 55 đạt, 14 test đăng nhập tự bỏ qua; ứng dụng chạy ở chế độ khách |
| `npm run build` | Đạt; `/auth/callback` và `Proxy` xuất hiện trong danh sách route |
| Kiểm tra bằng mắt | Đã xem Lớp của tôi (1280px), chi tiết lớp (1280px), đăng nhập (375px), lời mời đăng nhập khi khách bấm yêu thích |

Phủ bởi test: khách vào `/my-classes` bị chuyển tới `/login?next=…`; khách và học sinh dùng game và tiện ích không bị hỏi đăng nhập; đăng ký, đăng xuất, đăng nhập lại; sai mật khẩu; `next` trỏ ra ngoài bị bỏ qua; tạo lớp có danh sách, thêm, sửa, xoá học sinh, đổi tên và xoá lớp (có xác nhận); chọn lớp đã lưu trong bốc thăm và chia nhóm; khách không thấy ô chọn lớp; giáo viên B không thấy hay mở được lớp của A; yêu thích bật tắt, giữ qua lần tải lại, hiện ở Lớp của tôi, riêng từng giáo viên; không cuộn ngang ở 375px.

### Quyết định và lệch so với plan

- **Tên file migration:** `supabase/migrations/20261019150000_classes_students_favorites.sql` (CLI Supabase bắt buộc tiền tố thời gian) thay cho `0001_…` trong plan. Có thêm `GRANT` rõ ràng cho `authenticated` và `REVOKE` với `anon`, vì Supabase đang chuyển sang yêu cầu GRANT tường minh.
- **Giới hạn do cơ sở dữ liệu ép** bằng trigger kèm khoá advisory theo chủ sở hữu (hoặc theo lớp): 20 lớp, 100 học sinh, tên 1-100 ký tự. Bài thử 25 lần tạo lớp song song cho đúng 20 thành công. Chủ lớp và lớp của học sinh không đổi được sau khi tạo (chặn chuyển lớp sang người khác và né giới hạn).
- **`proxy.ts` thay cho `middleware.ts`:** Next.js 16 đã đổi tên. Matcher chỉ gồm `/my-classes/:path*` và `/login`, nên các trang công khai không tốn thêm một lần gọi Supabase. Dùng `getClaims()` (kiểm tra JWT cục bộ). Kiểm tra thứ hai ở server nằm trong `my-classes/layout.tsx` (`RequireUser`, trong Suspense vì đọc cookie). Dữ liệu thật vẫn do RLS bảo vệ.
- **Trạng thái đăng nhập ở header đọc phía trình duyệt** (`AuthProvider`, sự kiện `INITIAL_SESSION` đọc từ cookie, không gọi mạng) để các trang công khai vẫn dựng tĩnh. Hệ quả: giáo viên đã đăng nhập có thể thấy chữ "Đăng nhập" thoáng qua trước khi chuyển thành "Lớp của tôi / Đăng xuất". `SiteNav` phải nằm trong Suspense vì dùng `usePathname`; có bản dự phòng tĩnh `SiteNavFallback`.
- **Dữ liệu lớp và yêu thích truy cập trực tiếp từ trình duyệt qua RLS** (không có API riêng): bớt một lớp mã phải bảo vệ, và RLS là hàng rào duy nhất cần đúng.
- **Chống chuyển hướng ra ngoài:** `safeNextPath` chỉ nhận đường dẫn nội bộ (loại `//host`, `/\host`, ký tự điều khiển, URL tuyệt đối), dùng ở form, route callback và proxy.
- **Đã xử lý cả hai chế độ email:** nếu dự án bật xác nhận email thì hiện lời nhắn kiểm tra hộp thư; trang `/auth/callback` đổi mã lấy phiên cho cả liên kết email lẫn Google.
- **Chưa làm quên mật khẩu** (plan không yêu cầu).
- **Khi chưa cấu hình Supabase** (thiếu biến môi trường) ứng dụng vẫn chạy: trang đăng nhập báo chưa cấu hình, không lỗi.
- **`partialPrefetching: false` khai báo tường minh** trong `next.config.ts` để Next.js không cảnh báo (trước đó chỉ bỏ dòng này).
- **Xoá `coming-soon`:** không còn trang tạm nào.
- **Cấu hình Supabase cục bộ rút gọn** (`supabase/config.toml`): tắt realtime, studio, storage, edge runtime, analytics, email thử để giảm dung lượng tải; URL đăng nhập trỏ `http://localhost:3100`.
- **Khi viết e2e:** Next.js (Cache Components) giữ lại trang trước ở dạng ẩn trong DOM, và React giữ một bản HTML ẩn của đoạn Suspense trong giây lát sau khi tải. Test dùng `getByRole` hoặc `filter({ visible: true })` thay vì `getByLabel`/`getByText` trần.
- **Task 4.6 (truyền danh sách lớp vào game) chưa làm**, đúng như plan ghi là tuỳ chọn: cần sửa mã nguồn game ở repo khác.

### Việc cần chủ dự án làm (ngoài tầm tự động)

- Tạo dự án Supabase thật, rồi đặt `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (xem `.env.example`). Áp migration lên dự án thật là ghi ra bên ngoài nên cần xác nhận ở phase 5.
- Tạo OAuth client trong Google Cloud và bật Google trong Supabase Auth, URL gọi lại là `<domain>/auth/callback`. Đăng nhập Google chưa được kiểm tra vì cần cấu hình thật.
- Chạy lại kiểm thử đăng nhập và RLS trên dự án thật sau khi áp migration.

## Sửa sau review phase 4

Review `hs-code-review` (commit dd963e4) tìm ra một lỗi High, một lỗi Medium và năm mục Low. Mỗi lỗi có test hồi quy chạy trên mã chưa sửa và thất bại (unit: `safeNextPath("/..//evil.example")` trả `//evil.example`, `isUuid` chưa có; DB: 8 test hỏng khi chưa có migration mới), rồi đạt sau khi sửa. Riêng test e2e đăng nhập đã được thử lại với `safeNextPath` cũ: thất bại với `Received "http://evil.example/"`, đạt khi dùng bản sửa.

| Mục | Nguyên nhân gốc | Sửa | Test hồi quy |
|---|---|---|---|
| **High** open redirect sau đăng nhập | `safeNextPath` kiểm tra chuỗi gốc nhưng trả về đường dẫn đã chuẩn hoá bởi `new URL`; `/..//host`, `/.//host`, `/%2e%2e//host` chuẩn hoá thành `//host` | Kiểm tra lại kết quả cuối (không được bắt đầu bằng `//`, cùng gốc). Thêm `internalRedirectUrl` làm lớp kiểm tra thứ hai ở callback và proxy | Unit: các dạng dấu chấm, và 10^4 tổ hợp đoạn đường dẫn đều cho kết quả cùng gốc (phép thử này tự tìm ra thêm `/.///`); unit cho route `/auth/callback` (thành công, không next, next độc hại, mã sai, thiếu mã, chưa cấu hình); e2e đăng nhập với 5 giá trị `next` độc hại, và e2e gọi `/auth/callback` với mã sai |
| **Medium** yêu thích không giới hạn (5000 dòng/tài khoản) | Chỉ lớp và học sinh có trigger giới hạn | Migration `20261020090000`: trigger tối đa 100 game yêu thích mỗi giáo viên (khoá advisory) và ràng buộc dạng id `^[a-z0-9]+(-[a-z0-9]+)*$` (cùng quy ước id danh mục) | DB: vượt 100 một lần và nhiều dòng một lần, thêm song song 120 cho đúng 100, id sai dạng bị chặn, B không sửa/xoá yêu thích của A; unit cho lời nhắn lỗi |
| Low 1: proxy làm hỏng `next` có query (`/games%3Fx=1`) | Gán `url.pathname` mã hoá dấu `?` | Dựng URL đầy đủ từ `next` | E2E: `/login?next=/games?q=xi` khi đã đăng nhập giữ nguyên query |
| Low 2: `/my-classes/abc` báo lỗi chung kèm "Thử lại" | id không phải UUID làm PostgREST lỗi `22P02` | `isUuid` kiểm tra trước, báo "Không tìm thấy lớp này" | Unit `isUuid`; e2e `/my-classes/abc` |
| Low 3: chưa có header bảo mật | Chưa cấu hình | `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `CSP: frame-ancestors 'none'`. CSP đầy đủ cho script để phase 5 | E2E `security.spec.ts` trên 5 trang (cả trang bị proxy chuyển hướng) |
| Low 4: tạo lớp không nguyên tử | Hai lệnh riêng, dọn dẹp chỉ cố gắng hết sức | Hàm SQL `create_class_with_students` chạy với quyền người gọi (RLS và giới hạn vẫn áp dụng), một giao dịch | DB: tạo đúng thứ tự, danh sách rỗng, lỗi ở học sinh không để lại lớp nào, khách không gọi được, vẫn giới hạn 20 lớp |
| Low 5: `config.toml` cục bộ có thể bị đẩy nhầm lên dự án thật | Chưa có cảnh báo | Đầu tệp ghi rõ chỉ dùng cục bộ, không `supabase config push` | (không áp dụng) |

Kết quả sau sửa: typecheck, lint đạt; 87 unit, 22 test RLS/DB, 78 e2e (hai lần liên tiếp trên bản build thật với Supabase cục bộ). Migration mới đã áp lên stack cục bộ bằng `npx supabase migration up`; áp lên dự án thật vẫn thuộc phase 5 và cần xác nhận.

Còn lại từ review phase 4: chưa có thông báo quyền riêng tư cho dữ liệu tên học sinh (cần chủ dự án quyết định trước khi công khai); Google OAuth và dự án Supabase thật chưa được thử; CSP đầy đủ cho script; một test RLS cho "khách đọc `students`" (đã có ở nhóm khách chưa đăng nhập).

## Phase 5 - Triển khai và nghiệm thu

Phần làm được ở máy đã xong (5.1 và phần cục bộ của 5.3). Việc triển khai thật (5.2) chưa làm: cần quyết định bản quyền của game, tài khoản Vercel và Supabase, và Google Cloud của chủ dự án; mọi bước ghi ra bên ngoài cần xác nhận.

### Đã làm

- **`README.md`:** chạy ở máy (chế độ khách và có Supabase cục bộ), bảng lệnh, biến môi trường, cấu trúc thư mục, và quy trình triển khai Vercel + Supabase (có ghi rõ chưa chạy thật), cách xử lý khi Supabase tạm dừng dự án, danh sách nghiệm thu sau triển khai.
- **Đối chiếu gói miễn phí theo trang giá ngày 2026-10-19:** Supabase Free: 2 dự án hoạt động, 500 MB cơ sở dữ liệu, 50.000 người dùng hoạt động hằng tháng, 5 GB băng thông, **tạm dừng sau 1 tuần không hoạt động**. Vercel Hobby: dành cho mục đích cá nhân, phi thương mại; 100 GB băng thông, 1 triệu yêu cầu mỗi tháng; hết hạn mức thì bị giới hạn, không mua thêm được. Dự án miễn phí cho giáo viên phù hợp điều kiện phi thương mại; nếu sau này thu phí thì phải đổi gói. Cần kiểm tra lại trước khi triển khai.
- **Rà soát WCAG A/AA bằng axe** (`e2e/a11y.spec.ts`, `e2e/a11y-auth.spec.ts`): mọi trang công khai ở 375px và 1280px (kể cả trang 404), các trạng thái (đăng ký, lời mời đăng nhập khi yêu thích, không có kết quả lọc, đồng hồ hết giờ và lỗi, bốc thăm đã hết, chia nhóm lỗi và có kết quả, bảng trắng, menu điện thoại mở) và khi đã đăng nhập (Lớp của tôi, xác nhận xoá, chi tiết lớp, sửa tên, đổi tên lớp, chọn lớp trong tiện ích, điều hướng). Không có vi phạm. Đã kiểm tra bộ quét có tác dụng: chèn cố ý nút không tên, chữ nhạt và ảnh thiếu alt thì axe báo `button-name`, `color-contrast`, `image-alt`. Axe không thay thế kiểm tra bằng trình đọc màn hình và bàn phím thủ công.
- **Không có khoá bí mật:** khoá `service_role` và khoá secret của Supabase không có trong file được theo dõi, và không có trong gói chạy trên trình duyệt (so sánh trực tiếp giá trị thật); JWT duy nhất trong gói là vai trò `anon`. `.env.local` bị bỏ qua khỏi git. `npm audit --omit=dev` báo 0 lỗ hổng.
- **Dọn các mục review còn lại:** thêm token `on-primary-muted` vào DESIGN.md; Playwright chỉ tái dùng server đang chạy khi không ở CI (tránh báo đạt giả trên server cũ); thêm test cho đường quay tên có hiệu ứng.

### Quyết định của chủ dự án trong phase 5

- **Bản quyền game:** giữ game và công khai kèm ghi nguồn; chủ dự án chịu trách nhiệm về nội dung của bên thứ ba. Không có thay đổi mã; README ghi rõ để có phương án gỡ nếu bên sở hữu yêu cầu.
- **Quyền riêng tư:** soạn bản nháp để chủ dự án xem lại. Đã thêm trang `/privacy` (liên kết ở chân trang và trang đăng nhập) nêu dữ liệu lưu, mục đích, nơi lưu, cookie, game bên khác và cách xoá. Trang hiện biểu ngữ "bản nháp" cho tới khi đặt `privacyReviewed: true` trong `src/config/site.ts`; email liên hệ lấy từ `contactEmail` (chưa điền thì trang nói thẳng là chưa có địa chỉ). Đây không phải tư vấn pháp lý: cần rà theo quy định hiện hành về bảo vệ dữ liệu cá nhân của Việt Nam, đặc biệt dữ liệu trẻ em. Chưa có chức năng tự xoá tài khoản trong ứng dụng, chỉ xoá lớp, học sinh và yêu thích.
- **Cách triển khai:** chủ dự án tự thao tác trên Vercel, Supabase, Google Cloud theo README; tôi chỉ hướng dẫn và chạy kiểm tra, không cần quyền truy cập các dịch vụ đó.

### Lệch so với plan

- **Không chạy Playwright trên URL công khai** như 5.3 viết: các test đăng nhập tạo tài khoản và dữ liệu thật trong dự án. Nghiệm thu trên môi trường thật làm tay theo danh sách trong README, dùng tài khoản thử rồi xoá; toàn bộ bộ test chạy trên bản build thật với Supabase cục bộ.

### Kết quả kiểm tra

typecheck, lint đạt; 87 unit, 22 test RLS/DB, 115 e2e (hai lần liên tiếp trên bản build thật, có Supabase cục bộ); build đạt.

### Nghiệm thu giai đoạn 1 theo tiêu chí của Decision Brief

| Tiêu chí | Bằng chứng | Trạng thái |
|---|---|---|
| Khách mở trang chủ và danh mục game, lọc theo môn và lớp | Unit `catalog.test.ts`; e2e `games.spec.ts`, `home.spec.ts` | Đạt (cục bộ) |
| Game quyentran.online mở được từ hub trên điện thoại và máy tính | E2E kiểm tra iframe ở 375px và 1280px (game giả); script riêng tải game thật và thấy hiển thị ở cả hai viewport (phase 2) | Đạt trên trình duyệt giả lập. **Chưa thử điện thoại thật** (âm thanh, toàn màn hình, cảm ứng) |
| Tiện ích dùng được không cần đăng nhập | Unit logic; e2e `tools.spec.ts`; `auth.spec.ts` kiểm tra khách không bị hỏi đăng nhập | Đạt (cục bộ) |
| Giáo viên đăng ký, đăng nhập, đăng xuất; học sinh không cần tài khoản | E2E `auth.spec.ts` bằng email trên Supabase cục bộ | Email đạt (cục bộ). **Google chưa thử** (cần OAuth thật) |
| Lưu danh sách lớp, dùng lại cho bốc thăm/chia nhóm, chỉ xem/sửa dữ liệu của mình | 22 test RLS trên Postgres thật (đã thử phá bảo vệ thì test hỏng); e2e hai giáo viên | Đạt (cục bộ). **Chưa chạy trên dự án Supabase thật** |
| Yêu thích bật/tắt; khách được gợi ý đăng nhập | E2E `auth.spec.ts` | Đạt (cục bộ) |
| Triển khai công khai trên free tier, chi phí hạ tầng 0 | Đã đối chiếu trang giá (xem trên) | **Chưa triển khai** (5.2) |
| Trạng thái giao diện và WCAG AA | Axe trên 30 trang/trạng thái công khai và 2 luồng đã đăng nhập; unit tương phản token; e2e menu, focus, tiêu đề | Đạt bằng công cụ. **Chưa thử trình đọc màn hình** |

### Việc còn lại trước khi công khai (cần chủ dự án)

1. **Quyết định bản quyền của game** (Peyo/IMPS, Ubisoft; game tự ghi "nội bộ, phi thương mại"): đưa lên hub công khai, thay bằng game khác, hay chỉ cho phép nội bộ.
2. **Thông báo quyền riêng tư:** ứng dụng lưu tên học sinh (trẻ em) trên cơ sở dữ liệu đám mây nhưng chưa có điều khoản hay chính sách quyền riêng tư. Cần quyết định nội dung và nơi đặt trước khi công khai.
3. **Tạo dự án Supabase và Vercel, cấu hình Google OAuth, áp migration** theo README; sau đó chạy danh sách nghiệm thu sau triển khai bằng tài khoản thử.
4. **Tên thương hiệu và tên miền** (hiện là "SmartTeach" tạm); thêm `metadataBase` khi có domain.
5. **CSP đầy đủ cho script** (hiện mới có `frame-ancestors`). Dùng nonce buộc các trang phải dựng động, đánh đổi với việc dựng tĩnh, nên chưa làm; cần quyết định.
6. Kiểm tra thủ công trên điện thoại thật và bằng trình đọc màn hình.
