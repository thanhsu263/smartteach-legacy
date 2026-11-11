---
title: Mở rộng SmartTeach từ bộ công cụ lớp học thành quy trình dạy và học hoàn chỉnh
date: 2026-11-09
status: decided
---

# Mở rộng SmartTeach từ bộ công cụ lớp học thành quy trình dạy và học hoàn chỉnh

## Intent / Problem

SmartTeach đã có nền tảng chạy thật cho lớp học, quiz, phiên chơi trực tiếp,
kết quả, game và tiện ích; Figma hiện bao phủ Foundation, Landing và phần lớn
màn hình giáo viên cốt lõi. Tuy nhiên, các route game, tiện ích chi tiết, luồng
host/player/results và một số màn hình hệ thống chưa có thiết kế hoàn chỉnh.

Landing cũng đang truyền đạt một hành trình rộng hơn khả năng hiện tại: giao
bài, theo dõi tiến độ, xem hoạt động lớp và sử dụng kho học liệu mở. Schema hiện
tại mới có lớp/học sinh, game yêu thích, quiz, phiên chơi, người tham gia, câu
trả lời và kết quả; chưa có assignment, attempt gắn với học sinh trong lớp hay
quiz công khai có metadata để tìm kiếm.

Mục tiêu là dùng hệ thống Figma hiện có làm nguồn thị giác, hoàn thiện toàn bộ
bề mặt đang chạy và mở rộng sản phẩm theo các lát cắt nghiệp vụ có thể kiểm thử,
không tạo dashboard giả hoặc control không có hành vi thật.

## Desired Outcome

SmartTeach trở thành một vòng công việc liền mạch cho giáo viên Việt Nam:

1. Chuẩn bị lớp, quiz, game và tiện ích.
2. Tổ chức hoạt động trực tiếp hoặc giao quiz tự làm.
3. Học sinh tham gia nhanh mà không cần tài khoản.
4. Giáo viên xem tiến độ, kết quả và câu hỏi cần ôn lại.
5. Giáo viên có thể tìm, xem trước, sao chép và xuất bản học liệu phù hợp.

Mọi route chính có screen và trạng thái responsive rõ ràng, dùng component và
token từ `figmaDesign/foundation.png`; các màn hình mới tiếp tục ngôn ngữ thị
giác của Landing và Teacher Screen nhưng không suy diễn dữ liệu giả từ mockup.

## Constraints

- Giữ Next.js 16 App Router, React 19, TypeScript, Supabase, CSS Modules và các
  quy ước Server/Client Component hiện tại.
- Trước mỗi thay đổi Next.js phải đọc tài liệu liên quan trong
  `node_modules/next/dist/docs/` theo `AGENTS.md`.
- Foundation, Landing và Teacher Screen trong `figmaDesign/` là nguồn quyết
  định thị giác; `PRODUCT.md` và `DESIGN.md` là nguồn quyết định sản phẩm và
  accessibility.
- Được phép mở rộng schema, RLS, RPC/API, routing và nghiệp vụ cho các module
  mới đã chốt trong brief này; phải giữ tương thích với chức năng hiện có.
- Học sinh không bắt buộc tài khoản, email hay mật khẩu. Giáo viên tiếp tục xác
  thực bằng Supabase Auth.
- Tên học sinh là dữ liệu nhạy cảm: chỉ giáo viên sở hữu lớp được đọc dữ liệu
  định danh và kết quả; anon không được truy vấn trực tiếp bảng dữ liệu.
- Mọi RPC dành cho học sinh phải có input bị giới hạn, lỗi công khai an toàn,
  token có thể thu hồi/đổi và kiểm tra quyền ở server/database.
- Quiz được giao phải dùng snapshot bất biến tại thời điểm phát hành để việc
  giáo viên sửa/xóa quiz gốc không làm thay đổi đề hoặc kết quả đã có.
- Giao diện phải đạt WCAG AA, dùng bàn phím được, không tràn ngang ở 375px,
  tôn trọng `prefers-reduced-motion` và vẫn rõ khi chiếu trong lớp sáng.
- Không ghi Supabase/Vercel/GitHub thật trong quá trình phát triển và kiểm thử;
  không commit hoặc push nếu người dùng chưa yêu cầu riêng.
- Bộ quality gate hiện có tiếp tục là điều kiện bắt buộc, kể cả hai lượt E2E
  liên tiếp trên production build và kiểm tra axe/overflow.

## Non-goals

- Không tạo tài khoản, hồ sơ xã hội, email, mật khẩu hoặc hộp thư cho học sinh.
- Không xây cổng quản trị trường học, quản lý nhiều trường, phân quyền tổ bộ môn
  hoặc đồng bộ SIS/LMS trong vòng mở rộng này.
- Không thêm thanh toán, gói Pro, hóa đơn hoặc subscription dù Landing có ngôn
  ngữ định hướng tăng trưởng.
- Không xây mạng xã hội học liệu: không bình luận, theo dõi tác giả, nhắn tin,
  xếp hạng giáo viên hoặc chỉnh sửa cộng tác.
- Không thêm AI tạo câu hỏi, chấm tự luận bằng AI hoặc thu thập dữ liệu vượt quá
  nhu cầu lớp học.
- Không thay thế luồng quiz trực tiếp bằng assignment; hai chế độ có mục tiêu và
  trạng thái riêng nhưng dùng chung quiz/snapshot/kết quả khi hợp lý.
- Không thiết kế lại các frame Figma đã được triển khai chỉ để đổi phong cách;
  chỉ sửa khi cần nối luồng, dùng dữ liệu thật hoặc giải quyết accessibility.

## Domain Context

### Bề mặt đã có thiết kế và code nền

- Foundation/component states, shell giáo viên, login.
- Danh sách và chi tiết lớp.
- Danh sách, trình soạn và nhập quiz.
- Kho tiện ích và đồng hồ đếm ngược.
- Landing marketing.

### Bề mặt có chức năng thật nhưng cần hoàn thiện thiết kế

- Kho game và chi tiết/game embed.
- Bốc thăm, chia nhóm và bảng trắng.
- Bắt đầu phiên, sảnh chờ, điều khiển câu hỏi, công bố đáp án, bảng xếp hạng và
  kết thúc phiên cho giáo viên.
- Nhập PIN, chờ, trả lời, phản hồi và kết quả cuối cho học sinh.
- Lịch sử/kết quả phiên, quiz chia sẻ, privacy, not-found và các trạng thái
  loading/empty/error/offline tương ứng.

### Bề mặt mới cần bổ sung

#### 1. Tổng quan giáo viên

- Một trang tổng quan dùng dữ liệu thật: lớp gần đây, quiz gần đây, assignment
  đang mở, phiên gần đây và các hành động nhanh.
- Không hiển thị metric trang trí; mỗi thông tin phải dẫn đến một hành động hoặc
  màn hình chi tiết.

#### 2. Giao bài và làm bài không cần tài khoản

- Giáo viên tạo assignment từ quiz, chọn lớp, hạn nộp, thời điểm mở, chính sách
  xem đáp án và phát hành/đóng bài.
- Phiên bản đầu mặc định một lượt nộp cho mỗi học sinh; giáo viên có thể reset
  lượt làm. Không thêm ma trận cấu hình số lần làm ở giai đoạn đầu.
- Học sinh vào bằng link/QR hoặc mã bài cùng mã truy cập cá nhân do giáo viên
  quản lý. Mã truy cập là bearer credential có thể xoay vòng; chỉ lưu dạng băm
  khi kiến trúc Supabase cho phép kiểm tra an toàn.
- Sau khi xác thực mã, client dùng session/token phạm vi hẹp để mở đúng bài,
  lưu tiến độ, tiếp tục khi gián đoạn và nộp bài; không cấp quyền đọc bảng.
- Chơi live tiếp tục hỗ trợ biệt danh khách. Chỉ gắn kết quả dài hạn với
  `students.id` khi người học dùng thông tin truy cập của danh sách lớp.
- Kết quả và đáp án đúng chỉ được trả theo chính sách phát hành của assignment,
  tránh lộ đáp án khi bài còn mở.

#### 3. Tiến độ và phân tích

- Giáo viên xem trạng thái chưa bắt đầu/đang làm/đã nộp theo lớp và assignment.
- Có bảng kết quả từng học sinh, thống kê từng câu, tỷ lệ đúng và danh sách câu
  cần ôn lại; trạng thái luôn có nhãn/chữ, không chỉ dựa vào màu.
- Tổng hợp được tính từ attempt/answer nguồn; chỉ lưu aggregate khi có bằng
  chứng hiệu năng cần thiết.
- Cho phép mở chi tiết một lượt làm, reset lượt và xuất dữ liệu ở định dạng an
  toàn nếu việc xuất được đưa vào phase sau; không tự thêm CSV vào MVP.

#### 4. Kho học liệu mở

- Quiz có metadata tối thiểu: môn, khối, mô tả ngắn, trạng thái private/unlisted/
  public và thông tin phiên bản cần thiết để sao chép ổn định.
- Người chưa đăng nhập được duyệt, tìm kiếm, lọc và xem trước nội dung public;
  chỉ giáo viên đăng nhập mới xuất bản hoặc sao chép về thư viện cá nhân.
- Sao chép tạo quiz độc lập thuộc người dùng, không tạo liên kết chỉnh sửa hai
  chiều với bản gốc.
- Phạm vi đầu không có tính năng xã hội. Giáo viên gửi yêu cầu xuất bản; nội
  dung chỉ công khai sau khi chủ hệ thống duyệt. Sau khi công khai vẫn có báo
  cáo và cơ chế gỡ/ẩn, nhưng không cần cổng quản trị trường học.

### Invariants backend

- Giáo viên chỉ quản lý lớp, học sinh, quiz, assignment, attempt và publication
  thuộc quyền sở hữu của mình; RLS/RPC phải kiểm tra quan hệ sở hữu tại mỗi
  trust boundary.
- Anon không có quyền bảng trực tiếp. Các đường học sinh dùng `security definer`
  theo pattern live hiện có: `search_path` rỗng, tên bảng đầy đủ, payload giới
  hạn, token không xuất hiện trong log hoặc lỗi.
- Phát hành assignment và tạo snapshot là một transaction; nộp attempt phải
  idempotent và không tạo hai lượt nộp khi người dùng bấm lại hoặc mạng retry.
- Mỗi token chỉ cấp quyền cho một học sinh/assignment hoặc một phiên chơi, có
  hạn dùng và có thể thu hồi; không dùng mã ngắn có thể dò làm secret duy nhất.
- Chính sách retention phải rõ cho tên học sinh, câu trả lời và token; xóa lớp,
  assignment hoặc tài khoản giáo viên phải có hành vi cascade/anonymize đã kiểm
  thử, không để dữ liệu mồ côi.
- Kết quả assignment được giữ tối đa 365 ngày sau khi bài đóng; giáo viên có
  thể xóa sớm hơn. Dữ liệu live quiz tiếp tục theo retention 90 ngày hiện có.

## Options Considered

| Option | Key assumption | Failure condition | Trade-offs |
|---|---|---|---|
| Chỉ hoàn thiện UI của chức năng hiện có | Landing không cần phản ánh khả năng chạy thật | Người dùng mong giao bài, tiến độ và kho học liệu hoạt động | Rủi ro thấp nhưng không giải quyết khoảng cách sản phẩm và yêu cầu mở rộng |
| Xây toàn bộ module mới song song | Có thể thay schema, UI và luồng học sinh cùng lúc mà vẫn giữ ổn định | Phạm vi quá rộng, regression khó khoanh vùng, UI đi trước contract dữ liệu | Nhanh về bề rộng nhưng rủi ro cao cho một chủ dự án và bộ E2E lớn |
| Các lát cắt dọc theo thứ tự lõi → assignment/progress → library | Mỗi lát cắt có thể hoàn thành end-to-end và giữ tương thích | Phase trước không khóa contract hoặc không có tiêu chí dừng rõ | Chậm hơn ở độ phủ ban đầu nhưng dễ kiểm chứng, rollback và giữ chất lượng; **được chọn** |
| Tài khoản học sinh đầy đủ | Học sinh có email/điện thoại và chấp nhận đăng ký | Tăng ma sát, dữ liệu nhạy cảm và vận hành auth trái với định vị sản phẩm | Định danh mạnh nhưng không phù hợp người dùng và mục tiêu tham gia nhanh |
| Không tài khoản, chỉ nhập biệt danh | Kết quả dài hạn không cần định danh ổn định | Trùng/đổi tên, giả mạo tên và không ghép được tiến độ qua nhiều bài | Ma sát thấp nhất nhưng không đáp ứng tiến độ lớp |
| Không tài khoản, danh sách lớp + mã/QR có thể xoay vòng | Giáo viên quản lý roster và mức đảm bảo định danh lớp học là đủ | Token bị chia sẻ hoặc quy trình phát mã quá phức tạp | Cân bằng tốc độ, riêng tư và tiến độ dài hạn; **được chọn** |

## Decision

Triển khai mở rộng theo ba chương trình nối tiếp:

1. **Hoàn thiện lõi đang chạy:** thiết kế/code các route chưa có frame, thêm
   tổng quan giáo viên bằng dữ liệu thật và chuẩn hóa toàn bộ trạng thái hệ thống.
2. **Giao bài và tiến độ:** thêm assignment, snapshot, attempt, answer, truy cập
   học sinh không tài khoản, dashboard tiến độ và phân tích câu hỏi theo lát cắt
   end-to-end.
3. **Kho học liệu mở:** thêm metadata/publication, browse/search/filter/preview,
   clone và quy trình gửi duyệt trước khi công khai, kèm báo cáo/gỡ nội dung.

Học sinh tiếp tục không bắt buộc tài khoản. Định danh dài hạn dùng học sinh đã
có trong roster và credential phạm vi hẹp có thể xoay vòng; live guest bằng
biệt danh vẫn tồn tại độc lập. Mọi screen mới dùng Foundation Figma và dữ liệu
thật, không dùng mockup làm hợp đồng nghiệp vụ.

## Reasoning

- Thứ tự này đóng khoảng trống trải nghiệm hiện tại trước khi thêm schema lớn,
  nên người dùng luôn có một sản phẩm nhất quán sau mỗi phase.
- Assignment/progress là phần nối trực tiếp lớp + quiz + kết quả hiện có, mang
  giá trị cao hơn việc mở kho nội dung trước khi giáo viên có vòng sử dụng đầy
  đủ.
- Mô hình roster + credential giữ cam kết tham gia không cần tài khoản nhưng
  vẫn cho phép ghép tiến độ; dùng nickname đơn thuần không đủ tin cậy.
- Snapshot tiếp nối pattern đã chứng minh trong live session và bảo vệ tính
  toàn vẹn của bài đã giao.
- Kho học liệu đặt sau giúp metadata và preview dựa trên editor/assignment đã
  ổn định, đồng thời có thời gian xử lý moderation trước khi mở nội dung rộng.
- Lát cắt dọc phù hợp dự án một người và cho phép mỗi phase có migration, API,
  UI, accessibility và E2E khép kín thay vì tích lũy phần dở dang.

## Acceptance Criteria

### Toàn sản phẩm

- Mọi route hiện có và route mới trong phạm vi đều có screen responsive ở
  375px, tablet và desktop, dùng token/component Foundation nhất quán.
- Không còn CTA hoặc thông tin chính trên Landing dẫn tới chức năng giả; nội
  dung chưa triển khai phải được ghi rõ hoặc chỉ xuất hiện sau phase tương ứng.
- Loading, empty, error, offline, disabled, success và destructive confirmation
  được thiết kế cho các luồng có liên quan.
- Tất cả luồng chính dùng được bằng bàn phím, focus rõ, đạt axe WCAG A/AA và
  không phụ thuộc hover/motion/màu sắc đơn lẻ.

### Lõi đang chạy

- Giáo viên hoàn thành được luồng chọn quiz → tạo phiên → chờ học sinh → chạy
  câu hỏi → xem kết quả; học sinh hoàn thành luồng PIN → chờ → trả lời → kết quả.
- Game và từng tiện ích có màn hình desktop/mobile hoàn chỉnh, hành động chính
  trong tối đa hai lần bấm từ bề mặt phù hợp.
- Dashboard giáo viên chỉ hiển thị dữ liệu thật và mỗi khối có hành động rõ.

### Giao bài và tiến độ

- Giáo viên tạo, phát hành, đóng và xem assignment của lớp từ một quiz hợp lệ.
- Học sinh không tài khoản vào đúng assignment bằng link/QR hoặc mã, tiếp tục
  được sau gián đoạn, nộp idempotent và không truy cập dữ liệu của học sinh khác.
- Giáo viên xem được trạng thái từng học sinh, kết quả từng lượt và thống kê
  từng câu; sửa quiz gốc không đổi assignment đã phát hành.
- Mã học sinh có thể xoay vòng/thu hồi; token và đáp án không bị lộ qua bảng,
  URL công khai ngoài thiết kế, log hoặc lỗi trả về.

### Kho học liệu

- Người dùng duyệt, tìm, lọc và xem trước quiz public theo môn/khối.
- Giáo viên xuất bản/ẩn quiz của mình và sao chép quiz public thành bản độc lập.
- Quiz private/unlisted không xuất hiện trong kết quả public; quyền sở hữu và
  negative paths có DB/E2E coverage.
- Có cách gỡ hoặc ẩn nội dung trước khi mở xuất bản cộng đồng rộng rãi.
- Quiz gửi xuất bản không xuất hiện công khai trước khi được chủ hệ thống duyệt.
- Attempt, đáp án và token phạm vi assignment bị xóa sau tối đa 365 ngày kể từ
  khi bài đóng; credential roster tồn tại tới khi rotate/revoke hoặc học sinh/
  lớp bị xóa. Live quiz vẫn giữ mốc 90 ngày.

### Verification

- Migrations có DB tests cho RLS, RPC, ownership, retry/idempotency, token sai/
  hết hạn/thu hồi, giới hạn tài nguyên và cascade/retention.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:db`,
  `npm run test:e2e` trên production build hai lần liên tiếp và
  `npm run scan:bundle` đều đạt.
- E2E giữ kiểm tra axe và tràn ngang ở 1280px/375px; motion không làm click
  chập chờn và reduced-motion vẫn giữ đủ chức năng.

## Open Questions / Risks

Không còn quyết định sản phẩm nào chặn `hs-plan`. Các rủi ro cần được biến thành
task và tiêu chí kiểm chứng trong plan:

- Credential không tài khoản là bearer token nên không chống chia sẻ tuyệt đối;
  giảm rủi ro bằng token đủ entropy, mã ngắn chỉ là lookup có rate limit, xoay
  vòng/thu hồi và cảnh báo giáo viên.
- Việc gắn tên trong roster với kết quả làm tăng dữ liệu nhạy cảm; cần retention,
  xóa dữ liệu và nội dung thông báo quyền riêng tư trước khi phát hành module.
- Assignment snapshot làm tăng dung lượng; cần giới hạn số câu, payload và chính
  sách giữ/xóa tương thích giới hạn hiện tại.
- Public library tạo nghĩa vụ kiểm duyệt; phase phải kiểm chứng hàng đợi duyệt,
  report/hide và quyền moderation trước khi bật public browse production.
- Teacher Screen chưa có frame cho phần lớn route mới; `hs-plan` phải tách bước
  thiết kế/duyệt frame khỏi implementation, không tự coi code là bản thiết kế.
