Mode: local
Status: active

# Kế hoạch mở rộng SmartTeach thành quy trình dạy và học hoàn chỉnh

## Nguồn quyết định

- Decision Brief: [Mở rộng SmartTeach](../reports/brainstorm-2026-11-09-smartteach-product-expansion.md).
- Hành vi thật, schema và bộ kiểm thử tại commit baseline `1eab7e0` là nguồn
  đúng cho phần đã tồn tại.
- `figmaDesign/foundation.png`, `landingPage.png`, `teacherScreen.png`,
  `PRODUCT.md` và `DESIGN.md` là nguồn đúng cho UI/UX.
- Kế hoạch Figma cũ `plans/archive/20261106-figma-teacher-ui-reimplementation/` đã hoàn
  thành 6 phase và 219/219 E2E hai lượt; plan này kế tiếp, không làm lại phạm vi
  đã đạt trừ khi cần nối luồng hoặc sửa sai khác dữ liệu thật.

## Outcome

Hoàn thiện các route đang chạy nhưng chưa có frame, sau đó bổ sung dashboard,
giao bài không cần tài khoản học sinh, tiến độ/phân tích và kho học liệu được
kiểm duyệt. Mỗi lát cắt phải chạy end-to-end, giữ WCAG AA, mobile 375px và các
quality gate hiện có.

## Scope

### Trong phạm vi

- Thiết kế và duyệt screen flow còn thiếu trước khi code UI mới.
- Hoàn thiện `/games`, `/games/[id]`, ba tiện ích chưa có frame sâu,
  `/shared/quiz/[token]`, `/privacy`, 404 và toàn bộ host/player/results live.
- Thêm `/dashboard` dùng dữ liệu thật và làm trang mặc định sau đăng nhập.
- Thêm assignment, snapshot bất biến, credential học sinh theo roster,
  attempt/answer, submit idempotent, kết quả và analytics.
- Thêm `/assignments`, `/learn`, kho học liệu public được duyệt, preview/clone,
  report/hide và trạng thái moderation.
- Assignment retention 365 ngày sau khi đóng; live retention giữ 90 ngày.
- Cập nhật Landing/privacy/navigation chỉ khi chức năng tương ứng đã chạy thật.

### Ngoài phạm vi

- Tài khoản/email/mật khẩu hoặc hồ sơ xã hội cho học sinh.
- Cổng quản trị trường, nhiều trường, SIS/LMS, thanh toán/Pro/subscription.
- AI tạo/chấm câu hỏi, cộng tác chỉnh sửa, bình luận/theo dõi/xếp hạng tác giả.
- Chấm tự luận mở; vẫn dùng bốn loại câu hỏi và quy tắc chấm hiện có.
- Ghi Supabase/Vercel/GitHub thật, deploy, commit hoặc push nếu chưa có yêu cầu
  riêng ở workflow thực thi/phát hành.

## Baseline đã kiểm chứng

- Stack: Next.js 16.4.2 App Router, React 19.3, TypeScript, Supabase SSR/JS,
  CSS Modules; không Tailwind.
- Auth giáo viên đi qua Supabase Auth, `src/proxy.ts` và RLS. Anon live không
  có quyền bảng; dùng `security definer` RPC và token riêng.
- Quiz có bốn loại câu, import, share/clone và snapshot live; live có realtime
  + polling, auto-advance, treasure, kết quả và retention 90 ngày.
- Test entry points: Vitest unit, Vitest DB trên Supabase local, Playwright trên
  production build, load test và bundle scan trong `package.json`.
- Workspace có các thư mục/tệp untracked của người dùng; không reset/xóa và
  không chạm `tests/fixtures/quiz-thu-nghiem.csv/.xlsx`.

## Contract full-stack đã khóa

### Routes

- Giáo viên: `/dashboard`, `/assignments`, `/assignments/new`,
  `/assignments/[id]`, các route hiện có của lớp/quiz/game/tool/live.
- Học sinh assignment: `/learn` để nhập mã và `/learn/[code]` để vào bài.
- Kho học liệu: `/library`, `/library/[id]`; chỉ publication đã duyệt xuất hiện.
- `/play` tiếp tục dành riêng cho live quiz bằng PIN.

### Assignment domain

- Bảng dự kiến: `assignments`, `student_access_credentials`,
  `assignment_attempts`, `assignment_answers`; tên cuối phải giữ ý nghĩa này.
- Assignment có owner/class/quiz, snapshot, public code, lịch mở/hạn, trạng thái
  draft/published/closed và chính sách trả kết quả.
- Một attempt active cho mỗi học sinh/assignment; reset làm attempt cũ invalid
  nhưng giữ audit cho tới retention. Submit lặp lại trả cùng kết quả.
- QR là đường chính. Secret không đi trong query/referrer; nếu dùng URL thì đặt
  trong fragment, đổi lấy token phạm vi hẹp rồi xóa fragment. Manual fallback
  dùng credential đủ entropy, không dùng PIN 6 số làm secret duy nhất.
- Anon không có quyền bảng. Mọi state/answer/submit qua RPC trả payload tối thiểu
  và không lộ key trước chính sách release.

### Library domain

- Publication là snapshot độc lập với quiz gốc để preview/clone ổn định.
- Trạng thái moderation tối thiểu: draft/pending/approved/rejected/hidden hoặc
  tập tương đương; chỉ approved mới public.
- Giáo viên gửi/thu hồi publication của mình; quyền duyệt/ẩn là service-role
  hoặc moderator boundary không xuất hiện trong client bundle.
- Browse/search/filter có pagination và giới hạn; preview không trả answer key;
  clone chạy server-side/RPC và tạo quiz thuộc người gọi.

## Phases

| Phase | Tên | Trạng thái |
| --- | --- | --- |
| 01 | [Khoá screen flow và baseline](./phase-01-screen-flow-and-baseline.md) | Done — contract local được duyệt |
| 02 | [Hoàn thiện game, tiện ích và màn hình hệ thống](./phase-02-core-surfaces.md) | Done — kiểm chứng local đạt |
| 03 | [Hoàn thiện trải nghiệm quiz trực tiếp](./phase-03-live-quiz-surfaces.md) | Done — kiểm chứng local đạt |
| 04 | [Dashboard giáo viên và điều hướng](./phase-04-teacher-dashboard.md) | Done — kiểm chứng local đạt |
| 05 | [Assignment core và API giáo viên](./phase-05-assignment-core.md) | Done — kiểm chứng local đạt |
| 06 | [Truy cập không tài khoản và attempt engine](./phase-06-student-access-and-attempts.md) | Done — kiểm chứng local đạt |
| 07 | [UI giao bài, làm bài và phân tích](./phase-07-assignment-experience.md) | Done — kiểm chứng local đạt |
| 08 | [Kho học liệu và kiểm duyệt ở backend](./phase-08-library-domain.md) | Done — kiểm chứng local đạt |
| 09 | [UI kho học liệu và tích hợp sản phẩm](./phase-09-library-experience.md) | Done — kiểm chứng local đạt |
| 10 | [Privacy, retention và kiểm chứng toàn hệ thống](./phase-10-final-verification.md) | Done — quality matrix local đạt |

## Thứ tự và dependency

- Phase 01 là gate thiết kế cho mọi UI mới; chỉnh Figma là external write và
  cần xác nhận riêng ở lúc thực thi. Không code screen chưa được duyệt.
- Phase 02–04 độc lập về nghiệp vụ sau Phase 01 nhưng thực hiện tuần tự để tránh
  xung đột ở shell/navigation/tokens.
- Phase 05 → 06 → 07 là một chuỗi: teacher assignment contract, student trust
  boundary, rồi UI end-to-end.
- Phase 08 phải xong trước Phase 09. Có thể bắt đầu sau Phase 01 nhưng mặc định
  chạy sau assignment để giữ một dòng triển khai dễ kiểm chứng cho dự án một người.
- Phase 10 chỉ bắt đầu khi các phase chức năng có targeted evidence xanh.

## Acceptance map

| Decision Brief criterion | Phase | Evidence |
| --- | --- | --- |
| Mọi route có screen responsive và state đầy đủ | 01–04, 07, 09 | Frame duyệt + screenshot 375/768/1280 + targeted E2E |
| Landing không hứa chức năng giả | 04, 07, 09, 10 | Link/copy audit + E2E điều hướng |
| Live teacher/student hoàn chỉnh | 03 | Existing live/host/play/results E2E + axe |
| Game/tool trong tối đa hai lần bấm | 02 | Home/game/tool E2E |
| Dashboard chỉ dùng dữ liệu thật | 04, 07 | Unit/API + authenticated E2E |
| Assignment publish/close/snapshot | 05 | DB success/error/ownership/snapshot tests |
| Học sinh không tài khoản, resume và submit idempotent | 06–07 | DB race/retry tests + E2E refresh/rejoin |
| Tiến độ và thống kê từng câu | 06–07 | Result contract tests + table/detail E2E |
| Credential rotate/revoke, không rò token/key | 06 | RLS/RPC negative tests + bundle/security E2E |
| Browse/filter/preview/clone publication approved | 08–09 | DB pagination/moderation tests + public/auth E2E |
| Pending/private/hidden không public | 08–09 | RLS/RPC negative tests |
| Attempt/answer 365 ngày, credential theo roster, live 90 ngày | 05–06, 10 | Retention boundary DB tests + privacy copy |
| WCAG AA, keyboard, reduced motion, no overflow | 02–04, 07, 09–10 | Axe + keyboard + 375/1280 overflow checks |
| Full quality gate xanh | 10 | Typecheck/lint/unit/DB/E2E x2/load/scan/diff-check |

## Safety và execution gates

- Migration chỉ chạy trên Supabase local trong `hs-build`. `db push`, production
  migration, deploy, commit và push cần yêu cầu/confirmation riêng.
- Service role chỉ dùng trong DB test hoặc thao tác moderation được kiểm soát;
  không đặt secret trong chat, repo, log, URL hay client bundle.
- Phase 01 Figma write cần xác nhận external write; nếu không được duyệt, chỉ
  tạo local review artifact và dừng trước implementation.
- Mỗi phase ghi files, sai khác và evidence vào `implementation-notes.md`.
- Trước sửa Next.js, đọc guide liên quan trong `node_modules/next/dist/docs/`.

## Rủi ro và kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| Credential bị chia sẻ | Token đủ entropy, QR/fragment exchange, rotate/revoke, generic error, audit negative path |
| Retry tạo submit/attempt trùng | Row/advisory lock, unique partial constraint, idempotent RPC, concurrent DB test |
| Sửa quiz làm đổi bài đã giao/publication | Snapshot transaction và regression test sau sửa/xóa quiz gốc |
| Lộ answer key qua anon/public | Không grant bảng, payload public riêng, security-definer audit và scan |
| Dữ liệu học sinh giữ quá lâu | Purge 365 ngày sau close, opportunistic + scheduled path, boundary tests |
| Moderation bị bypass | Pending mặc định, approved-only browse, service-role boundary, negative tests |
| Search/library tăng tải | Pagination/bounds/index hợp lý, EXPLAIN hoặc load probe trước tối ưu thêm |
| Motion làm E2E flaky | Motion chỉ truyền state, reduced-motion mặc định, không di chuyển hit target khi click |
| Nhiều phase sửa shell/nav | Tuần tự; mỗi phase cập nhật targeted shell regression trước khi giao phase sau |

## Handoff

`hs-build` bắt đầu Phase 01 và dừng ở gate duyệt screen flow. Không bỏ qua gate
để code trực tiếp các màn hình chưa có frame. Khi một phase hoàn tất, cập nhật
trạng thái và evidence trước khi sang phase kế tiếp.
