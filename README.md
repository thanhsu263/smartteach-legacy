# SmartTeach

Hub tiện ích giảng dạy cho giáo viên Việt Nam: kho trò chơi học tập (nhúng game của quyentran.online), tiện ích lớp học chạy trên trình duyệt (đồng hồ đếm ngược, bốc thăm tên, chia nhóm, bảng trắng), và tài khoản giáo viên để lưu danh sách lớp và game yêu thích. Học sinh không cần tài khoản.

`SmartTeach` là tên tạm, đổi ở `src/config/site.ts`. Hướng đi, thiết kế và kế hoạch nằm ở [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) và thư mục [plans](plans).

Giai đoạn 1 (MVP) gồm: hub, kho game có lọc theo môn và lớp, nhúng game, bốn tiện ích, đăng nhập giáo viên (Google và email), lớp của tôi, game yêu thích. Quiz chơi bằng PIN và đề thi online là giai đoạn 2 và 3.

## Yêu cầu

- Node.js 24 và npm.
- Docker Desktop, chỉ khi chạy hoặc kiểm thử phần đăng nhập và lưu dữ liệu ở máy (Supabase cục bộ).

## Chạy ở máy

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Không cần cấu hình gì thêm: khi chưa có Supabase, ứng dụng chạy ở chế độ khách (kho game và tiện ích dùng được, trang đăng nhập báo chưa cấu hình).

### Có đăng nhập và lưu dữ liệu (Supabase cục bộ)

```bash
npm run supabase:start   # lần đầu tải vài GB image Docker
npm run supabase:env     # ghi .env.local từ stack đang chạy
npm run dev
```

`supabase:start` tự áp các migration trong `supabase/migrations`. Dừng stack bằng `npm run supabase:stop`. Cấu hình cục bộ (`supabase/config.toml`) cố ý khác dự án thật (tắt xác nhận email, URL là localhost) nên **không** dùng `supabase config push` lên dự án thật.

Realtime của stack cục bộ đã được bật (`[realtime] enabled = true` trong `supabase/config.toml`) cho giai đoạn 2: lần `supabase:start` đầu tiên sau khi bật sẽ tải thêm image `supabase/realtime` (vài trăm MB). Realtime chỉ làm "chuông báo" `{ seq }` cho quiz chơi trực tiếp; nếu tắt, trò chơi vẫn chạy nhờ polling nhưng test `tests/db/live-realtime.test.ts` sẽ không đạt.

**Lưu trữ dữ liệu quiz.** Dữ liệu người chơi của quiz trực tiếp (biệt danh, câu trả lời, điểm) tự xoá sau 90 ngày bằng hàm `private.purge_old_sessions`, gọi theo hai đường: `pg_cron` mỗi ngày lúc 3:17 (migration `20261023090000_results_retention.sql` lập lịch **nếu** tiện ích có và bật được, không thì bỏ qua mà không lỗi) và xoá cơ hội mỗi khi một giáo viên tạo phiên mới. Hệ quả: nếu dự án thật chưa bật `pg_cron` và không giáo viên nào tạo phiên mới thì dữ liệu cũ có thể ở lại lâu hơn 90 ngày; bật `pg_cron` trên dự án thật (xem task 8.3 của giai đoạn 2) để xoá đúng hạn. Giáo viên xoá được ngay từng buổi ở mục "Các buổi đã chơi" của quiz.

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy ở chế độ phát triển |
| `npm run build`, `npm start` | Build và chạy bản production |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit test (Vitest), không cần dịch vụ ngoài |
| `npm run test:db` | Kiểm thử RLS và giới hạn trên Postgres thật; cần `supabase:start` |
| `npm run test:e2e` | Playwright trên bản build thật; các test đăng nhập cần `supabase:start` và `supabase:env`, nếu không sẽ tự bỏ qua |

Lần đầu chạy e2e cần cài trình duyệt: `npx playwright install chromium`.

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Địa chỉ dự án Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Khoá công khai (anon / publishable) của dự án |

Mẫu ở [.env.example](.env.example). Không bao giờ đặt khoá `service_role` trong ứng dụng, trong repo hay ở biến `NEXT_PUBLIC_*`. Khoá này chỉ dùng ở máy cho `npm run test:db` và lấy từ stack cục bộ.

## Cấu trúc

```
src/app/              trang và route (App Router)
src/components/       thành phần giao diện
src/config/           tên thương hiệu, điều hướng
src/data/             danh mục game và tiện ích
src/lib/              logic thuần (lọc game, bốc thăm, chia nhóm, đếm ngược, lớp học) và client Supabase
src/proxy.ts          làm mới phiên và chuyển hướng trang giáo viên
supabase/migrations/  schema, RLS, giới hạn
e2e/, tests/db/       kiểm thử đầu cuối và cơ sở dữ liệu
```

Thêm game mới: thêm một mục vào `src/data/games.ts` (id chỉ gồm chữ thường, số, gạch ngang).

## Triển khai (Vercel và Supabase, gói miễn phí)

> Quy trình này đã được chủ dự án chạy một lần trên dịch vụ thật (xem `plans/20261019-smartteach-giai-doan-1/implementation-notes.md`). Mỗi bước ghi ra bên ngoài máy (tạo dự án, áp migration, cấu hình OAuth, triển khai) cần được người chủ dự án làm hoặc xác nhận. Thứ tự dưới đây là thứ tự đã dùng: tạo Vercel **trước** khi cấu hình URL đăng nhập, vì Supabase và Google cần biết tên miền thật.

Giới hạn gói miễn phí theo trang giá ngày 2026-10-19; kiểm tra lại trước khi triển khai vì có thể đổi:

- **Supabase Free:** 2 dự án đang hoạt động, 500 MB cơ sở dữ liệu mỗi dự án, 50.000 người dùng hoạt động hằng tháng, 5 GB băng thông, và dự án **bị tạm dừng sau 1 tuần không hoạt động**.
- **Vercel Hobby:** dành cho mục đích cá nhân, phi thương mại; 100 GB băng thông và 1 triệu yêu cầu mỗi tháng, hết hạn mức thì bị giới hạn, không mua thêm được.

1. **Hoàn tất hai việc của chủ dự án trước khi công khai:**
   - *Bản quyền game.* Game `Gargamel bắt Xì Trum` có nhân vật Peyo/IMPS và nhạc Ubisoft, tự ghi "nội bộ, phi thương mại". Chủ dự án đã chọn giữ game và công khai kèm ghi nguồn (hub hiển thị đúng dòng ghi nguồn của game, ở `src/data/games.ts`); chủ dự án chịu trách nhiệm về nội dung của bên thứ ba và nên chuẩn bị phương án gỡ game nếu bên sở hữu yêu cầu.
   - *Quyền riêng tư.* Trang `/privacy` hiện là bản nháp (có biểu ngữ). Đọc và sửa nội dung cho đúng thực tế và quy định hiện hành về bảo vệ dữ liệu cá nhân (đặc biệt dữ liệu của trẻ em), điền `contactEmail`, rồi đặt `privacyReviewed: true` trong `src/config/site.ts` để bỏ biểu ngữ. Nếu sau này truyền danh sách lớp vào game nhúng, phải cập nhật đoạn "Game do bên khác cung cấp".
2. **Tạo dự án Supabase** trên supabase.com. Lấy URL và khoá anon ở Project Settings, mục API.
3. **Áp migration lên dự án thật:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <mã dự án>
   npx supabase db push
   ```
   Chỉ dùng `db push`, không dùng `config push`.
4. **Đưa mã lên GitHub** (repo riêng tư) rồi **tạo dự án Vercel** từ repo đó. Đặt hai biến môi trường ở bảng trên cho cả Production và Preview (giá trị khoá là Publishable key, không phải Secret key). Triển khai và ghi lại địa chỉ Vercel.
5. **Tạo OAuth client Google** trong Google Cloud Console (Google Auth Platform, loại Web application): thêm `https://<mã dự án>.supabase.co/auth/v1/callback` làm URI chuyển hướng được phép và địa chỉ Vercel làm nguồn JavaScript được phép. Chỉ giữ các scope cơ bản (`openid`, email, profile). Muốn mọi giáo viên đăng nhập được thì chuyển ứng dụng từ Testing sang In production.
6. **Cấu hình đăng nhập trong Supabase (Authentication):**
   - Providers, Google: bật, điền Client ID và Secret (chỉ dán vào Supabase).
   - Email: bật, giữ bật xác nhận email (mặc định).
   - URL Configuration: Site URL là địa chỉ Vercel; Redirect URLs thêm `https://<địa chỉ Vercel>/auth/callback`.
7. **Nghiệm thu bằng tay** theo mục dưới, dùng tài khoản thử.
8. **Sau khi có tên miền riêng,** thêm `metadataBase` vào `src/app/layout.tsx` để tiêu đề và thẻ chia sẻ dùng đúng địa chỉ, và cập nhật Site URL, Redirect URLs, nguồn JavaScript của Google cho khớp.

### Dự án Supabase bị tạm dừng

Nếu dự án không có hoạt động suốt một tuần, Supabase tạm dừng nó và đăng nhập báo lỗi. Vào dashboard, bấm "Restore project" (thường mất vài phút). Kho game và tiện ích không phụ thuộc Supabase nên vẫn dùng được trong thời gian đó. Nếu cần giữ dự án luôn hoạt động, đặt một tác vụ gọi định kỳ vào API công khai của dự án; việc này nằm ngoài ứng dụng.

### Nghiệm thu sau triển khai

- Mở trang chủ, kho game, từng tiện ích khi chưa đăng nhập, ở điện thoại và máy tính.
- Mở game từ hub: chạy được, âm thanh và toàn màn hình hoạt động.
- Đăng ký bằng email, xác nhận, đăng nhập, tạo lớp, dùng lớp trong bốc thăm, bật yêu thích, đăng xuất.
- Đăng nhập bằng Google.
- Dùng tài khoản thứ hai: không thấy lớp và yêu thích của tài khoản đầu.
- Không chạy `npm run test:e2e` nhắm vào dự án thật: các test đăng nhập tạo tài khoản và dữ liệu thật. Nghiệm thu trên môi trường thật làm tay theo danh sách trên, dùng tài khoản thử rồi xoá đi.
