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

**Lưu trữ dữ liệu quiz.** Dữ liệu người chơi của quiz trực tiếp (biệt danh, câu trả lời, điểm) tự xoá sau 90 ngày bằng hàm `private.purge_old_sessions`, gọi theo hai đường: `pg_cron` mỗi ngày lúc 3:17 UTC, tức 10:17 giờ Việt Nam (migration `20261023090000_results_retention.sql` lập lịch **nếu** tiện ích có và bật được, không thì bỏ qua mà không lỗi) và xoá cơ hội mỗi khi một giáo viên tạo phiên mới hoặc một học sinh vào phòng thành công (một mẻ nhỏ, không phụ thuộc `pg_cron`). Hệ quả: nếu dự án thật chưa bật `pg_cron` và không ai tạo phiên hay vào phòng thì dữ liệu cũ có thể ở lại lâu hơn 90 ngày, và trang Quyền riêng tư sẽ không đúng; bật `pg_cron` trên dự án thật (xem task 8.3 của giai đoạn 2) để xoá đúng hạn. Giáo viên xoá được ngay từng buổi ở mục "Các buổi đã chơi" của quiz.

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
| `npm run test:load` | Thử tải quiz trực tiếp (không nằm trong `npm test`); cần `supabase:start`. Xem mục "Quiz chơi trực tiếp" |
| `npm run scan:bundle` | Sau `npm run build`: quét phần trình duyệt tải được, báo khoá bí mật hay chuỗi kết nối Postgres bị lộ |

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

## Quiz chơi trực tiếp (giai đoạn 2)

Giáo viên soạn quiz, bấm "Chơi ngay", chiếu mã PIN 6 số; học sinh vào `/play` bằng điện thoại, không cần tài khoản. Trạng thái nằm trong Postgres (nguồn đúng duy nhất), Realtime Broadcast chỉ là "chuông báo" `{ seq }`; mất kênh thì ứng dụng tự hỏi định kỳ (polling).

### Nhập PIN

Không giới hạn số lần nhập sai PIN và không lưu địa chỉ IP của học sinh, để một bạn gõ nhầm không khoá cả lớp dùng chung mạng của trường. Đổi lại, PIN 6 số có thể bị đoán: xác suất mỗi lần đoán bằng số phiên đang mở chia cho 1.000.000, và chỉ vào được khi phiên còn ở phòng chờ. Giáo viên khoá phòng sau khi lớp đủ người, hoặc loại người lạ. Lo ngại hơn thì nâng PIN lên 7-8 số hoặc chặn ở lớp trước ứng dụng (xem `implementation-notes.md`).

### Giới hạn và số đo thực tế

Mức Free của Supabase Realtime: **200 kết nối đồng thời, 100 tin mỗi giây, 100 lượt tham gia kênh mỗi giây** (stack cục bộ cấu hình cùng ba số này; kiểm tra lại trên trang giá trước khi triển khai vì có thể đổi). Mỗi học sinh và mỗi giáo viên giữ một kết nối.

`npm run test:load` dựng giáo viên và người chơi thật (mỗi người một client Supabase, một WebSocket, dùng đúng mã đồng bộ của ứng dụng), chơi 5 câu (4 dạng), học sinh vào phòng rải trong 3 giây và trả lời sau 0,5-3 giây. Đặt `LOAD_SESSIONS` (số lớp cùng lúc), `LOAD_PLAYERS` (học sinh mỗi lớp), `LOAD_JOIN_SPREAD_MS=0` để thử cả lớp vào đúng một lúc. Kết quả ghi ở `test-results/load-last.txt`. Số đo ngày 2026-10-19 trên một máy phát triển Windows, Supabase cục bộ:

| Cấu hình | Kết nối Realtime | Tin Realtime cao nhất / giây | Yêu cầu HTTP cao nhất / giây | Lỗi yêu cầu | Người chơi thấy đủ 5 câu | Độ trễ từ lúc giáo viên bấm mở câu tới khi thấy đề (trung vị / p95; gồm cả lệnh gọi của giáo viên nên là cận trên) |
|---|---|---|---|---|---|---|
| 1 lớp x 40 | 41 cần, 41 sống | 41 | 85 | 0 | 40/40 | 48 / 67 ms |
| 4 lớp x 40, đổi pha cùng giây | 164 cần, 164 sống | 164 | 328 | 0 | 160/160 | 48 / 77 ms |
| 6 lớp x 32 | 198 cần, 198 sống | 198 | 397 | 53-181, tuỳ lần chạy (xem lưu ý) | 192/192 | 46 / 78 ms |
| 5 lớp x 40 (vượt trần) | 205 cần, **200 sống** | 123 | 250 | 5-11 (xem lưu ý) | 200/200 | 47 / 86 ms, lớn nhất 2,0 s |

Đọc kết quả:

- **Một lớp 40 người:** mỗi lần đổi pha có 1 tin gửi và tối đa 40 tin nhận, tức đỉnh 41 tin/giây, dưới trần 100. Trung bình khoảng 12 tin/giây. Cả lớp vào phòng trong cùng một giây (`LOAD_JOIN_SPREAD_MS=0`) vẫn đạt.
- **Số lớp cùng lúc:** trần cứng là 200 kết nối, tức khoảng 4 lớp 40 người hoặc 6 lớp 32 người. Ở 205 kết nối cần có, đúng 200 kênh sống (đếm kênh đã tham gia thật) và 5 kết nối cuối không có kênh nhưng vẫn chơi trọn nhờ polling (độ trễ lớn nhất 2 giây trong thử nghiệm). Khi 160 học sinh của 4 lớp cùng vào phòng trong đúng một giây (`LOAD_JOIN_SPREAD_MS=0`), lần thử đầu có kênh chưa sống sau 20 giây, nên số liệu trên dùng cách vào rải trong 3 giây như lớp học thật; chưa tách được nguyên nhân là trần 100 lượt tham gia kênh mỗi giây hay giới hạn của máy thử. Người chơi chưa có kênh vẫn chơi được bằng polling.
- **Tin mỗi giây khi nhiều lớp đổi pha trùng giây:** tổng tin nhận cộng dồn (4 lớp x 41 = 164 > 100). Stack cục bộ vẫn chuyển hết, nhưng **chưa rõ Supabase đếm mức 100 tin/giây theo tin gửi hay cả tin nhận**; nếu dự án thật chặn, học sinh vẫn nhận đề nhờ polling, chậm tới 10 giây khi kênh vẫn còn sống. Nên kiểm lại ở bước nghiệm thu với hai lớp cùng bấm một lúc.
- **Tải cơ sở dữ liệu:** trung bình 28 yêu cầu/giây cho một lớp đang chơi (đỉnh 85 khi đổi pha), chủ yếu `player_state`; `player_state` có p95 dưới 70 ms, `submit_answer` dưới 20 ms.
- **Lưu ý về lỗi ở 198-205 kết nối:** các lỗi là `UND_ERR_SOCKET`, kết nối bị reset ở cổng 54321 của Docker Desktop trên máy thử khi hơn ~170 máy khách cùng mở kết nối mới; Kong và PostgREST không ghi lỗi nào, `Connection: close` không làm hết lỗi. Kịch bản gửi lại một lần như trình duyệt rồi mới tính lỗi, và chỉ khẳng định "không lỗi" ở tối đa 170 kết nối. Đây là giới hạn của máy thử chứ không phải của dịch vụ thật; số kết nối và số tin mới là phần đáng tin, độ trễ chỉ là cận dưới vì không có mạng thật.

### Rà soát trước khi triển khai

- `npm audit --omit=dev`: 0 lỗ hổng.
- `npm run build` rồi `npm run scan:bundle`: không có khoá `service_role`, khoá bí mật Supabase, chuỗi kết nối Postgres hay Google client secret trong `.next/static` và trang dựng sẵn (kịch bản đã được thử bằng cách cài một khoá giả vào và phải báo lỗi). Báo cáo chỉ nêu tệp và loại phát hiện, không in giá trị khớp. Sau khi triển khai, quét luôn bản thật: `npm run scan:bundle -- --url https://<địa chỉ Vercel>` (chỉ gửi GET tới vài trang công khai rồi tải các tệp JS/CSS chúng nhắc tới), vì biến môi trường trên Vercel có thể khác máy phát triển.
- Đáp án đúng không nằm trong mã nguồn mà trong Postgres; `host_state` và `player_state` khi câu đang mở không có khoá đáp án (`tests/db/live.test.ts`, `FORBIDDEN_KEYS`), cả với người chơi, khách và giáo viên khác.

### Bước triển khai thêm (cần chủ dự án làm hoặc xác nhận)

Các bước này ghi vào dịch vụ thật, không tự động hoá.

1. `npx supabase db push` để áp ba migration quiz (`20261021090000_quizzes`, `20261022090000_live_sessions`, `20261023090000_results_retention`). Chỉ `db push`, không `config push`.
2. Tiện ích `unaccent` (so khớp câu điền từ không dấu) nằm ở schema `extensions`; migration tự tạo nếu chưa có. Sau khi áp, kiểm tra trong SQL Editor: `select extensions.unaccent('extensions.unaccent'::regdictionary, 'Đà Nẵng');` trả về `Da Nang`.
3. Bật `pg_cron` ở Database, Extensions rồi chạy lại phần lập lịch của migration cuối (hoặc `select cron.schedule('smartteach-purge-old-sessions', '17 3 * * *', 'select private.purge_old_sessions()');`). Không bật thì dữ liệu cũ chỉ bị xoá cơ hội và trang Quyền riêng tư sẽ không đúng. Kiểm tra: `select jobname, schedule from cron.job;`.
4. Realtime: giữ cho phép kênh công khai Broadcast (Realtime Settings, tắt "Enable Realtime private channels only" nếu có). Ứng dụng dùng kênh công khai `session:<id>` chỉ mang `{ seq }`. Nếu kênh không nối được thì trò chơi vẫn chạy bằng polling nhưng chậm hơn.
5. Đẩy mã lên GitHub để Vercel tự triển khai.

### Nghiệm thu trên thiết bị thật

Giáo viên dùng laptop chiếu lên màn hình hoặc máy chiếu; ít nhất ba điện thoại thật (khác hệ điều hành nếu có) làm học sinh. Chơi trọn một phiên với đủ 4 dạng câu; thử khoá phòng, loại một người chơi, tắt rồi bật wifi của một điện thoại, tải lại trang giữa câu; xem trang kết quả; đăng nhập giáo viên thứ hai và xác nhận không thấy phiên và kết quả của người đầu. Ghi những gì đã xác nhận vào `plans/20261019-smartteach-giai-doan-2/implementation-notes.md`.
