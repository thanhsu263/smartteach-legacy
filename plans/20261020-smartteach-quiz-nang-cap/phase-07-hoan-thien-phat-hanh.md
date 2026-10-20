# Phase 7 - Hoàn thiện, thử tải và phát hành

## Overview

Đóng giai đoạn: tài liệu và trang Quyền riêng tư theo dữ liệu mới, đo lại tải với tự động và kho báu, chạy toàn bộ kiểm thử, review cả đợt, rồi đưa lên dịch vụ thật và nghiệm thu bằng thiết bị thật. Bước ghi ra bên ngoài (7.6) cần chủ dự án xác nhận từng bước.

## Files

- Sửa: `README.md`, `src/app/privacy/page.tsx`, `e2e/privacy.spec.ts`, `tests/load/live-load.test.ts`, `plans/20261020-smartteach-quiz-nang-cap/implementation-notes.md` (do `hs-build` ghi).

## Tasks

- [ ] **7.1 Quyền riêng tư.** Trang `/privacy` (mục "Quiz chơi trực tiếp") nêu thêm: ở chế độ kho báu, ứng dụng lưu rương của từng biệt danh (loại, hiệu ứng, điểm trước và sau) cùng dữ liệu buổi chơi, **giữ tối đa khoảng 90 ngày và xoá cùng buổi chơi** (khoá ngoại `on delete cascade`, kể cả khi giáo viên xoá buổi); mã QR chỉ chứa địa chỉ vào phòng và PIN, không chứa dữ liệu cá nhân; tệp quiz nhập từ máy chỉ được đọc trong trình duyệt của giáo viên, không tải lên. Cập nhật `e2e/privacy.spec.ts` kiểm các câu mới. Kiểm tra: e2e privacy; `delete_session` xoá cả rương (test ở 3.7 hoặc bổ sung).
- [ ] **7.2 README.** Mục "Quiz chơi trực tiếp" thêm: QR, tự động qua câu (kể cả việc phải giữ màn hình điều khiển mở), chế độ kho báu (luật chuỗi, hiệu ứng, trần điểm, tự mở rương), cách nhập quiz từ file (mẫu CSV, `.xlsx`, cú pháp dán, giới hạn), bảng lệnh/kiểm thử mới, và tên các gói mới cùng lý do chọn (đã ghi nguồn ở `plan.md`).
- [ ] **7.3 Thử tải.** Mở rộng `tests/load/live-load.test.ts` với `LOAD_AUTO=1` (phiên tự động, giáo viên không bấm sau câu đầu) và `LOAD_TREASURE=1` (người chơi mở rương khi có); chạy lại 1x40 và 4x40 với từng biến thể và cả hai cùng bật; ghi vào notes: tin Realtime cao nhất mỗi giây, yêu cầu HTTP, độ trễ, số người thấy đủ câu. Mốc chấp nhận: không lỗi ở ≤ 170 kết nối (như `VERIFIED_SOCKETS`), đỉnh tin mỗi lớp vẫn ~41/giây, `open_chest` p95 dưới 100 ms.
- [ ] **7.4 Kiểm thử toàn bộ.** `npm run typecheck`, `lint`, `test`, `test:db`, `test:e2e` (hai lần liên tiếp), `npm audit --omit=dev`, `npm run build` rồi `npm run scan:bundle`; kiểm kích thước gói tải thêm của `qrcode-generator` và của trang nhập (ghi vào notes). Kết quả ghi vào notes.
- [ ] **7.5 Review.** Chạy `hs-code-review` cho toàn bộ đợt này (trọng tâm: luật điểm của kho báu, tính idempotent, quyền, rò rỉ khoá đáp án, nhập tệp không tin cậy, `create or replace` các hàm dài có lấy đúng bản mới nhất không); sửa các phát hiện được xác nhận rồi chạy lại 7.4.
- [ ] **7.6 Phát hành (cần chủ dự án xác nhận từng bước).** (a) `npx supabase db push --dry-run` rồi, sau khi chủ dự án xác nhận danh sách, `npx supabase db push` áp ba migration mới (`20261024`, `20261025`, `20261026`); chỉ `db push`, không `config push`. (b) Kiểm tra trên bản thật bằng SQL Editor: `select pg_get_function_identity_arguments('public.create_session'::regproc);` cho thấy chữ ký 3 tham số và `treasure_chests` tồn tại. (c) `git push origin main` để Vercel triển khai. (d) `npm run scan:bundle -- --url <địa chỉ Vercel>`. Mỗi bước ghi ra ngoài do chủ dự án làm hoặc cho phép rõ ràng lúc đó.
- [ ] **7.7 Nghiệm thu bằng tay trên thiết bị thật (chủ dự án).** Laptop chiếu lên màn hình/máy chiếu và ít nhất ba điện thoại: (1) quét QR từ màn chiếu bằng camera điện thoại, vào đúng phòng với PIN điền sẵn; (2) chơi một phiên tự động trọn vẹn (chọn 8 giây), thử Tạm dừng/Tiếp tục; (3) phiên bật kho báu: đạt chuỗi 3 đúng và 3 sai, mở rương, xem điểm khớp bảng xếp hạng; (4) nhập một quiz từ tệp CSV và một từ tệp `.xlsx` rồi chơi thử; (5) hai lớp cùng bấm một lúc (nếu có hai giáo viên) để chốt mục còn mở về tin báo của giai đoạn 2. Ghi từng mục xác nhận vào notes.

## Acceptance criteria

- Toàn bộ kiểm thử đạt (hai lần e2e liên tiếp), `scan:bundle` sạch cho cả bản máy và bản triển khai, `npm audit` sạch.
- Thử tải với tự động và kho báu đạt mốc ở 7.3.
- Trang Quyền riêng tư và README khớp dữ liệu và hành vi mới.
- Phiên thật chạy trọn vẹn trên thiết bị thật với từng tính năng; chủ dự án xác nhận.

## Risks

- Bước 7.6 ghi vào dịch vụ thật: không tự thực hiện khi chưa có xác nhận, và không dán mật khẩu cơ sở dữ liệu vào cuộc trò chuyện hay repo.
- Kho báu có thể cần chỉnh cân bằng sau khi thử với lớp thật; đó là chỉnh hằng số trong hàm bằng một migration nhỏ sau này, không phải thiết kế lại.
