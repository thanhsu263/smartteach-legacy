Mode: local
Status: active

# SmartTeach - Giai đoạn 2: quiz chơi trực tiếp bằng mã PIN

Nguồn hướng đi: [Decision Brief quiz](../reports/brainstorm-2026-10-19-quiz-truc-tiep.md) (gồm Design Brief đã xác nhận và các làm rõ kỹ thuật). Nền: [giai đoạn 1](../20261019-smartteach-giai-doan-1/plan.md) đã xong.

## Kết quả mong muốn

Giáo viên đăng nhập soạn quiz (4 dạng câu hỏi), chia sẻ bằng link, bắt đầu phiên trực tiếp và nhận PIN. Học sinh không cần tài khoản: vào `/play`, nhập PIN và biệt danh, trả lời từng câu trên điện thoại. Giáo viên điều khiển và chiếu trên một trang `/host/[id]`. Điểm, thời gian và đáp án đúng do máy chủ giữ. Cuối buổi giáo viên xem kết quả; dữ liệu người chơi tự xoá sau 90 ngày. Chạy trên gói miễn phí cho khoảng 5 lớp (mỗi lớp tối đa 50 người) cùng lúc.

## Phạm vi

Trong phạm vi: bảng quiz và RLS, soạn quiz, chia sẻ và nhân bản bằng link, các hàm chơi trực tiếp (tạo phiên, tham gia, trả lời, chấm điểm, bảng xếp hạng), đồng bộ bằng Broadcast kèm polling dự phòng, màn hình học sinh, màn hình giáo viên, kết quả sau buổi, xoá dữ liệu sau 90 ngày, cập nhật trang Quyền riêng tư, thử tải 40 người chơi, triển khai.

Ngoài phạm vi: bài tự làm có hạn nộp, hình ảnh và công thức Toán trong câu hỏi, nhạc, meme, avatar, power-up, AI tạo câu hỏi, thư viện công khai, nhập quiz từ tệp, chọn tên học sinh từ lớp đã lưu, xuất Excel, giao diện hai trang cho giáo viên.

## Hiện trạng đã kiểm tra

- Có sẵn: Supabase Auth cho giáo viên, `RequireUser` và `src/proxy.ts` (matcher hiện là `/my-classes/:path*` và `/login`), RLS theo chủ sở hữu và trigger giới hạn có khoá advisory (`supabase/migrations/20261019150000_*.sql`), kiểm thử RLS qua supabase-js (`tests/db/rls.test.ts`, `npm run test:db`), `src/lib/classes/{api,errors,limits}.ts` làm mẫu cho lớp truy cập dữ liệu, `ToolStage` có toàn màn hình, token thiết kế và test tương phản (`src/styles/contrast.test.ts`), axe e2e (`e2e/a11y*.spec.ts`).
- **Realtime đang tắt** ở `supabase/config.toml` (`[realtime] enabled = false`); phải bật và tải thêm image.
- `pg_cron` có sẵn nhưng chưa bật; `request.headers` (kể cả `x-forwarded-for`) có trong hàm SQL qua PostgREST, phần đầu của `x-forwarded-for` do máy khách đặt.
- Giới hạn gói Free (tài liệu ngày 2026-10-19): Realtime 200 kết nối, 100 tin nhắn/giây; đăng nhập ẩn danh 30 lần/giờ/IP (vì vậy học sinh không dùng Supabase Auth); Supabase Auth gửi email bằng dịch vụ tích hợp chỉ **2 email/giờ**.

## Các phase

| Phase | Tên | Phụ thuộc | Trạng thái |
|---|---|---|---|
| 1 | [Dữ liệu quiz và RLS](./phase-01-du-lieu-quiz.md) | không | Done (chờ review) |
| 2 | [Soạn quiz và chia sẻ](./phase-02-soan-quiz.md) | 1 | Done (chờ review) |
| 3 | [Máy chủ chơi trực tiếp](./phase-03-may-chu-choi-truc-tiep.md) | 1 | Done (chờ review) |
| 4 | [Đồng bộ thời gian thực](./phase-04-dong-bo-thoi-gian-thuc.md) | 3 | Done (chờ review) |
| 5 | [Màn hình học sinh](./phase-05-man-hinh-hoc-sinh.md) | 4 | Done (chờ review) |
| 6 | [Màn hình giáo viên](./phase-06-man-hinh-giao-vien.md) | 2, 4 | Done (chờ review) |
| 7 | [Kết quả, lưu trữ và quyền riêng tư](./phase-07-ket-qua-luu-tru.md) | 3, 6 | Done (chờ review) |
| 8 | [Thử tải, triển khai và nghiệm thu](./phase-08-thu-tai-trien-khai.md) | 1-7 | Done |

Phase 2 và 3 độc lập nhau (cùng chỉ cần phase 1) nên làm thứ tự nào cũng được; phase 5 và 6 cũng độc lập nhau. Phase 3 là ranh giới bảo mật của phần học sinh, nên được review riêng trước khi làm phase 4 trở đi.

## Bản đồ tiêu chí nghiệm thu

| Tiêu chí trong brief | Task | Cách kiểm tra |
|---|---|---|
| Giáo viên tạo, sửa, nhân bản, xoá quiz với 4 dạng; dữ liệu sai bị chặn; người khác không xem/sửa được | 1.1, 1.2, 1.3, 2.2, 2.3 | Test DB hai tài khoản; unit `validate`; e2e soạn quiz |
| Chia sẻ bằng link, nhân bản, thu hồi, khách không xem được | 1.4, 2.4 | Test DB; e2e hai giáo viên |
| Bắt đầu phiên, nhận PIN; học sinh vào không cần tài khoản; phòng chờ; khoá phòng, loại người chơi; PIN sai hoặc phiên đóng bị từ chối | 3.1-3.3, 5.2, 6.1, 6.2 | Test DB (vai trò anon); e2e đa trình duyệt |
| Học sinh không nhận đáp án đúng trước khi câu đóng, kể cả gọi trực tiếp API | 3.3, 3.6 | Test DB bằng vai trò `anon`: không đọc bảng, hàm không trả khoá |
| Một đáp án mỗi câu; trả lời trễ bị từ chối theo giờ máy chủ; điểm đúng quy tắc cho 4 dạng; so khớp điền từ (có dấu tiếng Việt) | 3.3, 3.4, 3.6 | Test DB theo bảng ca; test có chờ thời gian thật |
| Luồng đầy đủ; tải lại trang vẫn vào lại đúng người chơi | 5.2, 5.3, 6.2, 6.3 | E2E phòng chờ đến bục cuối, tải lại ở giữa |
| Mất Realtime vẫn chơi tiếp nhờ polling | 4.3, 4.6 | Unit với đồng hồ giả và kênh chết; test tích hợp |
| 40 người chơi mô phỏng: dưới 100 tin/giây, không lỗi, độ trễ chấp nhận được, đo số kết nối | 8.1 | Kịch bản tải chạy trên stack cục bộ |
| 375px, đáp án phân biệt bằng hình và chữ, không vi phạm WCAG | 5.1, 5.3, 6.2, 8.2 | Unit tương phản token; axe cho mọi trạng thái |
| Kết quả sau buổi chỉ chủ phiên xem; tự xoá sau 90 ngày | 7.1, 7.2 | Test DB; e2e |
| Không có khoá bí mật, không lộ đáp án trong gói gửi học sinh | 8.2 | Quét gói trình duyệt như phase 5 của giai đoạn 1 |

## Rủi ro và việc cần chủ dự án

| Rủi ro | Kiểm tra hoặc bàn giao |
|---|---|
| Các hàm `security definer` là ranh giới bảo mật duy nhất của phần học sinh | Phase 3 có test bằng vai trò `anon` và được review riêng (`hs-code-review`) trước phase 4 |
| Chặn đoán PIN theo IP dựa vào `x-forwarded-for`, phần đầu do máy khách đặt | Chỉ tin phần do gateway nối thêm; kiểm tra lại trên dự án Supabase thật (task 8.3); lớp bù là khoá phòng và PIN chỉ sống khi phiên mở |
| 200 kết nối Realtime là trần của cả dự án | Task 8.1 đo số kết nối thực; ghi rõ "vài lớp cùng lúc" |
| Dữ liệu biệt danh và câu trả lời của trẻ em lưu 90 ngày | Task 7.3 cập nhật trang Quyền riêng tư; chủ dự án phải duyệt lại (`privacyReviewed`) |
| Email xác nhận đăng ký chỉ 2 thư mỗi giờ (dịch vụ tích hợp của Supabase) | Không thuộc giai đoạn này nhưng **chặn việc mời đông giáo viên**: cần cấu hình SMTP riêng hoặc chỉ dùng Google; chủ dự án quyết định |
| Cài `pg_cron` và cài đặt Realtime (cho phép kênh công khai) trên dự án thật | Việc ghi ra bên ngoài, nằm ở 8.3, cần xác nhận khi thực hiện |

## Hành động cần xác nhận khi build

Tải thêm image Realtime cho stack cục bộ (4.1); áp migration lên dự án Supabase thật, bật `pg_cron`, chỉnh cài đặt Realtime, triển khai Vercel (8.3). Mọi bước này do chủ dự án làm hoặc xác nhận ở thời điểm thực hiện.
