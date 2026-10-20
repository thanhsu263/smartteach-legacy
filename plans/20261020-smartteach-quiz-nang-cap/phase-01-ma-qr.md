# Phase 1 - Mã QR ở phòng chờ

## Overview

Phòng chờ hiện mã QR cạnh PIN để người xem quét bằng camera và vào thẳng bước chọn biệt danh. Đóng gói được độc lập vì địa chỉ đích đã có: `lobby.tsx` đã tính `joinUrl = <origin>/play?pin=<PIN>` và `/play` đọc `?pin=` (`src/components/live/player/play-entry.tsx`). Phase này chỉ thêm một thành phần vẽ và thư viện mã hoá.

## Files

- Sửa: `package.json` và lockfile (thêm `qrcode-generator` đúng `2.0.4`; devDependency `jsqr` đúng `1.4.0`), `src/components/live/host/lobby.tsx`, `src/components/live/host/host.module.css`.
- Mới: `src/lib/qr/matrix.ts` (+ `matrix.test.ts`), `src/components/qr-code.tsx` (+ `qr-code.module.css`).
- Sửa test: `e2e/host.spec.ts`, `e2e/host-a11y.spec.ts`.

## Tasks

- [ ] **1.1 Bộ mã hoá.** `buildQrMatrix(text: string): boolean[][]` bọc `qrcode-generator` (`qrcode(0, 'M')`, `addData`, `make`, đọc `isDark`). Mức sửa lỗi M. Ném lỗi rõ ràng nếu dữ liệu quá dài (QR tối đa phiên bản 40). Không dùng `createSvgTag` (tránh `dangerouslySetInnerHTML`). Kiểm tra: `matrix.test.ts` vẽ ma trận ra bộ đệm RGBA (mỗi mô-đun 8 điểm ảnh, vùng yên tĩnh 4 mô-đun, nền trắng, mô-đun đen) rồi **giải mã bằng `jsqr`** và so sánh bằng đúng chuỗi gốc, với địa chỉ thật dài 40-120 ký tự (vd `https://smartteachvn.vercel.app/play?pin=123456`) và một chuỗi 300 ký tự; PIN khác nhau cho ma trận khác nhau; chuỗi rỗng bị từ chối.
- [ ] **1.2 Thành phần `QrCode`.** Vẽ SVG từ ma trận: `viewBox` theo số mô-đun cộng vùng yên tĩnh 4, `shape-rendering="crispEdges"`, các mô-đun gộp vào một `<path>` để nhẹ DOM. Nền **luôn trắng, mô-đun luôn đen** trong cả giao diện tối (QR cần tối trên sáng), khung có viền; `role="img"` với `<title>` "Mã QR vào phòng" và `<desc>` ghi địa chỉ; cho `value` qua prop và hiển thị cả địa chỉ chữ bên cạnh ở nơi dùng. Kích thước co giãn bằng CSS (`min(60vmin, 26rem)`), không tràn ở 375px. Kiểm tra: test đơn vị render ra đúng số mô-đun tối; e2e kiểm tên truy cập và `desc`.
- [ ] **1.3 Gắn vào `HostLobby`.** QR lớn cạnh PIN trong bố cục phòng chờ; câu hướng dẫn nêu cả hai cách ("Quét mã QR hoặc vào {địa chỉ}/play và nhập PIN"); nút sao chép link giữ nguyên. Bố cục chiếu lớn: QR và PIN cùng nhìn thấy không cuộn ở 1280x720 và 1920x1080; ở 375px xếp dọc. Kiểm tra: e2e `host.spec.ts` (phòng chờ có `img` "Mã QR vào phòng" và địa chỉ trong `desc` khớp `<origin>/play?pin=<PIN>` của phiên; mở địa chỉ đó trên trang học sinh thì ô PIN đã điền); `host-a11y.spec.ts` chạy axe ở 1280px và 375px với QR hiển thị.

## Acceptance criteria

- Quét QR (giải mã bằng `jsqr` trong test) ra đúng `<origin>/play?pin=<PIN>`.
- Trang `/play` mở từ địa chỉ đó có ô PIN đã điền.
- axe đạt ở 1280px và 375px; QR có nền trắng và vùng yên tĩnh đủ trong cả giao diện tối.
- Không đổi hành vi phòng chờ ngoài việc thêm QR; test hiện có đạt.

## Risks

- QR đẹp trên màn hình nhưng quét kém trên máy chiếu: kiểm thủ công ở nghiệm thu (7.5); mức sửa lỗi M, mô-đun lớn nhờ địa chỉ ngắn.
- Giao diện tối làm nền QR bị tối: đã ép nền trắng bằng CSS; test ảnh chụp ở chế độ tối kiểm màu nền của khung QR.
