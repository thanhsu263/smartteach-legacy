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

## Bộ thẻ quiz 2.5D

Ba thẻ HTML/CSS thay hai model quiz trong cảnh Three.js. CardSwap dùng mã React Bits được cung cấp, thêm hỗ trợ đổi tùy chọn Giảm chuyển động trong lúc mở trang, dừng khi rời khung nhìn hoặc ẩn tab và chỉ cho thẻ trước nhận focus. Ba tông cobalt, vàng, navy dựa trên ảnh landing xuất từ Figma trong repo và ảnh tham khảo. Link Figma trực tiếp trả 403. Trang quiz ở localhost yêu cầu đăng nhập, nên nội dung dùng ba câu hỏi mẫu có đáp án và lời giải, với cấu trúc lấy từ giao diện quiz hiện có.

Thẻ chuyển sau 5 giây, dừng khi hover, có focus hoặc mở câu hỏi mẫu. Người dùng có thể kéo, chuyển bằng phím mũi tên hoặc nút trước/sau, và bấm thẻ để trả lời thử. Trên màn hẹp, bộ thẻ nằm dưới nội dung hero. Poster dự phòng được chụp lại từ cảnh lớp học đã bỏ hai model quiz.

Typecheck, ESLint các tệp thay đổi, Vitest 298/298 và 14 kiểm thử Playwright tập trung vào hero, CardSwap, WebGL fallback, WCAG và responsive đều đạt. Ảnh desktop và điện thoại nằm trong `artifacts/hero-card-swap-1440-final.png` và `artifacts/hero-card-swap-375-final.png`.

Theo ảnh tham khảo tiếp theo, khung thẻ tăng từ 500 × 340 lên 560 × 410. Ba vị trí xoay −8°, +2°, +12° và giữ độ sâu thấp để tạo chồng thẻ xòe. CardSwap tính lại biên theo góc xoay để co giãn vừa màn hình và nội suy góc theo vị trí khi đổi thẻ. Sáu kiểm thử swap, kéo, mở câu hỏi và responsive đạt. Ảnh đối chiếu mới nằm trong `artifacts/hero-card-fan-final.png`.

Lượt điều chỉnh sau bỏ dòng “Quiz mẫu”, số thứ tự và các nút bên dưới bộ thẻ. Góc xoay còn 10% mức trước, tương ứng −0,8°, +0,2°, +1,2°. Bộ thẻ tiếp tục tự chuyển, nhận thao tác kéo và phím mũi tên.

Khung quiz tiếp tục tăng 20% lên 672 × 492, gồm cả nội dung chữ và đáp án. Khoảng cách, độ sâu và góc xoay giữa các lớp tăng theo tỷ lệ 1,2. Hướng xiên dùng skewY 1,2°, tương đương 20% mức 6° trong CardSwap gốc. Vùng chứa được mở rộng để phần phóng lớn hiển thị đủ trên desktop và vẫn co vừa màn hẹp.

## Lớp học từ ZIP và SideRays · 15/11/2026

Model trong `classroom.zip` thay model lớp học trước đó. FBX có 72.158 tam giác sau khi bỏ ba mesh `light_rays`, `dust`, `glow`; không cần giảm thêm đa giác. Texture được dựng lại từ các bản đồ PBR đi kèm, giới hạn tối đa 1K theo mức tối ưu người dùng đã duyệt. GLB cuối dùng WebP và Meshopt, nặng 900.824 byte. ZIP gốc không bị sửa. Quy trình chuyển đổi nằm trong `artifacts/convert-classroom.mjs` và `public/hero/models/README.md`.

Camera lớp học nhìn chéo về góc bảng/cửa: vị trí (−4; 5,4; 5,8), hướng nhìn (6,2; 0,2; −9,5), FOV 55°. Camera vật thể nổi giữ riêng, không nhận chuyển động lớp học. Các vật thể được dời quanh mép hero để tránh bộ thẻ lớn. Rubik được thay bằng model cục tẩy người dùng cung cấp; kích thước cục tẩy giảm từ 0,76 còn 0,38 ở yêu cầu tiếp theo.

SideRays dùng fragment shader React Bits người dùng cung cấp, tích hợp vào cùng renderer và vòng lặp Three.js. Tia sáng vẽ sau lớp học, trước vật thể nổi, không tạo canvas hay WebGL context thứ hai. Dùng ánh vàng nhạt pha xanh, không bụi, phản hồi chuột nhẹ; dừng khi hero khuất hoặc mở dialog. Giảm chuyển động giữ tia sáng và lớp học tĩnh, kể cả khi đổi tùy chọn trong lúc trang đang mở. Ánh sáng vật thể và lớp học dùng layer riêng. Poster được chụp lại từ cảnh mới, không chứa bộ quiz hoặc nội dung HTML.

Sửa thêm lỗi vùng nhận chuột của bộ thẻ che nút “Thử một câu quiz” bằng thứ tự lớp của nút. Trình kiểm thử Chromium dùng SwiftShader (render bằng CPU); luồng kéo vật thể/quiz có thời gian chờ riêng cho việc tải và render GLB. Typecheck, ESLint và Vitest 298/298 đạt. Ảnh desktop/điện thoại mới ở `artifacts/classroom-glb-1440.png` và `artifacts/classroom-glb-375.png`.

Lượt Playwright 15 ca trên production đạt 14 ca; ca CardSwap báo góc 3,6° thay vì 2,4° khi bật Giảm chuyển động. Trace cô lập trên dev và production không tái hiện sai góc. Gia cố `refresh` của CardSwap để luôn ghi lại style theo thứ tự hiện tại sau mỗi render React, kể cả khi Giảm chuyển động không chạy frame để sửa lại style. Lượt production tiếp theo đạt 5/5 ca liên quan đến cảnh, kéo/quiz, CardSwap và chạm 375/768 px. Không có lỗi shader SideRays; đã kiểm tất cả 13 ảnh texture đều 1024 × 1024. Tệp poster sạch nặng 80.418 byte.

Lượt chỉnh bố cục tiếp theo giảm độ phủ của lớp làm sáng trước nền còn 20% (giảm 80%) trên desktop, tablet và mobile. Camera lớp học dùng `setViewOffset` với offset Y bằng −20% chiều cao canvas để dịch hình ảnh lớp học xuống đúng 20% hero và giữ hướng nhìn. Camera vật thể nổi, thẻ quiz và nội dung HTML giữ vị trí hiện có. Đã cập nhật poster, xem lại ảnh 1440/375 px không có khoảng trống hoặc tràn ngang; typecheck và ESLint đạt.

Tinh chỉnh tiếp: hạ hình ảnh lớp học thêm 20% hero (offset tổng 40%) và giảm hệ số rung chuột từ 0,10 xuống 0,09. Nhịp chuyển động tự động 8 giây giữ nguyên. Cập nhật poster, kiểm tra render 1440/375 px và ESLint đạt; bốn kiểm thử pointer/cycle đạt sau khi cập nhật kỳ vọng biên độ mới.

Yêu cầu nâng tiếp 60% được áp dụng so với vị trí vừa hạ 40%: lớp học hiện cao hơn vị trí gốc 20%, dùng view offset Y = +20% chiều cao canvas. Giữ biên độ rung 0,09. Đã cập nhật poster và kiểm tra render 1440/375 px, ESLint và diff check đạt.

Hạ cảnh lớp học thêm 10% so với lượt nâng trước: view offset Y hiện bằng +10% chiều cao canvas. Đã cập nhật poster và kiểm tra render desktop/mobile không tràn ngang.

Sàn, phần ốp chân tường và gờ viền chuyển sang trắng bằng màu nền của material `walls`, bỏ atlas màu gỗ riêng của phần cấu trúc. Giữ normal, roughness và AO để vẫn thấy khe, độ nổi và bóng nhẹ. Các material bàn ghế, cửa, bảng và chi tiết khác giữ màu gốc. Đã xuất lại GLB 890.916 byte, giữ nguyên 72.158 tam giác, cập nhật poster và đối chiếu ảnh desktop/mobile không có lỗi render hoặc tràn ngang.

Tông trắng của cấu trúc được hạ nhẹ xuống xám trắng `#E1E4E9` theo ảnh phản hồi tiếp theo. Đã đồng bộ màu trong GLB và script chuyển đổi, giữ bản đồ bề mặt; cập nhật poster và đối chiếu desktop/mobile không có lỗi render hoặc tràn ngang.

Hạ tông sàn/chân tường thêm 30% so với mức trên: nhân màu nền `#E1E4E9` với 0,7 trong không gian màu tuyến tính (tương đương gần `#C0C3C7` sRGB). Đồng bộ GLB và script chuyển đổi; cập nhật poster, kiểm tra render desktop/mobile không có lỗi hoặc tràn ngang.

Lượt tiếp theo hạ thêm 30% tông cấu trúc, hệ số tổng 0,49 từ `#E1E4E9` (gần `#A4A6A9` sRGB), và giảm hệ số rung chuột từ 0,09 xuống 0,081. Cục tẩy định vị phía trên span `khởi.` bằng hình học DOM, tính lại khi resize và sau khi font tải xong, giữ cỡ hiện tại trên desktop/mobile.

Vật thể nổi bỏ toàn bộ gesture nắm/kéo, pointer capture và con trỏ grab. Rê chuột qua làm vật thể nghiêng, nhích và phóng nhẹ 7%, hãm mượt về vị trí ban đầu khi rời; không kích hoạt trên cảm ứng, nút/link/bộ thẻ quiz hoặc chế độ Giảm chuyển động. CardSwap giữ tương tác riêng. Đã cập nhật poster, kiểm tra ảnh 1440/375 px, typecheck, ESLint, production build và Vitest 298/298 đạt. Sáu ca Playwright trên localhost dev đạt, gồm hover bút/cục tẩy, không nhận pointer capture khi giữ chuột, trả lời quiz, fallback, giảm chuyển động và tap 375/768 px.

Yêu cầu hạ riêng tông sàn 20%: tách 66 tam giác bề mặt hướng lên dưới cao độ 0,6 m sang material `floor`, gồm sàn và mặt bục. Màu sàn bằng 0,8 lần material `walls` trong không gian tuyến tính; chân tường/gờ viền giữ mức trước. Giữ normal/AO/roughness và tổng 72.158 tam giác, GLB 893.264 byte. Đã kiểm tỷ lệ màu trực tiếp trong GLB, xem ảnh desktop/mobile không có lỗi render hoặc tràn ngang và cập nhật poster.

Tiếp tục hạ riêng sàn 20% (hệ số tổng 0,64 so với chân tường), thêm lớp phủ trắng đồng đều opacity 10% lên scenery. Lớp phủ nằm trên canvas nhưng dưới title, bộ quiz và nút; không nhận pointer event. Poster chụp không kèm lớp phủ mới để fallback không bị phủ hai lần. Đã đối chiếu ảnh desktop/mobile và cập nhật ảnh dự phòng.

Nền xanh nhạt bao quanh nhóm điều hướng RubberSegment chuyển từ màu đặc sang opacity 72%, dùng chung biến `--landing-glass-opacity` với menubar. Giữ sắc xanh và bề mặt mục đang chọn; chế độ giảm trong suốt/tăng tương phản vẫn dùng nền đặc. Đã đối chiếu computed style: header `rgba(255,255,255,0.72)`, nav `rgba(240,245,255,0.72)` và bấm điều hướng thành công. Ảnh đối chiếu tại `artifacts/header-nav-glass.png`.

Kiểm tra RubberSegment đạt. Ca tự ẩn header có một lần không nhận trạng thái ẩn trong 5 giây trên dev; probe Chromium riêng cùng viewport/motion ghi nhận scrollY = 550, `data-header-hidden` bật và transform Y = −57 ngay ở mẫu đầu, không có focus/hover giữ header. Chưa tái hiện được tín hiệu lỗi này; không sửa logic header trong lượt chỉnh màu nền.

Sắp xếp menu theo DOM section: Tính năng → Dành cho giáo viên → Cách hoạt động → Kho học liệu, áp dụng chung desktop/mobile. Cập nhật kỳ vọng phím mũi tên/End trong kiểm thử RubberSegment; ca đó và ESLint đạt. Probe browser xác nhận hai menu cùng thứ tự section và từng mục nhận `aria-current` khi chuyển section. Ca hồi quy căn anchor sâu `/?preview=1#hoc-lieu` còn sai khoảng cách header 67,6 px ngay lần tải đầu; ghi nhận riêng, chưa thay logic căn anchor trong lượt đổi thứ tự menu.
