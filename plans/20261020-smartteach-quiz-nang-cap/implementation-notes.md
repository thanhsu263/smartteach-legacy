# Ghi chú triển khai: nâng cấp quiz

## Phase 1 - Mã QR ở phòng chờ

- Cài `qrcode-generator@2.0.4` (dependency) và `jsqr@1.4.0` (devDependency), ghim đúng phiên bản. Lockfile thêm đúng hai gói; `npm audit --omit=dev` vẫn 0 lỗ hổng (cảnh báo `braces` ở `npm audit` đầy đủ có sẵn từ trước, đến từ `eslint-config-next`, chỉ ở công cụ phát triển).
- `src/lib/qr/matrix.ts`: `buildQrMatrix` (mức M, tự chọn phiên bản), `matrixToPath` (gộp các mô-đun tối liền nhau thành đoạn), `qrSize`. `src/components/qr-code.tsx`: SVG dựng từ ma trận trong React (không có `dangerouslySetInnerHTML`), `role="img"` với `<title>` và `<desc>` ghi địa chỉ, nền `#fff` và mô-đun `#000` cố định để quét được cả trong giao diện tối.
- `HostLobby` hiện QR cạnh PIN trên màn rộng (từ 900px), xếp dọc trên điện thoại; chỉ vẽ khi biết `origin`.
- Kích thước: chunk chứa thư viện QR khoảng 35 kB (khoảng 12 kB nén gzip), chỉ tải ở khu vực `/host` (không vào trang công khai).
- Đã đạt (không cần Docker): `typecheck`, `lint`, 216 test đơn vị (thêm 5 test QR, trong đó giải mã bằng `jsqr` ra đúng địa chỉ cho địa chỉ ngắn/dài/chuỗi 300 ký tự), `npm run build`, `scan:bundle` sạch.
- e2e `e2e/host.spec.ts` thêm test "mã QR": hình có tên truy cập "Mã QR vào phòng", `data-value` và `<desc>` khớp `<origin>/play?pin=<PIN>` của phiên, nền `#fff` và mô-đun `#000` kể cả khi giao diện tối, **vẽ chính SVG đang hiển thị ra điểm ảnh rồi giải mã bằng `jsqr` ra đúng địa chỉ**, và mở địa chỉ đó trên điện thoại 375px thì ô PIN đã điền sẵn.
- axe: `host-a11y.spec.ts` (đã có kiểm phòng chờ) đạt ở 1280px và 375px với QR hiển thị, không tràn ngang. Ảnh chụp phòng chờ ở 1280x720 và 375x812: PIN và QR cùng thấy, QR xếp dọc dưới PIN trên điện thoại.
- Phá thử: đảo `isDark` làm cả test đơn vị và e2e giải mã hỏng; dịch lệch đường vẽ làm test đơn vị hỏng (e2e vẫn quét được vì vùng yên tĩnh rộng nên dịch cả mã một mô-đun không làm hỏng việc giải mã; đó là hành vi đúng). Đã khôi phục.
- Kết quả cuối: typecheck, lint, 216 unit, 178 e2e đạt (Docker Desktop đã bật lại). Nghiệm thu thủ công trên máy chiếu thật để ở task 7.7.

