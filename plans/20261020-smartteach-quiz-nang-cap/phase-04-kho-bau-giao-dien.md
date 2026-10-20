# Phase 4 - Kho báu: giao diện

## Overview

Đưa luật ở phase 3 lên màn hình: công tắc bật chế độ, chỉ báo chuỗi, rương của học sinh, bảng tin vui cho giáo viên, cột kho báu ở trang kết quả. Phụ thuộc phase 3 (API đã có và đã được test).

## Files

- Sửa: `src/components/live/host/start-session.tsx`, `src/components/live/host/reveal-view.tsx`, `src/components/live/host/host-screen.tsx`, `src/components/live/player/question.tsx`, `src/components/live/player/result.tsx`, `src/components/live/player/final.tsx`, `src/components/live/player/player.module.css`, `src/components/live/host/host.module.css`, `src/components/live/results/results-screen.tsx`, `src/components/live/results/results.module.css`, `src/lib/live/results.ts` (+ `results.test.ts`), `src/lib/live/errors.ts`, `DESIGN.md` và `src/app/globals.css` (nếu cần token màu mới) cùng `src/styles/contrast.test.ts`.
- Mới: `src/components/live/player/chest.tsx`, `src/components/live/player/streak-chip.tsx`, `e2e/treasure.spec.ts`.

## Tasks

- [x] **4.1 Công tắc khi bắt đầu phiên.** Trong `start-session.tsx` thêm "Chế độ giải trí: kho báu" (mặc định tắt) kèm mô tả ngắn: sau 3 câu đúng hoặc 3 câu sai/bỏ trống liên tiếp học sinh nhận một rương làm cộng, nhân, chia hoặc trừ điểm của chính mình; không ảnh hưởng điểm bạn khác. Khi bật cùng "Tự động" thì hiển thị rằng thời gian hiện đáp án tối thiểu 8 giây (nút 5 giây bị vô hiệu kèm lý do). Truyền `treasure_mode` vào `p_options`. Kiểm tra: e2e và axe cho bảng bắt đầu phiên.
- [x] **4.2 Chỉ báo chuỗi và rương cho học sinh.**
  - `streak-chip.tsx`: ở pha câu hỏi và hiện đáp án, chip "Chuỗi đúng 2/3" hoặc "Chuỗi chưa đúng 2/3" (chỉ hiện chuỗi đang chạy; có chữ, không chỉ màu), chỉ khi phiên bật kho báu.
  - `chest.tsx` ở `result.tsx`: khi `chest.status = 'pending'` hiện nhóm "Chọn một rương" gồm 3 nút "Rương 1/2/3" (bàn phím, vùng chạm ≥ 44px); bấm bất kỳ nút nào gọi `open_chest` (lựa chọn chỉ là hình thức, ghi rõ trong mã để không ai hiểu là kỹ năng); khi đang mở nút vô hiệu; mở xong thay bằng thẻ kết quả: nhãn hiệu ứng, "1200 thành 2400" (số trước và sau), biểu tượng và chữ "Tăng/Giảm/Giữ nguyên" (không chỉ màu), công bố qua vùng `role="status"` một lần. Hoạt hình mở rương ngắn, **tắt hẳn** khi `prefers-reduced-motion`. Lỗi mạng: thông báo và cho thử lại (mở lại idempotent nên an toàn). Tải lại trang giữa chừng hiện đúng kết quả đã mở nhờ `player_state`.
  - `final.tsx`: nếu phiên có kho báu hiện dòng tổng kết "Kho báu: +700 điểm" (từ dữ liệu có sẵn hoặc bổ sung trường vào `player_state` ở bước cuối).
  - Kiểm tra: `e2e/treasure.spec.ts` (4.5), axe 375px.
- [x] **4.3 Bảng tin cho giáo viên.** `reveal-view.tsx` thêm khung "Kho báu" liệt kê `treasure_feed` (vd "Minh mở rương: Nhân đôi điểm"), chỉ khi bật chế độ; nội dung cập nhật bằng polling hiện có, công bố lịch sự (`aria-live="polite"`), không chặn thao tác bấm tiếp. Bảng xếp hạng đã đọc `participants.score` nên tự phản ánh điểm sau rương.
- [x] **4.4 Trang kết quả.** `results.ts` + `results-screen.tsx` thêm cột "Kho báu" (tổng thay đổi điểm do rương, số rương đã mở) trong bảng xếp hạng khi `treasure_mode`; ghi chú dưới bảng rằng điểm cuối gồm cả kho báu để tổng điểm theo từng câu không còn bằng điểm cuối. `results.test.ts` cập nhật; e2e `results.spec.ts` vẫn đạt với phiên không bật kho báu.
- [x] **4.5 Token màu và e2e `e2e/treasure.spec.ts`.**
  - Nếu cần màu mới cho thẻ rương, thêm token vào `globals.css` và `DESIGN.md`, và cặp tương phản vào `src/styles/contrast.test.ts` (đủ AA); ưu tiên dùng lại token hiện có.
  - Kịch bản: một giáo viên và hai điện thoại, phiên bật kho báu, quiz 4 câu đơn giản; điện thoại A trả lời đúng cả 3 câu đầu → ở reveal câu 3 thấy nhóm "Chọn một rương"; bấm "Rương 2" → thấy kết quả có nhãn hiệu ứng và số trước/sau; số sau khớp điểm của A trên bảng xếp hạng màn giáo viên; tải lại trang vẫn thấy cùng kết quả; điện thoại B (không đạt chuỗi) không thấy rương; giáo viên thấy dòng tin; chuỗi quay lại 0 sau khi nhận; phiên không bật kho báu không hiện chip hay rương.
  - Bàn phím: đi bằng Tab vào nhóm rương và mở bằng Enter/Space; axe ở 1280px và 375px cho màn hình rương trước và sau khi mở; kiểm tra `prefers-reduced-motion: reduce` không phát hoạt hình.

## Acceptance criteria

- Chế độ giải trí mặc định tắt; tắt thì không có thành phần kho báu nào xuất hiện.
- Rương dùng được hoàn toàn bằng bàn phím; kết quả đọc được bằng chữ; tôn trọng `prefers-reduced-motion`; axe đạt ở 1280px và 375px.
- Điểm hiển thị cho học sinh, bảng xếp hạng của giáo viên và trang kết quả luôn khớp nhau sau khi mở rương; tải lại trang không làm mất hay nhân đôi kết quả.
- Giáo viên thấy bảng tin vui; trang kết quả có cột kho báu khi bật chế độ.

## Risks

- Học sinh mở rương quá chậm trong chế độ tự động: tối thiểu 8 giây là giá trị khởi đầu; rương chưa mở vẫn được máy chủ tự mở nên không mất phần thưởng, chỉ mất khoảnh khắc mở.
- Thẻ rương nhiều hình ảnh khiến trang nặng ở điện thoại yếu: dùng SVG/CSS đơn giản, không tải ảnh ngoài.
- Học sinh hiểu nhầm lựa chọn rương là kỹ năng: giữ nhãn trung tính ("Rương 1/2/3") và không gợi ý rằng chọn khác nhau cho kết quả khác nhau.
