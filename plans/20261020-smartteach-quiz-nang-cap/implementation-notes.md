# Ghi chú triển khai: nâng cấp quiz

## Phase 1 - Mã QR ở phòng chờ

- Cài `qrcode-generator@2.0.4` (dependency) và `jsqr@1.4.0` (devDependency), ghim đúng phiên bản. Lockfile thêm đúng hai gói; `npm audit --omit=dev` vẫn 0 lỗ hổng (cảnh báo `braces` ở `npm audit` đầy đủ có sẵn từ trước, đến từ `eslint-config-next`, chỉ ở công cụ phát triển).
- `src/lib/qr/matrix.ts`: `buildQrMatrix` (mức M, tự chọn phiên bản), `matrixToPath` (gộp các mô-đun tối liền nhau thành đoạn), `qrSize`. `src/components/qr-code.tsx`: SVG dựng từ ma trận trong React (không có `dangerouslySetInnerHTML`), `role="img"` với `<title>` và `<desc>` ghi địa chỉ, nền `#fff` và mô-đun `#000` cố định (QR cần tối trên sáng; ứng dụng hiện chưa có giao diện tối nên đây là bảo đảm cho tương lai, không phải điều đã kiểm trong giao diện tối).
- `HostLobby` hiện QR cạnh PIN trên màn rộng (từ 900px), xếp dọc trên điện thoại; chỉ vẽ khi biết `origin`.
- Kích thước: chunk chứa thư viện QR khoảng 35 kB (khoảng 12 kB nén gzip), chỉ tải ở khu vực `/host` (không vào trang công khai).
- Đã đạt (không cần Docker): `typecheck`, `lint`, 216 test đơn vị (thêm 5 test QR, trong đó giải mã bằng `jsqr` ra đúng địa chỉ cho địa chỉ ngắn/dài/chuỗi 300 ký tự), `npm run build`, `scan:bundle` sạch.
- e2e `e2e/host.spec.ts` thêm test "mã QR": hình có tên truy cập "Mã QR vào phòng", `data-value` và `<desc>` khớp `<origin>/play?pin=<PIN>` của phiên, màu `#fff`/`#000` cố định, **vẽ chính SVG đang hiển thị ra điểm ảnh rồi giải mã bằng `jsqr` ra đúng địa chỉ**, và mở địa chỉ đó trên điện thoại 375px thì ô PIN đã điền sẵn.
- axe: `host-a11y.spec.ts` (đã có kiểm phòng chờ) đạt ở 1280px và 375px với QR hiển thị, không tràn ngang. Ảnh chụp phòng chờ ở 1280x720 và 375x812: PIN và QR cùng thấy, QR xếp dọc dưới PIN trên điện thoại.
- Phá thử: đảo `isDark` làm cả test đơn vị và e2e giải mã hỏng; dịch lệch đường vẽ làm test đơn vị hỏng (e2e vẫn quét được vì vùng yên tĩnh rộng nên dịch cả mã một mô-đun không làm hỏng việc giải mã; đó là hành vi đúng). Đã khôi phục.
- Kết quả cuối: typecheck, lint, 216 unit, 178 e2e đạt (Docker Desktop đã bật lại). Nghiệm thu thủ công trên máy chiếu thật để ở task 7.7.


### Sửa sau review phase 1

Review không có Critical hay High; ba mục Low đã sửa, mục còn lại chờ máy chiếu thật.

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Low: tên truy cập của QR gồm cả mô tả (địa chỉ và PIN) vì `aria-labelledby` trỏ cả `<title>` và `<desc>` | `aria-labelledby` chỉ trỏ `<title>`; `<desc>` chuyển sang `aria-describedby` | e2e dùng `toHaveAccessibleName("Mã QR vào phòng")` (khớp đúng) và `toHaveAccessibleDescription`; phá thử trả `aria-labelledby` về cũ thì test hỏng đúng với tên dài |
| Low: `width` của QR bị hai file CSS module cùng đặt, thắng thua phụ thuộc thứ tự import | `QrCode` luôn rộng 100% khung chứa; khung `.qrFrame` trong lobby quyết định cỡ (cùng giá trị như trước) | e2e và axe phòng chờ ở 1280px và 375px vẫn đạt |
| Low: test và notes ghi "kể cả giao diện tối" nhưng ứng dụng chưa có giao diện tối nên chỉ kiểm thuộc tính tĩnh | Bỏ `emulateMedia` giả; lời ghi nói rõ màu cố định là bảo đảm cho tương lai | - |
| Cần kiểm chứng (7.7): QR rộng 300px ở 1920x1080 (trần `20rem`) có thể nhỏ trên máy chiếu | Chưa sửa; nâng trần lên khoảng `28rem` nếu quét từ xa khó | Nghiệm thu máy chiếu thật |

Kết quả: typecheck, lint, 19 test e2e `host` và `host-a11y` đạt.
