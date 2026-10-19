# Phase 4 - Đồng bộ thời gian thực

## Overview

Lớp máy khách dùng chung cho cả giáo viên và học sinh: Broadcast chỉ là "chuông báo", polling là nguồn đúng và là dự phòng khi mất kết nối. Chưa có giao diện (phase 5 và 6 dùng lại). Bật Realtime ở stack cục bộ.

## Files

- `supabase/config.toml` (`[realtime] enabled = true`), `README.md` (ghi chú về image tải thêm).
- `src/lib/live/rpc.ts`, `types.ts`, `sync.ts`, `clock.ts`, `storage.ts` và các tệp `*.test.ts` (mới).
- `src/lib/live/use-live-state.ts` (hook React) (mới).
- `tests/db/live-realtime.test.ts` hoặc `tests/realtime/` (mới, cần stack cục bộ có Realtime).

## Tasks

- [x] **4.1 Bật Realtime cục bộ.** Đặt `[realtime] enabled = true`; `npm run supabase:stop` rồi `npm run supabase:start` (tải thêm image, cần xác nhận). Kiểm tra: script nhỏ mở hai client, một gửi Broadcast lên kênh `session:<uuid>` và client kia nhận được; các test DB và e2e cũ vẫn đạt.
- [x] **4.2 Lớp gọi hàm có kiểu.** `rpc.ts` bọc các hàm của phase 3 (nhóm `host.*` và `player.*`) trả `Result<T>` như `src/lib/classes/api.ts`, đổi lỗi thành tiếng Việt (PIN sai, phiên đã khoá, đã trả lời, hết giờ, bị loại, mất kết nối), không lộ thông báo kỹ thuật. Kiểm tra: unit test ánh xạ lỗi.
- [x] **4.3 Lõi đồng bộ.** `createLiveSync({ fetchState, subscribe, pollMs })` không phụ thuộc React: khi nhận tin báo (`seq`) thì gọi `fetchState`; nếu không có tin trong khoảng chờ thì polling (3 giây khi đang hỏi hoặc phòng chờ, chậm hơn khi nhàn rỗi, giãn dần khi lỗi liên tiếp); bỏ qua trạng thái cũ hơn theo `seq`; ước lượng độ lệch đồng hồ từ `server_now` để đếm giờ đúng; phát trạng thái kết nối `live | polling | offline`. Kiểm tra: unit test với đồng hồ giả và kênh giả (nhận tin, mất tin, kênh chết, lỗi mạng rồi phục hồi, thứ tự tin đảo).
- [x] **4.4 Hook React và lưu mã tham gia.** `useLiveState` cho giáo viên và học sinh dọn dẹp đúng khi gỡ; `storage.ts` giữ mã tham gia trong `sessionStorage` (có bắt lỗi khi bị chặn) để tải lại trang vào lại đúng người chơi. Kiểm tra: unit test có lỗi bị chặn lưu trữ; không có cảnh báo hook trong lint.
- [x] **4.5 Phát tin báo từ giáo viên.** Sau mỗi hàm điều khiển thành công, client giáo viên gửi `{ seq }` lên kênh `session:<id>`; thất bại khi gửi không làm hỏng thao tác (người chơi vẫn polling). Tin báo không chứa dữ liệu nào ngoài `seq`. Kiểm tra: unit test; test tích hợp ở 4.6.
- [x] **4.6 Test tích hợp với Realtime thật.** Một giáo viên và 3 người chơi (supabase-js, kênh thật): giáo viên mở câu thì cả ba nhận tin và lấy được đề; sau đó phá kênh của một người chơi (đóng socket) và xác nhận người đó vẫn theo kịp bằng polling; người chơi sai mã tham gia không lấy được trạng thái. Kiểm tra: test đạt hai lần liên tiếp.

## Acceptance criteria

- Realtime chạy ở stack cục bộ; tin báo tới người chơi trong thời gian ngắn.
- Mất kênh Realtime thì người chơi vẫn đồng bộ được nhờ polling; không có trạng thái cũ ghi đè trạng thái mới.
- Tin báo không mang dữ liệu nhạy cảm; một client độc hại gửi tin giả chỉ làm thêm một lần hỏi trạng thái.

## Risks

- Kênh Broadcast công khai: ai biết `session:<uuid>` đều nghe và gửi được; UUID chỉ trả về sau khi vào phòng. Chấp nhận được vì tin báo không chứa dữ liệu; ghi rõ trong mã.
- Ước lượng độ lệch đồng hồ sai làm thanh đếm giờ lệch: hạn chót thật luôn do máy chủ quyết định, thanh đếm chỉ là hiển thị.
