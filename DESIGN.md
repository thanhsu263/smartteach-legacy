---
name: SmartTeach
description: Hub tiện ích giảng dạy cho giáo viên Việt Nam, sáng, xanh dương và vàng, gọn như công cụ.
colors:
  primary: "#1D4FD7"
  primary-deep: "#153BA8"
  primary-tint: "#E9EFFD"
  accent: "#FFC72C"
  accent-deep: "#F2B300"
  ink: "#172033"
  ink-muted: "#4B5568"
  bg: "#F6F8FC"
  surface: "#FFFFFF"
  border: "#D5DDEB"
  border-strong: "#7C8AA5"
  success: "#14703F"
  danger: "#B3261E"
  on-primary-muted: "#DBE5FF"
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
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  xxl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
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

**Creative North Star: "Bảng đen sáng"**

Một công cụ đặt trên bàn giáo viên giữa ban ngày: nền sáng, một màu xanh dương làm điểm nhấn lớn, một vệt vàng duy nhất dành cho việc quan trọng nhất trên màn hình. Giao diện phục vụ công việc (register product), nên quen thuộc và nhất quán thắng sáng tạo. Trang chủ được phép đậm màu hơn (Committed: xanh dương phủ khu vực hero); bên trong tiện ích và "Lớp của tôi" quay về Restrained: nền trung tính, xanh dương chỉ cho hành động và lựa chọn đang chọn.

Hệ thống từ chối: phần mềm hành chính hay cổng thông tin nhà trường; trang đầy quảng cáo kiểu web game giải trí; mascot và hiệu ứng rối mắt làm cản việc dạy; sao chép nguyên ezthi.com (chỉ học bố cục và giọng điệu).

**Key Characteristics:**
- Nền sáng, tương phản cao, đọc được từ cuối lớp khi chiếu lên màn lớn.
- Một họ chữ (Be Vietnam Pro), thang cỡ chữ cố định theo rem, không co giãn theo viewport.
- Vùng làm việc dùng bề mặt gần đặc; vật liệu trong chỉ xuất hiện ở chrome nổi có nội dung thật sự đi bên dưới (header, menu, popover, sheet).
- Chuyển động 100-260ms, tăng tốc và hãm tự nhiên, chỉ báo press, đổi trạng thái hoặc quan hệ không gian; không overshoot nếu không có động lượng.

## 2. Colors

Xanh dương làm màu chủ đạo, vàng chỉ cho nút kêu gọi hành động, trung tính pha xanh rất nhẹ. Toàn bộ giá trị hex trong frontmatter là nguồn duy nhất.

### Primary
- **Xanh bảng (Blackboard Blue)** (#1D4FD7): nền hero trang chủ, liên kết, trạng thái đang chọn, viền focus trên nền sáng. Chữ trắng trên nền này đạt tương phản 4.5:1.
- **Xanh đậm (Deep Chalk Blue)** (#153BA8): hover của nút và liên kết xanh, vòng focus trên nền sáng.
- **Xanh nhạt (Tint Wash)** (#E9EFFD): nền phần phụ, hàng đang chọn.

### Secondary
- **Vàng phấn (Chalk Yellow)** (#FFC72C): chỉ cho nút kêu gọi hành động chính, chữ trên nút là Mực (#172033). Hover là #F2B300.

### Neutral
- **Mực (Ink)** (#172033): chữ chính và tiêu đề.
- **Mực nhạt (Muted Ink)** (#4B5568): chữ phụ, mô tả; vẫn đạt 4.5:1 trên nền và bề mặt.
- **Nền lớp học (Daylight)** (#F6F8FC): nền trang.
- **Bề mặt (Paper)** (#FFFFFF): thẻ, ô nhập, ngăn kéo.
- **Viền (Hairline)** (#D5DDEB): đường kẻ trang trí, viền thẻ.
- **Viền ô nhập (Control Edge)** (#7C8AA5): viền của ô nhập và nút phụ, đạt 3:1 so với bề mặt.
- **Chữ phụ trên nền xanh (Chalk Dust)** (#DBE5FF): đoạn mô tả dưới tiêu đề hero, đạt 4.5:1 trên Xanh bảng.
- **Thành công** (#14703F) và **Lỗi** (#B3261E): chỉ dùng kèm biểu tượng hoặc chữ, không chỉ bằng màu.

### Named Rules
**Quy tắc một vệt vàng.** Vàng chỉ xuất hiện ở nút kêu gọi hành động chính, tối đa một nút trên mỗi màn hình. Vàng không bao giờ làm nền chữ dài hay trang trí.
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
- **Shape:** bo góc vừa (10px), chiều cao tối thiểu 44px cho vùng chạm.
- **Primary:** nền Vàng phấn, chữ Mực, đệm 12px 20px; một nút mỗi màn hình.
- **Hover / Focus:** hover chuyển sang vàng đậm trong 150ms; focus-visible có viền 3px, cách nút 2px (Xanh đậm trên nền sáng, Vàng trên nền xanh).
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
- **Style:** nền Bề mặt, viền 1px Control Edge, bo góc 10px, cao tối thiểu 44px.
- **Focus:** viền đổi sang Xanh bảng cộng vòng focus 3px.
- **Error / Disabled:** viền và chữ lỗi Đỏ (#B3261E) kèm biểu tượng và lời nhắn; disabled dùng nền Hairline.

### Navigation
- **Style:** thanh trên cố định là một lớp nổi trong nhẹ vì nội dung cuộn bên dưới; logo bên trái, liên kết giữa, một nút Đăng nhập bên phải. Mép cuộn là hairline gradient rất nhẹ thay vì khung cứng.
- **States:** liên kết hiện tại có nền tint xanh và chỉ báo cạnh; hover đổi nền sang Xanh nhạt. Trạng thái hiện tại không chỉ dựa vào màu.
- **Mobile:** dưới 720px, các liên kết gộp vào nút Menu mở từ chính gốc nút, đóng về cùng vị trí khi chọn liên kết hoặc nhấn Esc, có `aria-expanded` và trả focus về nút.

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
- **Don't** dùng nền chuyển động toàn màn hình, animation khi vào trang/scroll chỉ để trình diễn, tilt hoặc magnetic làm lệch mục tiêu bấm.
- **Don't** phủ kính lên màn hình chiếu của quiz trực tiếp, canvas bảng trắng hoặc khung game.
- **Don't** dùng nhãn nhỏ viết hoa cách chữ (eyebrow) trên đầu mọi khu vực.
- **Don't** dùng màu làm tín hiệu duy nhất cho trạng thái lỗi hoặc thành công.

## 7. Functional materials & motion

Hệ vật liệu theo tinh thần Apple: phản hồi trực tiếp, chuyển động liên tục về không gian và dùng translucency có mục đích. Không mô phỏng giao diện hệ điều hành; vẫn giữ màu, chữ và mô hình thao tác riêng của SmartTeach.

**Tệp:** `src/styles/tokens.css` chứa vai trò màu, thời lượng, easing, bo góc và vật liệu; `src/styles/glass.css` chứa thành phần dùng chung và các trạng thái; `components/ambient-background.tsx` chỉ tạo wash màu tĩnh. Không có listener con trỏ toàn trang hoặc state React cập nhật theo frame.

**Đổi tông:** `--accent` / `--accent-2` ánh xạ sang Xanh bảng và Xanh đậm; `--cta` / `--cta-2` dành riêng cho nút chính vàng. Mọi màu còn lại đi qua `--color-*` trong `globals.css`.

**Dùng trong markup:** `data-glass="btn|icon|chip|row|card|frame"` xác định vai trò tương tác; `data-variant="primary|secondary|on-primary"` xác định cấp hành động; `data-tone="ok|bad|warn|accent"` tạo tint trạng thái; `data-surface="float|sheet|panel"` phân biệt lớp nổi trong, sheet gần đặc và panel nội dung đặc. Trong CSS Modules dùng `--panel-bg`, `--panel-shadow`, `--item-shadow`, `--tint-bg`, `--tint-shadow` thay vì chép giá trị.

**Motion grammar:** press 100ms, đổi trạng thái 180ms, menu/sheet 260ms. Menu và sheet xuất hiện từ gốc kích hoạt và đóng về cùng gốc. Loading có thể lặp; nội dung trang không tự choreography theo scroll hoặc route. `prefers-reduced-motion` rút mọi chuyển động về gần như tức thời.

**Khả năng thích ứng:** `prefers-reduced-transparency` đổi lớp nổi sang nền đặc; `prefers-contrast` tăng viền; fallback không có `backdrop-filter` vẫn đọc và dùng được. Khung game, màn hình quiz và canvas bảng trắng luôn tránh blur.
