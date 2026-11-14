# Bàn giao interaction và motion SmartTeach

## Điểm đã xử lý khi triển khai

- Landing dành riêng 12 px ngoài chiều cao sticky header cho mỗi anchor. CSS của landing triệt phần scroll padding 80 px dùng chung để native fragment, history và scrollspy cùng dùng một mốc.
- Menu landing dùng `<details>`/`<summary>` để anchor vẫn dùng được khi tắt JS. Escape trả focus về summary. Khi chuyển sang desktop, giữ mục đã focus nếu disclosure vừa bị CSS ẩn.
- Sidebar tablet rộng 152 px và hiện nhãn ở 720–959 px. Cỡ số đồng hồ theo bề rộng container trong dải này. Sidebar mở tạm dùng lớp phủ, giữ nguyên offset và bề rộng của `main`.
- Tooltip nút sắp xếp câu dùng popover native opt-in để thoát vùng clipping và đóng bằng Escape. Tên truy cập trên nút vẫn đủ khi popover thiếu hỗ trợ. Các dialog nghiệp vụ giữ focus và vòng đời native. Hiệu ứng exit dùng `overlay` và `allow-discrete` khi trình duyệt hỗ trợ.
- Kho học liệu giữ node bộ lọc và focus khi đổi URL. Lỗi tạo bản sao hiển thị cạnh nút để có thể thử lại. Thao tác đổi tên lớp giữ dữ liệu nhập khi lỗi và trả focus về nút mở khi thành công.
- Đồng hồ dùng vùng status cố định, có tín hiệu chữ ở 10 giây cuối và khi hết giờ. Fullscreen giữ cập nhật số và thanh tiến độ theo đồng hồ hiện có, bỏ nội suy trang trí.

## Hiệu năng và hình ảnh

Đo hai production build bằng Chromium trên cùng máy, cùng viewport, tắt cache ở context mới. Các số bên dưới là byte JS/CSS tải trước thao tác. Tài nguyên tự prefetch trong lần tải đầu được tính theo cùng cách cho hai bản.

| Route | JS raw trước → sau | JS gzip trước → sau | CSS raw trước → sau | CSS gzip trước → sau |
| --- | ---: | ---: | ---: | ---: |
| `/` | 750215 → 758455 | 215125 → 218313 | 144537 → 148799 | 24864 → 26281 |
| `/tools/countdown` | 779719 → 782748 | 226137 → 227647 | 125277 → 124384 | 20607 → 20824 |
| `/play` | 781933 → 784252 | 225168 → 226376 | 125277 → 124384 | 20607 → 20824 |

Ảnh trước/sau, trace và danh sách tài nguyên nằm trong `artifacts/motion-build-20261112/`. Tệp `capture.mjs` tái chạy phép đo trên production server local. `after/reflow.json` ghi kết quả ở 640 × 400 CSS px với hệ số 2× và luồng bàn phím qua anchor. Kết quả trình chiếu là mô phỏng Chromium 1280 × 720. Chưa đo trên máy chiếu vật lý hoặc nghe live region bằng trình đọc màn hình ngoài trình duyệt.

JavaScript gzip tăng 3,11 KiB ở landing, 1,47 KiB ở trang đồng hồ và 1,18 KiB ở `/play`, trong ngân sách 8/4/4 KiB. Kiểm các chunk tải ở `/play` và trang đồng hồ xác nhận island hero chỉ tải ở `/`. Sáu trace sau thay đổi có task renderer dài nhất 6,03 ms và không ghi layout shift ngoài thao tác người dùng. Baseline tương ứng là 9,70 ms và 0 layout shift ngoài thao tác.

## Kiểm thử

- `npm run lint`, `npm run typecheck`, `npm test` (294/294), `npm run build`, `npm run scan:bundle` và `git diff --check` đạt. Baseline primitive/contrast đạt 43/43 và hai spec Playwright baseline đạt 41/41.
- Lượt toàn bộ trên production build cuối với Chromium và Supabase local có 272 đạt, 1 lỗi môi trường, 0 skip. Chromium báo `ERR_NO_BUFFER_SPACE` khi mở `/login` trước assertion của ca WCAG 375 px. Chạy riêng `e2e/a11y-auth.spec.ts` bằng một worker đạt 2/2, gồm ca đó. Giữ cả hai báo cáo trong thư mục evidence.
- Lượt lặp `e2e/home.spec.ts`, `e2e/apple-interface.spec.ts`, `e2e/teacher-sidebar.spec.ts` trên cùng build đạt 37/37. Có ảnh các viewport 320/375/768/1280, drawer, sidebar mở tạm, anchor, tooltip, dashboard đang tải và đồng hồ trình chiếu.

## Hero lớp học 3D tương tác

Hero dùng hình học Three.js dựng theo bố cục video đã duyệt. Camera nhận vận tốc chuột theo px/giây, giới hạn ở 1.500 px/giây và hãm về vị trí ban đầu. Khi nắm vật thể, camera giữ góc nhìn để phép kéo và xoay ổn định. Bút chì và thước di chuyển theo chuột. Cuốn vở, quả địa cầu và Rubik xoay. Hai thẻ mở cùng một câu hỏi mẫu bằng dialog. Màn hình hẹp, thiết bị cảm ứng và tùy chọn giảm chuyển động dùng ảnh lớp học tĩnh cùng nút thử quiz. Three.js được nạp động khi hero đủ điều kiện hiển thị.

Build production, ESLint các tệp sửa, Vitest 296/296 và hai spec Playwright landing 35/35 đã đạt. Playwright kiểm thao tác kéo, mở thẻ, trả lời và đóng quiz, chế độ tĩnh, mất WebGL, tạm dừng và các viewport 320/375/768/1280 trên Chromium.

Lớp học hiện lia ngang và tiến lùi theo chu kỳ 8 giây, dựa trên nhịp nền Arena3. Phần phản hồi theo chuột còn 20% biên độ ban đầu. Cảnh lớp học nhận biến đổi riêng, còn vật thể nổi và phép chọn bằng chuột dùng camera cố định. Rubik dùng sáu màu chuẩn, quả địa cầu có chân đế và ảnh tĩnh được chụp lại từ cảnh mới.

## Viền nút và hiệu ứng xuất hiện trên landing

Viền sáng nhận chuột trong 100 px từ mép nút. Khi chuột ở xa, vùng sáng quay một vòng trong 3,2 giây trên các nút đang trong khung nhìn. Nút kính dùng nền trắng 10%, tăng lên 20% khi hover, và làm mờ hậu cảnh 8 px theo mẫu Arena3. Viền và chữ đổi theo màu nền để giữ khả năng đọc.

FoldText áp dụng cho tiêu đề section và tiêu đề thẻ bên dưới hero chưa có hiệu ứng. ScrollFloat giữ thời lượng 1,5 giây mỗi từ. ScrollFloat, FoldText và CountUp phát lại khi cuộn quay về và hiển thị nội dung tĩnh với tùy chọn Giảm chuyển động.

Hai spec Playwright landing đạt 40/40 trên production build local. Ảnh đối chiếu nút và thông số trình duyệt nằm trong `artifacts/landing-motion-polish/`.

Ở lượt tinh chỉnh tiếp theo, lớp trắng của nút kính còn 5% khi nghỉ và 10% khi hover. Nút demo bỏ viền trang trí và giữ chỉ báo focus. “Mở tri thức.” dùng GradientText xanh navy, cobalt và tím. Khi cuộn lên, các tiêu đề và số chạy ngược hiệu ứng lúc chúng lùi về mép dưới khung nhìn. Điều hướng trong landing giữ địa chỉ sạch, lưu vị trí trong history và vẫn mở được liên kết cũ có fragment.

Toàn bộ 19 tiêu đề chuyển sang ScrollFloat 1,3 giây mỗi từ. Biên độ dịch dọc còn 44,8% chiều cao chữ và độ kéo giãn còn 14%, cùng giảm 30% so với ScrollFloat trước đó. Nút demo có lại viền sáng chuyển động. Nhãn “Một không gian. Muôn cách học hay.” dùng cùng hiệu ứng viền và giữ vị trí cố định. “Bật hứng khởi.” dùng gradient navy và xanh lam đậm.

GlassSurface thêm khúc xạ nền bằng SVG vào thanh menu và nút kính của landing, với kích thước và bo góc lấy từ phần tử hiện tại. Trình duyệt thiếu hỗ trợ lọc SVG dùng lớp kính mờ và vệt phản chiếu tĩnh. AnimatedContent dịch các khối nội dung 24 px và tăng độ rõ trong 0,8 giây khi cuộn xuống. Khi cuộn lên qua điểm kích hoạt, hiệu ứng chạy ngược và tiếp tục phát khi cuộn xuống lại. Chế độ Giảm chuyển động hiển thị khối ngay.
