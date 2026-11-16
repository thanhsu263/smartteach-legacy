# Gói thành viên / payOS — 2026-11-15

## Các quyết định triển khai

- Theo trả lời của chủ dự án, “soạn đề” dùng luồng `/assignments` hiện có. Bảo vệ ở trigger Postgres cho tạo/sửa/phát hành, ngoài cổng Premium ở giao diện; quiz và trò chơi cơ bản vẫn Free. Hết hạn không chặn đọc/đóng đề cũ hoặc đường học sinh làm bài đã phát hành.
- Mua thêm cộng 1 hoặc 12 tháng theo lịch UTC từ `max(now, premium_until)`, không tự gia hạn. Khóa giao dịch theo người dùng rồi theo đơn giúp hai đơn khác nhau không ghi đè hạn; cùng đơn xác nhận nhiều lần chỉ cộng một lần.
- Giá có whitelist ở server và constraint/RPC ở DB. Client chỉ gửi plan. RLS chỉ cho chủ tài khoản đọc đơn và hạn; chỉ service role được bind/settle. Khóa chỉ được đọc trong module `server-only`.
- Dùng `@payos/node@2.0.6`; xác minh signed data của webhook và đối soát API payOS trước khi settle. Không tin `success` ngoài chữ ký hoặc query callback. Phục hồi create timeout bằng cùng order code và đường checkout `/web/{paymentLinkId}` của payOS; không tạo mã khác khi chưa biết giao dịch trước.
- Giáo viên mở `/membership` để chọn gói, xem hạn/trạng thái, tiếp tục thanh toán hoặc kiểm tra lại. Poll trạng thái tối đa khoảng 2 phút; webhook vẫn cập nhật DB khi trang đã đóng. Không có thông báo thành công giả khi thiếu cấu hình.
- Tablet dưới 960 px xếp ba gói thành một cột; nhãn tiết kiệm được đặt phía trên thẻ để không che tiêu đề. Giữ component nút/chuyển động đang có của landing, dùng shared Button và token cho trang thành viên.

## Chẩn đoán / kiểm chứng

- `npm test`: 32 tệp, 327 test đạt — `artifacts/membership-unit.log`.
- `npm run typecheck`: đạt — `artifacts/membership-types.log`.
- ESLint các module, routes, thành phần và test của thay đổi: đạt — `artifacts/membership-lint-final.log`.
- `npx vitest run --config vitest.db.config.mts tests/db/membership.test.ts tests/db/assignments.test.ts tests/db/assignment-attempts.test.ts`: 22/22 đạt — `artifacts/membership-db.log`. Fixture bài giao cần cấp Premium rõ ràng, kể cả tài khoản thử giới hạn 100 bài; Free không được cấp mặc định. Các dòng `invalid_retention` là negative probe hiện có.
- `APP_BASE_URL=http://localhost:3104 PLAYWRIGHT_PORT=3104 npx playwright test e2e/membership.spec.ts e2e/assignments.spec.ts --workers=2` (PowerShell đặt biến qua `$env:`): 7/7 đạt trên production build — `artifacts/membership-e2e-final.log`. Bao gồm kiểm tra WCAG ở cả 3 viewport. Checkout provider được chặn/fulfill ở trình duyệt; không chuyển tiền.
- Build ban đầu phát hiện `runtime` export không tương thích `cacheComponents` ở Next 16.4.2. Đã bỏ export theo tài liệu cài trong `node_modules/next/dist/docs/.../02-route-segment-config/runtime.md`, giữ Node.js mặc định. Bản production được build thành công cả độc lập và trong Playwright.
- `npm run scan:bundle`: 518 tệp sạch — `artifacts/membership-scan.log`; thêm mẫu phát hiện tên biến khóa bí mật payOS. Không thay phạm vi quét.
- Lỗi Docker named pipe / socket và mkdir `.next` trong sandbox là giới hạn môi trường; kiểm chứng lại với quyền cục bộ thích hợp đã đạt. Server kiểm thử dùng cổng riêng 3104 để tránh server 3103 cũ.

## Handoff / cấu hình còn lại

Migration đã áp dụng trên Supabase **cục bộ**, không áp lên dự án thật. `.env.local` chỉ bổ sung service role của stack loopback và APP_BASE_URL cục bộ; khóa payOS chưa có. Không push/deploy, không tạo hoặc đăng ký tài nguyên bên ngoài, không thu tiền thật.

Trước vận hành cần cấu hình `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` trên server đúng môi trường; đăng ký webhook HTTPS `/api/payos/webhook` và nghiệm thu giao dịch thật riêng. payOS không có sandbox theo [tài liệu chính thức](https://payos.vn/docs/moi-truong-test/). Chi tiết trong README.

Giữ nguyên các thay đổi hero/model/menu đã có sẵn trong working tree. Bản này nằm trên `main` từ revision `25e8529`, chưa tạo commit.
