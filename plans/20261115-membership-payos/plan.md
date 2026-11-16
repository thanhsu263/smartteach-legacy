Mode: local
Status: implemented — local verification passed; production configuration pending

# Gói thành viên và thanh toán payOS

Người dùng đã chốt: Free giữ quiz và game cơ bản; Premium mở luồng đề/giao bài `/assignments`, giá 50.000đ/1 tháng hoặc 500.000đ/1 năm. Mua thêm cộng dồn từ hạn đang còn hiệu lực; nếu đã hết hạn tính từ thời điểm xác nhận thanh toán. Dữ liệu/kết quả cũ và học sinh làm bài đã phát hành được giữ khi hết hạn. Tạo, chỉnh sửa và phát hành đề cần Premium.

## Triển khai

1. Thay section ba lối vào trên landing bằng ba gói, giữ thiết kế và chuyển động hiện có; thêm trang quản lý/nâng cấp thành viên.
2. Thêm bảng đơn, quyền Premium và RPC Supabase: giá cố định phía server/DB; RLS theo chủ sở hữu; chỉ server xử lý xác nhận thanh toán. Chống xử lý trùng và cộng hạn nguyên tử, bảo vệ ghi đề ở DB.
3. SDK `@payos/node`: tạo checkout, xác minh webhook, đối soát từ API payOS, khớp order/link/số tiền trước khi cấp quyền. Callback trình duyệt không cấp quyền. Giới hạn thời gian gọi, kích thước JSON và đơn đang chờ.
4. Trang kết quả có trạng thái đang chờ/thành công/hủy/lỗi; người dùng xem hạn và kiểm tra thanh toán lại. Không tự gia hạn/khấu trừ.
5. Kiểm chứng unit, DB thật, auth/giá giả mạo/webhook trùng/đồng thời/hết hạn, responsive và luồng checkout giả lập có kiểm soát; build và bundle scan.

## Cấu hình / giới hạn

Đã cấu hình service role của stack Supabase cục bộ trong `.env.local` (không commit); chưa có khóa payOS. Hoàn tất code và kiểm thử cục bộ; không tạo giao dịch thu tiền thật. Cần chủ dự án cấu hình khóa server và URL webhook HTTPS trước khi vận hành thật. payOS không có sandbox riêng theo tài liệu chính thức. Hướng dẫn ở README, mục “Gói thành viên và payOS”.

Không thay giá/quyền của quiz, không xây module soạn đề mới, không sửa các thay đổi hero/menu có sẵn. Chưa push/deploy.

## Kết quả kiểm chứng

- Unit: 327/327; typecheck và lint các tệp liên quan đạt.
- Supabase/Postgres cục bộ: 22/22 test liên quan thành viên, assignments và attempts đạt; migration đã áp dụng cục bộ.
- Playwright trên bản production: 7/7, gồm pricing/checkout ở 375/768/1280 px, WCAG, Free/Premium, callback giả, đơn người khác, checkout giả lập và luồng giao bài/học sinh.
- Production build đạt; bundle scan 518 tệp không phát hiện khóa bí mật.
- Giao dịch payOS và webhook từ dịch vụ thật: UNVERIFIED vì chưa cấu hình khóa/kênh thật. Không triển khai hoặc đăng ký webhook bên ngoài.
