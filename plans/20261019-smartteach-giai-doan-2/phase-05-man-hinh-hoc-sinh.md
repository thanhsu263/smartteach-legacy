# Phase 5 - Màn hình học sinh

## Overview

Trang `/play` cho học sinh trên điện thoại, theo Design Brief đã xác nhận: cùng hệ thiết kế, ô đáp án lớn có chữ cái, hình dạng và màu. Không cần đăng nhập. Dùng lớp đồng bộ của phase 4.

## Files

- `DESIGN.md`, `src/app/globals.css`: token màu đáp án và hình dạng (mới), `src/styles/contrast.test.ts` mở rộng.
- `src/app/play/page.tsx`, `src/app/play/play.module.css` (mới).
- `src/components/live/player/`: `join-form.tsx`, `lobby.tsx`, `question.tsx`, `answer-tiles.tsx`, `result.tsx`, `final.tsx`, `status-banner.tsx` và `.module.css` (mới).
- `src/components/icons.tsx`: hình dạng đáp án.
- `e2e/play.spec.ts`, `e2e/helpers/live.ts` (mới), bổ sung `e2e/a11y.spec.ts`.

## Tasks

- [x] **5.1 Token và hình dạng đáp án.** Sáu cặp (chữ cái A-F, hình dạng riêng, màu) thêm vào `DESIGN.md` (frontmatter và phần mô tả) và `globals.css`; chữ và hình trên ô đạt 4.5:1 so với nền ô, ô so với nền trang đạt 3:1; không dùng bộ hình của Kahoot. Kiểm tra: mở rộng `contrast.test.ts` cho toàn bộ cặp mới; unit test chỉ ra mỗi lựa chọn có hình và chữ khác nhau.
- [x] **5.2 Luồng vào và phòng chờ.** `/play` (nhận `?pin=`): nhập PIN, nhập biệt danh, phòng chờ (tên mình, số người, trạng thái kết nối). Lỗi tiếng Việt rõ cho PIN sai, phòng đã khoá hoặc đã đóng, biệt danh trùng, bị chặn thử quá nhiều. Bị loại khỏi phòng thì hiện thông báo và quay về nhập PIN. Tải lại trang giữa chừng vào lại đúng người chơi bằng mã tham gia đã lưu. Kiểm tra: e2e các trạng thái lỗi, tải lại, bị loại.
- [x] **5.3 Màn hình câu hỏi và kết quả.** Hiện đề và đếm giờ theo giờ máy chủ; ô đáp án cao tối thiểu 72px: `single` và `true_false` chạm một lần là gửi, `multi` chọn nhiều rồi bấm Gửi, `short_text` gõ rồi Gửi; sau khi gửi khoá lại với trạng thái "Đã gửi, chờ cả lớp"; hết giờ khoá và chờ. Kết quả câu: đúng hay sai (bằng chữ và biểu tượng, không chỉ màu), điểm câu này, tổng điểm, hạng; sau cùng là bảng top và hạng cuối. Trạng thái mất kết nối "đang thử lại" khi kênh về polling hoặc offline. Giảm chuyển động theo `prefers-reduced-motion`. Kiểm tra: e2e đủ 4 dạng câu (dùng trợ giúp điều khiển phiên bằng giáo viên mô phỏng qua hàm, không qua giao diện), lỗi gửi không mất lựa chọn, gửi hai lần không được.
- [x] **5.4 Rà soát khả năng truy cập.** axe cho mọi trạng thái ở 375px: nhập PIN, nhập biệt danh, phòng chờ, từng dạng câu, đã gửi, kết quả đúng và sai, kết thúc, mất kết nối, bị loại; vùng thông báo (`role="status"`) cho đổi trạng thái; điều hướng bàn phím; không cuộn ngang ở 375px. Kiểm tra: test đạt.

## Acceptance criteria

- Học sinh vào bằng PIN và biệt danh, chơi trọn vẹn một phiên trên điện thoại 375px, không cần tài khoản.
- Đáp án phân biệt bằng chữ cái, hình dạng và màu; không vi phạm WCAG A/AA theo axe.
- Tải lại trang giữa phiên vào lại đúng người chơi; mất kết nối được báo rõ và tự phục hồi.
- Gói trình duyệt không chứa khoá bí mật và không có đáp án đúng trước khi câu đóng.

## Risks

- Học sinh gõ biệt danh không phù hợp: giáo viên loại được người chơi (phase 6); chưa có bộ lọc từ ngữ.
- Thiết bị cũ hoặc trình duyệt chặn `sessionStorage`: rơi về nhập lại PIN và biệt danh, ghi rõ trong lời nhắn.
