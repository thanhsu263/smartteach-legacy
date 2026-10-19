# Phase 3 - Tiện ích lớp học

## Overview

Bốn tiện ích chạy hoàn toàn trên trình duyệt, không cần đăng nhập, không cần backend. Phần logic thuần (bốc thăm, chia nhóm, đếm ngược) tách khỏi giao diện để kiểm thử bằng unit test.

## Files

- `src/lib/utilities/draw.ts`, `groups.ts`, `countdown.ts`: logic thuần (mới).
- `src/app/tools/page.tsx`: trang liệt kê tiện ích (mới).
- `src/app/tools/countdown/page.tsx`, `draw/page.tsx`, `groups/page.tsx`, `whiteboard/page.tsx` (mới).
- `src/components/fullscreen-toggle.tsx`, `src/components/name-list-input.tsx` (mới; ô nhập danh sách tên dùng chung cho bốc thăm và chia nhóm).

## Tasks

- [ ] **3.1 Đồng hồ đếm ngược.** Cài sẵn 1, 3, 5, 10 phút và nhập tay; bắt đầu, tạm dừng, đặt lại; âm báo khi hết giờ (tắt được); chữ lớn đọc được từ cuối lớp; toàn màn hình. Kiểm tra: unit test logic đếm (dùng đồng hồ giả), Playwright bắt đầu và thấy số giảm.
- [ ] **3.2 Bốc thăm tên.** Nhập danh sách tên (mỗi dòng một tên) hoặc dán vào; bốc một người; tuỳ chọn "không bốc lại người đã bốc"; hiệu ứng ngắn khi bốc. Trạng thái: danh sách trống, đã bốc hết. Kiểm tra: unit test (không lặp khi bật tuỳ chọn, xử lý dòng trống và trùng tên); Playwright.
- [ ] **3.3 Chia nhóm.** Chia theo số nhóm hoặc số người mỗi nhóm; xáo ngẫu nhiên; nhóm chênh nhau tối đa 1 người; chia lại được. Kiểm tra: unit test (tổng người, chênh lệch tối đa 1, không ai ở hai nhóm, đầu vào không hợp lệ).
- [ ] **3.4 Bảng trắng.** Canvas vẽ bằng chuột và cảm ứng; bút, tẩy, vài màu, vài cỡ nét, xoá tất cả, toàn màn hình. Không lưu nội dung. Kiểm tra: Playwright vẽ một nét và thấy canvas thay đổi; kiểm tra thủ công cảm ứng trên điện thoại hoặc máy tính bảng.
- [ ] **3.5 Trang liệt kê tiện ích và liên kết từ trang chủ.** Thẻ cho từng tiện ích, liên kết từ trang chủ và header. Kiểm tra: Playwright mở từng tiện ích từ trang chủ khi chưa đăng nhập.

## Acceptance criteria

- Cả bốn tiện ích dùng được khi chưa đăng nhập, ở 375px và 1280px.
- Logic bốc thăm và chia nhóm đúng theo các unit test ở trên.
- Mỗi tiện ích có chế độ toàn màn hình để chiếu lớp.

## Risks

- Cảm ứng và hiệu năng canvas trên điện thoại cũ: kiểm tra thủ công trên ít nhất một thiết bị thật.
- Âm báo bị trình duyệt chặn nếu chưa có tương tác: phát âm sau thao tác bắt đầu của người dùng.
