# Phase 6 - Màn hình giáo viên

## Overview

Trang `/host/[id]` là cả màn chiếu lẫn bảng điều khiển (một trang, có chế độ toàn màn hình), cùng việc bắt đầu phiên từ quiz. Dùng các hàm điều khiển của phase 3 và lớp đồng bộ của phase 4.

## Files

- `src/proxy.ts` (matcher thêm `/host/:path*`), `src/app/host/layout.tsx`, `src/app/host/[id]/page.tsx` (mới).
- `src/components/live/host/`: `start-session.tsx`, `host-screen.tsx`, `lobby.tsx`, `question-view.tsx`, `reveal-view.tsx`, `leaderboard.tsx`, `podium.tsx`, `controls.tsx` và `.module.css` (mới).
- `src/components/quiz/quizzes-manager.tsx`, `quiz-editor.tsx`: nút "Chơi ngay".
- `e2e/host.spec.ts`, `e2e/live.spec.ts` (mới), bổ sung `e2e/a11y-auth.spec.ts`.

## Tasks

- [x] **6.1 Bắt đầu phiên.** Nút "Chơi ngay" ở danh sách và trình soạn (chặn khi `quiz_problems` còn lỗi, nêu lý do); hộp chọn "tính thêm điểm theo tốc độ" (mặc định bật); gọi `create_session` rồi chuyển tới `/host/[id]`. Đã có phiên đang chạy thì hiện đường dẫn tiếp tục hoặc kết thúc phiên cũ. Kiểm tra: e2e quiz lỗi bị chặn, phiên thứ hai bị chặn kèm đường dẫn tiếp tục.
- [x] **6.2 Màn hình điều khiển và chiếu.** Phòng chờ: PIN cỡ lớn, địa chỉ tham gia `/play?pin=…` có nút sao chép, danh sách người chơi cập nhật, khoá phòng, loại người chơi. Đang hỏi: đề cỡ lớn, đếm giờ theo giờ máy chủ, số người đã trả lời (hỏi `host_state` mỗi 1-2 giây, một client duy nhất), nút Hiện đáp án sớm. Hiện đáp án: đáp án đúng và phân bố lựa chọn. Bảng xếp hạng top 5, bục cuối top 3, nút Câu tiếp theo (một nút vàng chính mỗi màn hình). Chế độ toàn màn hình dùng khung của `ToolStage`; phím tắt Space cho "tiếp theo". Mất kết nối báo rõ và tự phục hồi. Kiểm tra: e2e giáo viên điều khiển trọn phiên với người chơi mô phỏng; axe ở mọi trạng thái; chiếu toàn màn hình vào và thoát được.
- [x] **6.3 Tiếp tục và kết thúc.** Tải lại trang giáo viên giữa phiên phục hồi đúng trạng thái; kết thúc phiên có xác nhận; phiên hết hạn hoặc đã kết thúc hiện kết quả thay vì điều khiển. Người không phải chủ phiên mở `/host/[id]` thấy "Không tìm thấy". Kiểm tra: e2e tải lại ở giữa câu, giáo viên khác không vào được.
- [x] **6.4 Luồng đa trình duyệt.** Một giáo viên và ba người chơi (ngữ cảnh Playwright riêng): vào phòng chờ, khoá phòng khiến người thứ tư không vào được, loại một người, chơi đủ cả 4 dạng câu, kiểm tra hạng cuối khớp điểm tính tay, một người chơi tải lại giữa chừng. Kiểm tra: test đạt hai lần liên tiếp.

## Acceptance criteria

- Giáo viên chạy trọn một phiên từ quiz đến bục cuối bằng một trang, kể cả chiếu toàn màn hình.
- Khoá phòng, loại người chơi, tải lại và kết thúc hoạt động đúng; người ngoài không điều khiển được.
- Không vi phạm WCAG theo axe; chữ đề và PIN đọc được từ cuối lớp.

## Risks

- Đồng hồ đếm trên màn chiếu và trên điện thoại lệch nhau vài trăm mili giây: chấp nhận được vì hạn chót thật do máy chủ quyết định.
- Mỗi người chơi mới làm tăng việc hỏi trạng thái của giáo viên; giữ một nhịp hỏi cố định thay vì theo từng tin báo.
