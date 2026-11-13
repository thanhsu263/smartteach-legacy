---
name: SmartTeach
description: Hub tiện ích giảng dạy cho giáo viên Việt Nam, sáng, xanh dương và vàng, gọn như công cụ.
colors:
  primary: "#2259ED"
  primary-hover: "#1948CA"
  primary-deep: "#153DAA"
  primary-tint: "#F0F5FF"
  brand: "#102B68"
  accent: "#FFD453"
  accent-deep: "#F2C23D"
  ink: "#142B50"
  ink-muted: "#52627A"
  bg: "#F0F5FF"
  surface: "#FFFFFF"
  border: "#D7E0ED"
  border-strong: "#687B96"
  success: "#17613E"
  warning: "#9A6700"
  danger: "#B42318"
  on-primary-muted: "#DCE7FF"
  tile-a: "#1D4FD7"
  tile-b: "#0A6C74"
  tile-c: "#2B7A2E"
  tile-d: "#6D3FA6"
  tile-e: "#B3265E"
  tile-f: "#A8480A"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-on-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: SmartTeach

## 1. Overview

**Creative North Star: "Bật hứng khởi · Mở tri thức"**

Landing bám frame Figma `SmartTeach — Landing page`: nền trắng và xanh rất nhạt, xanh cobalt cho hành động chính, navy cho vùng game/footer, vàng nắng cho điểm nhấn học tập. Nhịp trang xen kẽ phần giới thiệu, product preview và CTA; nội dung luôn ánh xạ vào route/chức năng thật của SmartTeach.

Hệ thống từ chối: phần mềm hành chính hay cổng thông tin nhà trường; trang đầy quảng cáo kiểu web game giải trí; mascot và hiệu ứng rối mắt làm cản việc dạy; sao chép nguyên ezthi.com (chỉ học bố cục và giọng điệu).

**Key Characteristics:**
- Nền sáng, tương phản cao, đọc được từ cuối lớp khi chiếu lên màn lớn.
- Một họ chữ (Be Vietnam Pro), thang cỡ chữ cố định theo rem, không co giãn theo viewport.
- Vùng làm việc dùng bề mặt gần đặc; vật liệu trong chỉ xuất hiện ở chrome nổi có nội dung thật sự đi bên dưới (header, menu, popover, sheet).
- Chuyển động giao diện 100–260 ms, tăng tốc và hãm tự nhiên để báo press, đổi trạng thái hoặc quan hệ không gian. Chữ và CTA hiện ngay khi trang tải. Hero landing dùng video nền cục bộ theo mục 7.

## 2. Colors

Xanh dương làm màu chủ đạo, vàng chỉ cho nút kêu gọi hành động, trung tính pha xanh rất nhẹ. Toàn bộ giá trị hex trong frontmatter là nguồn duy nhất.

### Primary
- **Xanh hành động (Action Blue)** (#2259ED): hành động chính, liên kết, trạng thái đang chọn và viền focus trên nền sáng. Chữ trắng trên nền này đạt tương phản 4.5:1.
- **Xanh hover (Action Hover)** (#1948CA): hover của hành động xanh; **Xanh pressed** (#153DAA) dùng cho trạng thái nhấn.
- **Xanh thương hiệu (Brand Navy)** (#102B68): mảng nhận diện cần độ sâu như hero hoặc footer; không thay thế action blue.
- **Xanh nhạt (Subtle Wash)** (#F0F5FF): nền phần phụ, hàng đang chọn.

### Secondary
- **Vàng điểm nhấn (Highlight Yellow)** (#FFD453): chỉ cho badge, nhấn mạnh thành tựu hoặc điểm nhận diện nhỏ; không dùng làm nút hành động mặc định của app.

### Neutral
- **Mực (Ink)** (#142B50): chữ chính và tiêu đề.
- **Mực nhạt (Muted Ink)** (#52627A): chữ phụ, mô tả; vẫn đạt 4.5:1 trên nền và bề mặt.
- **Nền lớp học (Subtle Wash)** (#F0F5FF): nền trang.
- **Bề mặt (Paper)** (#FFFFFF): thẻ, ô nhập, ngăn kéo.
- **Viền (Hairline)** (#D7E0ED): đường kẻ trang trí, viền thẻ.
- **Viền ô nhập (Control Edge)** (#687B96): viền của ô nhập và nút phụ, đạt 3:1 so với bề mặt.
- **Chữ phụ trên nền xanh (Chalk Dust)** (#DCE7FF): đoạn mô tả dưới tiêu đề hero, đạt 4.5:1 trên Xanh hành động.
- **Thành công** (#17613E), **Cảnh báo** (#9A6700) và **Lỗi** (#B42318): chỉ dùng kèm biểu tượng hoặc chữ, không chỉ bằng màu.

### Named Rules
**Quy tắc một vệt vàng.** Vàng chỉ xuất hiện như điểm nhấn có ý nghĩa, tối đa một điểm mạnh trên mỗi màn hình. Vàng không bao giờ làm nền chữ dài hay trang trí.
**Quy tắc xanh có việc.** Trong tiện ích và "Lớp của tôi", xanh dương chỉ cho hành động và lựa chọn đang chọn, không dùng làm nền mảng lớn.

## 3. Typography

**Display Font:** Be Vietnam Pro (kèm system-ui)
**Body Font:** Be Vietnam Pro (kèm system-ui)

**Character:** Một họ chữ sans hình học thân thiện, thiết kế cho tiếng Việt nên dấu không bị chen. Tất cả vai trò dùng cùng họ chữ, khác nhau ở cỡ và đậm.

### Hierarchy
- **Display** (800, 2.75rem trên màn rộng và 2.25rem trên điện thoại, 1.15): chỉ tiêu đề hero trang chủ.
- **Headline** (700, 1.875rem, 1.25): tiêu đề từng khu vực của trang.
- **Title** (600, 1.25rem, 1.35): tiêu đề thẻ, tên tiện ích.
- **Body** (400, 1rem, 1.6): đoạn mô tả; dòng dài tối đa 65-75ch.
- **Label** (600, 0.875rem, 1.4): nút, nhãn, mục menu.

### Named Rules
**Quy tắc dấu tiếng Việt.** Luôn nạp subset `vietnamese` của Be Vietnam Pro; line-height không dưới 1.15 để dấu không bị cắt.

## 4. Elevation

Chiều sâu đến từ phân cấp vật liệu, không phải trang trí. Card nội dung dùng Paper gần đặc và viền Hairline; chỉ lớp nổi có thể trong mờ để người dùng còn thấy ngữ cảnh phía sau.

### Shadow Vocabulary
- **Nâng nhẹ** (`box-shadow: 0 1px 2px rgba(23, 32, 51, 0.06)`): thẻ ở trạng thái nghỉ nếu cần tách khỏi nền.
- **Nâng lên** (`box-shadow: 0 6px 20px rgba(23, 32, 51, 0.1)`): thẻ khi hover hoặc lớp nổi chức năng.

### Named Rules
**Quy tắc vật liệu có việc.** Chỉ dùng translucency khi nó giải thích một lớp nổi và bảo toàn ngữ cảnh. Không chồng nhiều lớp kính sáng. Hover chỉ nâng tối đa 1px; press thu nhỏ tức thời rồi trở về trạng thái nghỉ.

## 5. Components

### Buttons
- **Shape:** bo góc 12px, chiều cao tối thiểu 44px cho vùng chạm.
- **Primary:** nền Xanh hành động, chữ trắng, đệm 12px 20px; một hành động ưu tiên trên mỗi màn hình.
- **Hover / Focus:** hover trên con trỏ fine chuyển sang xanh hover với `--motion-state` (180 ms). Focus-visible xuất hiện ngay với viền 2px và vòng ngoài nhạt cách nút 2px (Xanh hành động trên nền sáng, Vàng trên nền xanh). Press dùng `--motion-press` (100 ms), giữ vùng bấm ổn định.
- **Secondary:** nền Bề mặt, chữ Xanh bảng, viền Control Edge; hover đổi nền sang Xanh nhạt.
- **On primary:** trên nền hero xanh, nút phụ trong suốt với viền và chữ trắng.
- **Disabled:** nền Hairline, chữ Mực nhạt, con trỏ not-allowed, vẫn đạt đọc được.

### Answer tiles (quiz trực tiếp)
- **Shape:** ô lớn bo góc 16px, cao tối thiểu 72px, chữ trắng đậm; mỗi ô có **chữ cái (A-F), một hình riêng và một màu riêng**, nên không phân biệt chỉ bằng màu.
- **Bộ sáu cặp:** A lục giác Xanh bảng (#1D4FD7); B ngôi sao Xanh ngọc (#0A6C74); C dấu cộng Xanh lá (#2B7A2E); D ngũ giác Tím (#6D3FA6); E bán nguyệt Hồng đỏ (#B3265E); F giọt nước Cam nâu (#A8480A). Bộ hình và màu riêng của dự án, không sao chép bộ của nơi khác.
- **Tương phản:** chữ và hình trắng trên mỗi ô đạt tối thiểu 4.5:1; mỗi ô so với nền trang đạt tối thiểu 3:1 (kiểm tra trong `contrast.test.ts`).
- **Trạng thái:** đang chọn có vòng Mực 4px cách ô 3px (vòng nằm trên nền trang nên đạt 3:1) cộng dấu tích, không chỉ đổi màu; đã khoá thì giữ nguyên màu, chỉ giảm độ rõ và hiện "Đã gửi"; câu đã đóng đánh dấu đáp án đúng bằng dấu tích và chữ "Đáp án đúng".
- **Chuyển động:** 150-250ms, tắt khi `prefers-reduced-motion`.

### Cards / Containers
- **Corner Style:** bo góc lớn (16px).
- **Background:** Bề mặt (#FFFFFF) trên nền Daylight.
- **Shadow Strategy:** theo mục Elevation: phẳng khi nghỉ, nâng khi hover.
- **Border:** 1px Hairline.
- **Internal Padding:** 24px.

### Inputs / Fields
- **Style:** nền Bề mặt, viền 1px Control Edge, bo góc 8px, cao tối thiểu 44px.
- **Focus:** viền đổi sang Xanh bảng cộng vòng focus 3px.
- **Error / Disabled:** viền và chữ lỗi Đỏ (#B3261E) kèm biểu tượng và lời nhắn; disabled dùng nền Hairline.

### Navigation
- **Landing:** header sticky giữ chỗ trong bố cục. Trên desktop từ 1001 px có chuột và cho phép motion, header có thể ẩn khi cuộn xuống và hiện lại khi cuộn lên, đưa chuột tới mép trên hoặc khi nhận focus. Trên touch và reduced motion, header luôn hiện. Anchor chừa khoảng bằng chiều cao header cộng 12 px và dùng `aria-current="location"` cho mục đang đọc. Từ 1000 px trở xuống, Menu dùng disclosure native. Escape trả focus về Menu. Khi chọn một mục trong Menu hoặc dùng bàn phím kích hoạt anchor, focus tới tiêu đề đích.
- **Shell giáo viên:** từ 960 px, sidebar có trạng thái ghim mở, rail thu gọn và mở tạm qua hover chuột/focus bàn phím. Mở tạm không đổi bề rộng vùng làm việc. Từ 720 đến 959 px, sidebar hẹp luôn hiện nhãn. Dưới 720 px, Menu mở dialog có trap focus và Escape trả focus về nút mở. Mục hiện tại dùng `aria-current="page"` và dấu hình học ngoài màu. Danh sách cuộn độc lập khi viewport thấp.

## 6. Do's and Don'ts

### Do:
- **Do** dùng Vàng phấn (#FFC72C) cho tối đa một nút chính trên mỗi màn hình, chữ Mực (#172033).
- **Do** đưa giọng văn gọi "Thầy cô" vào tiêu đề và lời nhắn trạng thái.
- **Do** giữ vùng chạm tối thiểu 44px và focus-visible luôn thấy rõ.
- **Do** tôn trọng `prefers-reduced-motion`: thay hiệu ứng bằng chuyển mờ hoặc tức thì.
- **Do** tôn trọng `prefers-reduced-transparency` và `prefers-contrast`; vùng an toàn dùng `env(safe-area-inset-*)` khi cần.

### Don't:
- **Don't** để giao diện giống phần mềm hành chính hoặc cổng thông tin nhà trường.
- **Don't** làm trang đầy quảng cáo kiểu web game giải trí.
- **Don't** dùng mascot và hiệu ứng rối mắt cản việc dạy.
- **Don't** sao chép logo, hình ảnh hay câu chữ của ezthi.com.
- **Don't** dùng `border-left` hay `border-right` dày hơn 1px làm vạch màu trên thẻ.
- **Don't** dùng chữ gradient, kính mờ chỉ để trang trí, hay lưới thẻ giống hệt nhau lặp vô tận.
- **Don't** dùng nền chuyển động toàn màn hình, choreography trang trí theo scroll/route hoặc magnetic. Giới hạn video nền vào hero landing theo mục 7. Chuyển động header phục vụ điều hướng.
- **Don't** phủ kính, thêm nền động, parallax hoặc tilt vào màn hình chiếu của quiz trực tiếp, đồng hồ fullscreen, canvas bảng trắng, khung game hoặc vùng nhập liệu quan trọng.
- **Don't** dùng nhãn nhỏ viết hoa cách chữ (eyebrow) trên đầu mọi khu vực.
- **Don't** dùng màu làm tín hiệu duy nhất cho trạng thái lỗi hoặc thành công.

## 7. Functional materials & motion

Hệ vật liệu theo tinh thần Apple: phản hồi trực tiếp, chuyển động liên tục về không gian và dùng translucency có mục đích. Không mô phỏng giao diện hệ điều hành; vẫn giữ màu, chữ và mô hình thao tác riêng của SmartTeach.

**Tệp:** `src/styles/tokens.css` chứa vai trò màu, thời lượng, easing, bo góc và vật liệu. `src/styles/glass.css` chứa thành phần dùng chung và các trạng thái. `src/components/ambient-background.tsx` chỉ tạo nền tĩnh toàn app.

**Đổi tông:** `--accent` / `--accent-2` ánh xạ sang Xanh bảng và Xanh đậm; `--cta` / `--cta-2` dành riêng cho nút chính vàng. Mọi màu còn lại đi qua `--color-*` trong `globals.css`.

**Dùng trong markup:** `data-glass="btn|icon|chip|row|card|frame"` xác định vai trò tương tác; `data-variant="primary|secondary|on-primary"` xác định cấp hành động; `data-tone="ok|bad|warn|accent"` tạo tint trạng thái; `data-surface="float|sheet|panel"` phân biệt lớp nổi trong, sheet gần đặc và panel nội dung đặc. Trong CSS Modules dùng `--panel-bg`, `--panel-shadow`, `--item-shadow`, `--tint-bg`, `--tint-shadow` thay vì chép giá trị.

**Motion grammar:** press 100 ms, đổi trạng thái 180 ms, mở menu/sheet 260 ms. Exit tối đa 180 ms khi giữ được focus và ngữ nghĩa. Nếu browser thiếu hỗ trợ, dùng mở/đóng tức thì. Tooltip hiện khi hover ổn định hoặc focus, đóng bằng Escape hoặc khi rời. Loading phản ánh request thật. Skeleton trong vùng làm việc có thể shimmer tối đa 4,2 giây rồi giữ tĩnh. Feedback xuất hiện ở đúng tác vụ, có chữ và thông báo hỗ trợ trình đọc màn hình. Reduced motion dùng trạng thái tức thì, skeleton tĩnh và cuộn theo hành vi mặc định của trình duyệt.

**Ngoại lệ hero landing:** video lớp học 3D chạy lặp 8 giây, tắt tiếng, từ 1001 px với con trỏ fine có hover và cho phép chuyển động. Người dùng có thể tạm dừng hoặc phát lại bằng nút điều khiển. Video dừng khi hero khuất hoặc tab ẩn. Ảnh khung đầu dùng khi video đang tải, khi tắt JavaScript, trên touch, ở màn hẹp và khi bật giảm chuyển động. Chữ và CTA hiển thị phía trên video với lớp phủ sáng để giữ độ tương phản.

**Khả năng thích ứng:** `prefers-reduced-transparency` đổi lớp nổi sang nền đặc; `prefers-contrast` tăng viền; fallback không có `backdrop-filter` vẫn đọc và dùng được. Khung game, màn hình quiz và canvas bảng trắng luôn tránh blur.
