# Phase 5 - Triển khai và nghiệm thu

## Overview

Đưa hub lên Vercel với Supabase thật, rà soát khả năng truy cập và chạy lại toàn bộ tiêu chí nghiệm thu của giai đoạn 1. Mọi bước ghi ra bên ngoài cần xác nhận của người dùng ở thời điểm thực hiện.

## Files

- `README.md`: cách chạy cục bộ, biến môi trường, cách triển khai, cách đánh thức Supabase khi bị tạm dừng (mới).
- Cấu hình Vercel và Supabase nằm ở dịch vụ bên ngoài, không phải file trong repo.

## Tasks

- [ ] **5.1 Chuẩn bị triển khai.** Đối chiếu danh sách biến môi trường với `.env.example`; thêm `README.md`; chạy `npm run build`, `npm run lint`, toàn bộ unit test và Playwright cục bộ.
- [ ] **5.2 Triển khai công khai.** Điều kiện trước: chủ dự án đã quyết định về nội dung bản quyền của game (xem plan.md), vì đây là lúc game thành công khai. Tạo dự án Vercel, thiết lập biến môi trường, áp migration lên Supabase, cấu hình URL gọi lại của Google OAuth theo domain thật. Mỗi bước cần xác nhận. Đối chiếu gói Vercel và Supabase đang dùng với trang giá hiện hành để bảo đảm chi phí 0, và ghi chính sách tạm dừng dự án không hoạt động vào `README.md`.
- [ ] **5.3 Nghiệm thu.** Chạy lại Playwright trên URL công khai cho các luồng của phase 2-4; rà soát WCAG AA (tương phản, bàn phím, nhãn cho nút chỉ có biểu tượng, `lang="vi"`); kiểm tra thủ công trên một điện thoại thật: mở game, dùng một tiện ích, đăng nhập Google. Ghi kết quả vào `implementation-notes.md`.

## Acceptance criteria

- Hub chạy ở URL công khai trên free tier; chi phí hạ tầng bằng 0 theo trang giá hiện hành.
- Mọi tiêu chí trong bảng nghiệm thu của `plan.md` đạt, mỗi tiêu chí có bằng chứng.
- Không có khoá bí mật trong repo hay trong mã chạy trên trình duyệt.

## Risks

- Domain mới thì URL gọi lại của Google OAuth và URL cho phép của Supabase phải khớp, nếu không đăng nhập Google lỗi ở môi trường thật dù chạy tốt cục bộ.
