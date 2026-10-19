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
