# Phase 8 - Thử tải, triển khai và nghiệm thu

## Overview

Đo thực tế với 40 người chơi mô phỏng, chạy lại toàn bộ kiểm thử, cập nhật tài liệu, rồi đưa lên dịch vụ thật và nghiệm thu bằng tay với thiết bị thật. Các bước ghi ra bên ngoài cần chủ dự án làm hoặc xác nhận.

## Files

- `tests/load/live-load.mjs` (mới, chạy bằng lệnh riêng, không nằm trong bộ test mặc định), `package.json` (`npm run test:load`).
- `README.md` (phần quiz: cách chạy, giới hạn, đo tải, nhắc về `pg_cron` và cài đặt Realtime).
- `plans/20261019-smartteach-giai-doan-2/implementation-notes.md` (do `hs-build` ghi).

## Tasks

- [x] **8.1 Thử tải trên stack cục bộ.** Kịch bản dựng 1 giáo viên và 40 người chơi (supabase-js, kênh Realtime thật), chạy 5 câu, đo: số tin Realtime mỗi giây ở mỗi người chơi và tổng, số lỗi RPC, độ trễ từ lúc giáo viên mở câu đến lúc người chơi nhận được đề (trung vị và phân vị 95), số kết nối mở. Biến thể nhiều phiên cùng lúc để ước lượng số lớp tối đa dưới 200 kết nối. Kiểm tra: tin dưới 100 mỗi giây, không có yêu cầu nào lỗi, độ trễ chấp nhận được (ghi con số thực), ghi số liệu vào notes. Lưu ý stack cục bộ không phản ánh đúng mạng thật; số kết nối và tin nhắn là phần đáng tin.
- [x] **8.2 Toàn bộ kiểm thử và rà soát cuối.** `npm run typecheck`, `lint`, `test`, `test:db`, `test:e2e` (hai lần liên tiếp), axe cho trang mới, quét gói trình duyệt không có khoá bí mật và không có đáp án đúng trước khi câu đóng (so sánh với dữ liệu thật của một quiz), `npm audit --omit=dev`. Cập nhật README. Kiểm tra: tất cả đạt, kết quả ghi vào notes; chạy `hs-code-review` cho phase 3, và cho cả giai đoạn trước khi triển khai.
- [ ] **8.3 Triển khai thật (cần xác nhận từng bước).** Chủ dự án áp migration mới bằng `supabase db push` (chỉ `db push`, không `config push`); kiểm tra tiện ích `unaccent` có sẵn; bật `pg_cron` nếu muốn lịch xoá tự động; kiểm tra cài đặt Realtime cho phép kênh công khai; xác nhận phần tử `x-forwarded-for` do gateway nối thêm trên dự án thật bằng một lần gọi thử (và điều chỉnh vị trí phần tử tin cậy nếu khác); đẩy mã lên GitHub để Vercel tự triển khai. Kiểm tra: danh sách ở 8.4 trên bản thật.
- [ ] **8.4 Nghiệm thu bằng tay trên thiết bị thật.** Giáo viên trên laptop chiếu lên màn hình hoặc máy chiếu; ít nhất ba điện thoại thật (khác hệ điều hành nếu có) làm học sinh; chơi trọn một phiên với cả 4 dạng câu, thử khoá phòng, loại người chơi, tắt rồi bật wifi của một điện thoại, tải lại trang giữa câu; xem kết quả; kiểm tra quyền riêng tư (giáo viên thứ hai không thấy). Kiểm tra: chủ dự án xác nhận từng mục; ghi vào notes những gì được xác nhận.

## Acceptance criteria

- Số đo thực tế chứng minh 40 người chơi trong một phiên nằm trong giới hạn Realtime miễn phí và cho biết số lớp cùng chơi tối đa.
- Toàn bộ kiểm thử đạt, không có khoá bí mật hay đáp án lộ trong gói trình duyệt.
- Phiên thật chạy trọn vẹn trên thiết bị thật; kết quả nghiệm thu có xác nhận của chủ dự án.

## Risks

- Chỉ trần 200 kết nối là cứng: nếu cần nhiều lớp hơn thì nâng gói hoặc đổi nhà cung cấp, ngoài phạm vi.
- Bước 8.3 ghi vào dịch vụ thật: không tự thực hiện khi chưa có xác nhận.
