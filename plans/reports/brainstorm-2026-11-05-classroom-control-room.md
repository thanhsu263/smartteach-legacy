# Decision Brief — Classroom Control Room

## Outcome

Tái thiết kế toàn bộ SmartTeach thành một hub điều phối tiết học có bản sắc
riêng: giáo viên nhận ra ngay việc cần làm, mở hoạt động trong tối đa hai lần
bấm và có thể dùng sản phẩm trên laptop, máy chiếu hoặc điện thoại. Tham chiếu
`cloneTemplate/` chỉ ở chất lượng bố cục, nhịp thị giác, tổ chức component và
motion cục bộ—không sao chép Orbit, CRM, dữ liệu, biểu tượng, palette hoặc
bố cục section.

## Product context

| Trường | Quyết định |
| --- | --- |
| Sản phẩm | SmartTeach — hub trò chơi, tiện ích lớp học và quiz trực tiếp |
| Người dùng chính | Giáo viên phổ thông Việt Nam, thường gấp rút chuẩn bị hoặc đang đứng lớp |
| Vấn đề | Công cụ phân tán, khó mở nhanh, và UI không đủ rõ khi chiếu |
| CTA chính | Tạo/mở quiz hoặc bắt đầu một hoạt động lớp học |
| Chức năng thật | Kho game, tools, lớp học, tạo/import/chia sẻ quiz, host, player, kết quả |
| Data cần trực quan | Tiến trình chuẩn bị quiz, trạng thái phòng PIN, phản hồi đáp án, danh sách lớp/hoạt động |
| Accessibility | WCAG AA, keyboard/focus, không chỉ báo trạng thái bằng màu, responsive, reduced motion |

## Chosen direction

**Classroom Control Room.** Bề mặt thương hiệu là một không gian indigo/cobalt
tập trung, có vàng phấn cho đúng một hành động chính. Hero dùng **Lesson
Launch Board** thay vì dashboard giả: ba trạng thái nghiệp vụ thật (soạn quiz,
mở phòng PIN, xem tín hiệu kết quả) xếp thành một cụm app-window có chiều sâu.
Nó dùng pointer inertia nhẹ, local spotlight và chuyển layer qua tab; không có
CRM, biểu đồ doanh thu, company/contact/deal hoặc heat icon của template.

Product surface là các workspace yên tĩnh, sáng, tập trung vào hiệu quả:
navigator và detail panel cho quiz/lớp học; catalogue theo mục tiêu dạy học cho
game/tools; host/player/whiteboard ưu tiên chữ lớn, contrast, trạng thái rõ và
không có hiệu ứng không gian gây nhiễu.

## Visual system

- Palette mới: indigo/cobalt là primary, yellow-chalk là CTA duy nhất, nền
  lạnh xanh-xám; semantic success/warning/error/info và dải dữ liệu chỉ dùng
  khi có ý nghĩa trạng thái. Mọi giá trị qua token; kiểm tra contrast AA.
- Typography: Be Vietnam Pro tiếp tục là UI font vì hỗ trợ tiếng Việt tốt;
  hierarchy giàu nhịp hơn bằng scale/spacing, không dùng gradient text hay
  eyebrow viết hoa hàng loạt.
- Bề mặt: nội dung công việc gần đặc, elevation tinh tế; translucency/blur chỉ
  trên lớp nổi giải thích được ngữ cảnh. Không biến toàn app thành glassmorphism.
- Layout: brand landing có chapter/story với demo sản phẩm thật; app shell có
  navigation theo tác vụ, danh sách, filter/search khi chức năng hiện hữu cần,
  detail panel và đầy đủ empty/loading/error/success.

## Interaction and motion

- Hai signature zone tối đa: Lesson Launch Board ở hero và một workflow lớp
  học/quiz. Pointer chỉ xử lý trong component, rAF + nội suy 0.08–0.14, giới
  hạn tilt ±3–5° và translate 4–10px, dừng sạch khi leave/unmount/tab hidden.
- Wrapper transform tách pointer, entrance/scroll và chuyển tab/layer để không
  ghi đè animation. Không `setState` theo pointer frame hay listener toàn trang.
- Story scroll dùng IntersectionObserver: nội dung luôn visible nếu JS tắt,
  section ngoài viewport không chạy, không fade-up đồng loạt.
- Micro-interaction: press 80–150ms, hover/focus/tab 150–250ms, panel 350–550ms,
  visualization 500–900ms; easing ease-out quart/quint/expo, không bounce.
- Touch tắt tilt/hover giả; mobile ưu tiên một layer chính. Reduced motion tắt
  parallax/scroll scrub/typewriter và dùng crossfade ngắn hoặc tức thì.

## Scope

Bao gồm toàn bộ route/surface hiện hữu: trang chủ, nav/footer/auth/privacy/404,
kho game và game wrapper, toàn bộ tools, lớp học, quiz list/import/editor/shared,
host/player/results. Đồng thời cập nhật token, primitive, component/motion
utility, CSS Modules và tests cần thiết.

## Constraints and non-goals

- Giữ Next.js App Router, React, TypeScript, CSS Modules; không thêm Tailwind,
  Shadcn, GSAP hay dependency của `cloneTemplate`.
- Không thay business logic, API, routing, Supabase schema/RLS/RPC, scoring,
  import format hoặc public prop names.
- Không import mã/asset của `cloneTemplate` vào production. Không chạm fixture
  người dùng `tests/fixtures/quiz-thu-nghiem.*`.
- Không tilt/parallax/blur nặng cho host, player, game stage hoặc whiteboard.
- Không deploy, commit hoặc push nếu không có lệnh riêng.

## Acceptance criteria

1. SmartTeach có brand/product language riêng; rà text/DOM không còn Orbit/CRM
   hoặc dữ liệu template, và composition không trùng 1:1.
2. Landing truyền đạt rõ đối tượng, vấn đề, CTA và product demo dùng trạng thái
   SmartTeach thật; thao tác chuột, keyboard/touch đều được.
3. Mọi surface hiện hữu dùng hierarchy/workflow mới nhưng các contract nghiệp
   vụ hiện có vẫn hoạt động nguyên vẹn.
4. Signature motion chỉ ở zone được duyệt, có rAF cleanup, pointer/touch/reduced
   motion fallback; content không bị phụ thuộc animation để xuất hiện.
5. Desktop/tablet/mobile không overflow; full tests gồm typecheck, lint, unit,
   DB, Playwright axe/overflow và bundle scan vẫn đạt hai lần liên tiếp.

## Risks and controls

| Rủi ro | Control |
| --- | --- |
| Sao chép template quá gần | Mapping mọi demo sang use case giáo viên trước khi code; review text, data, token và DOM |
| Motion làm hỏng thao tác lớp học | Motion scope nhỏ, test fast pointer/click/keyboard/reduced motion |
| Redesign toàn bộ gây CSS drift | Xây token + shell + mẫu landing/workspace trước, rồi rollout theo route family |
| Làm mất contract cũ | Không đổi API/state; giữ/điều chỉnh test observable theo intent |

## Handoff

`hs-plan` lập kế hoạch mới theo các route family, bắt đầu bằng system token và
app shell, rồi brand landing, quiz/class workspaces, catalogue/tools và live
surfaces; cuối cùng verification đầy đủ. Kế hoạch Quiz Sheets trước đây đã bị
superseded/cancelled.
