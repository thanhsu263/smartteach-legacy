# Implementation notes — SmartTeach product expansion

## Phase 01 — Screen flow và baseline

- Baseline: `main@1eab7e0`.
- Workspace có thay đổi/untracked của người dùng; giữ nguyên, đặc biệt
  `tests/fixtures/quiz-thu-nghiem.csv`, `tests/fixtures/quiz-thu-nghiem.xlsx`,
  `cloneTemplate/`, `figmaDesign/`, `.agents/` và `.codex/`.
- Review artifact local: [`screen-flow-contract.md`](./screen-flow-contract.md).
- Chưa ghi vào Figma vì external write cần người dùng cho phép riêng.
- Chưa sửa source production, schema, test, dependency hoặc cấu hình.
- Screen contract local đã được người dùng duyệt; Phase 02 có thể dùng contract
  này làm nguồn thiết kế mà không ghi vào Figma.

### Verification

- Contract probe: 20 route hiện tại + 8 route dự kiến — **VERIFIED**.
- Content bounds đã đối chiếu với code: 20 lớp, 100 học sinh/lớp, 50 quiz,
  50 câu/quiz, 2–6 đáp án/câu và 50 live players.
- Runtime reference audit: không có production/test reference tới
  `cloneTemplate`, Stitch hoặc Figma.
- `git diff --check`: đạt.
- `git diff --name-only -- src`: rỗng.

### Approval outcome

- Người dùng đã duyệt contract local; không có quyền ghi Figma trong phase này.

## Phase 02 — Game, tiện ích và màn hình hệ thống

- Dùng contract local đã duyệt, không ghi vào Figma và không thay auth/RPC/state
  nghiệp vụ.
- Game embed dùng khung 16:9 và status tải có `aria-busy`; iframe slow vẫn giữ
  action mở tab mới. Bộ lọc, favorite, fullscreen và credit không đổi.
- Catalogue tool/game dùng panel/empty state token chung; tool stage chuyển sang
  bề mặt đặc để tránh blur chồng canvas. Tất cả flow tool và toạ độ pointer giữ
  nguyên.
- Privacy thêm mục lục 9 phần; 404 dùng compact centered state; shared quiz chỉ
  cải thiện loading/clone feedback vì route vẫn bảo vệ ở proxy.
- Có thêm regression test cho game stage/loading, privacy TOC và overflow ở
  320/375/768/1280/1440.

### Verification

- `npm run typecheck`: đạt.
- `npm run lint`: đạt.
- `npm test -- src/lib/catalog.test.ts src/lib/utilities/utilities.test.ts`:
  2 files, 40 tests đạt.
- Playwright game/tool/privacy/a11y/headings/security/shared quiz: **129/129 đạt**
  trên production build với Supabase local.
- Playwright visual smoke 375/768/1280: **1/1 đạt**, không lỗi console; đã rà
  soát các ảnh game mobile, whiteboard tablet và privacy desktop.
- `git diff --check`: đạt.

### Kết luận

- Phase 02 hoàn thành. Shared quiz vẫn giữ boundary đăng nhập hiện có; signed-out
  redirect sang login đã được regression test. Không thay đổi API, RLS hay state
  nghiệp vụ, và chưa bắt đầu Phase 03.

## Phase 03 — Quiz trực tiếp

- `/host` có thêm điểm vào chọn quiz, trạng thái loading/error/empty và panel
  thiết lập phiên. Component này gọi `listQuizzes` hiện có rồi tái sử dụng
  `StartSession`, nên không tạo RPC hay luồng state mới.
- Host và học sinh dùng chung nhãn kết nối có chữ cho cập nhật trực tiếp, polling
  và offline. Khi `live.error` xuất hiện, nhãn chuyển sang offline; các alert lỗi
  action hiện có vẫn giữ nguyên.
- Bảng kết quả bỏ backdrop blur để canvas/projector dùng bề mặt đặc, dễ đọc.
- Không thay polling cadence, realtime payload, scoring, treasure hay RLS.

### Verification

- `npm run lint`, `npm run typecheck`: đạt.
- `npm test -- src/lib/live/announce.test.ts src/lib/live/live.test.ts src/lib/live/results.test.ts src/lib/live/sync.test.ts src/lib/live/treasure.test.ts src/components/live/player/answer-styles.test.ts`:
  6 files, **78 tests đạt**.
- Playwright host/play/live/results/auto/treasure/a11y + visual: **63/63 đạt**.
- DB targeted live/auto/realtime/retention/treasure: đã chạy trên Supabase local;
  duplicate-key của test unique chest là assertion mong đợi, được kiểm riêng với
  **1 test đạt, exit 0**.
- Visual smoke rà ảnh host picker/lobby 1280px và player join 375px: **1/1 đạt**,
  không lỗi console.
- `git diff --check`: đạt.

### Kết luận

- Phase 03 hoàn thành. Phase 04 chưa bắt đầu.

## Phase 04 — Dashboard giáo viên và điều hướng

- `/dashboard` là điểm vào mặc định sau đăng nhập, được bảo vệ đồng nhất ở
  proxy, server layout và danh sách protected paths. `next` hợp lệ vẫn được giữ
  nguyên để các deep link cũ quay về đúng route.
- Dashboard chỉ ghép ba API bounded có sẵn: lớp, quiz và lịch sử phiên (mỗi
  danh sách tối đa năm mục). Không thêm RPC tổng hợp, metric trang trí hoặc đọc
  dữ liệu câu trả lời/người chơi.
- Account mới nhận hướng dẫn tạo lớp/quiz; từng nguồn dữ liệu có loading, empty
  và error/retry độc lập để lỗi một nguồn không che phần còn lại.
- TeacherShell, app chrome và account navigation có mục Tổng quan; desktop giữ
  tối đa hai cột, mobile xếp một cột với CTA đủ lớn. Không đưa assignment lên
  dashboard trước Phase 07.

### Verification

- `npm run typecheck`, `npm run lint`: đạt.
- Unit auth/callback + protected paths: **8/8 đạt**.
- Playwright auth/dashboard: **21/21 đạt** trên production build với Supabase
  local; axe/overflow đạt 375px, 768px, 1280px và Escape của drawer trả focus
  về nút mở menu.
- Visual smoke: **1/1 đạt**, không lỗi console; đã kiểm ảnh dashboard desktop,
  tablet và mobile.
- `git diff --check`: đạt.

### Kết luận

- Phase 04 hoàn thành. Phase 05 vẫn Pending.

## Phase 05 — Assignment core và API giáo viên

- Migration `20261111090000_assignments.sql` thêm bảng assignment additive,
  snapshot quiz bất biến, mã public 10 ký tự (lookup, không phải secret học
  sinh), schedule/reveal policy và lifecycle `draft → published → closed`.
- Assignment chỉ đi qua teacher RPC `security definer`: bảng RLS deny-default,
  owner/class/quiz/snapshot/code immutable, còn source quiz dùng `on delete set
  null` để snapshot tiếp tục tồn tại sau khi quiz gốc bị xoá.
- Adapter `src/lib/assignments/` trả discriminated result và lời nhắn Việt an
  toàn; client validation chỉ phản hồi sớm, migration vẫn ép constraints.
- Giới hạn đã chốt là 100 assignment/giáo viên. Tạo đồng thời dùng advisory lock;
  retention opportunity xoá tối đa các bài `closed` quá 365 ngày và Phase 10 sẽ
  thêm scheduled path.

### Verification

- Supabase local reset áp migration thành công.
- Unit assignment: **3/3 đạt**; DB assignment: **7/7 đạt**, bao phủ RLS/RPC,
  ownership, atomic failure, snapshot, lifecycle, list, concurrent limit và
  purge retention.
- `npm run typecheck`, `npm run lint`, `git diff --check`: đạt.
- `supabase db lint --local` không có finding mới từ assignment; còn một error
  static-analysis `private.copy_quiz` và ba warning live từ baseline cũ, nằm
  ngoài diff Phase 05.

### Kết luận

- Phase 05 hoàn thành. Phase 06 vẫn Pending; chưa tạo credential, attempt,
  answer hoặc bề mặt học sinh.

## Phase 07 — UI giao bài, làm bài và phân tích

- Thêm bề mặt giáo viên `/assignments`, `/assignments/new`,
  `/assignments/[id]` và bề mặt học sinh công khai `/learn`, `/learn/[code]`.
  Token attempt chỉ nằm trong `sessionStorage`; credential QR đặt sau fragment
  và bị xoá bằng `history.replaceState` ngay sau exchange, không đưa vào query
  hay referrer.
- Bổ sung migration `20261112090000_assignment_analytics.sql`: hai RPC
  teacher-only cho correct/unanswered theo câu và detail lượt làm. Đây là phần
  dữ liệu tối thiểu cần có để UI analytics trong contract không dựng số liệu
  giả; anon và giáo viên không sở hữu assignment bị từ chối.
- Dùng bề mặt panel đặc, native dialog cho close/delete/reset/revoke, và layout
  roster/analytics co về một cột trên mobile. Teacher shell, proxy và protected
  paths đã nhận `/assignments`; `/learn` tiếp tục public cho học sinh.
- Migration analytics đã chạy qua `npx supabase db reset`. DB targeted assignment
  đạt **15/15**, gồm ownership/anon negative path cho hai RPC mới.
- Playwright production build đạt **1/1**: teacher + hai context học sinh, save,
  refresh/resume, submit, privacy, analytics/detail, axe và overflow 375/1280.
  `typecheck`, `lint`, `scan:bundle` và `diff --check` đều đạt.

### Kết luận

- Phase 07 hoàn thành. Chưa bắt đầu Phase 08 trong thay đổi này.

## Phase 08 — Kho học liệu và kiểm duyệt ở backend

- `quiz_publications` giữ snapshot JSONB độc lập với quiz gốc; `quiz_id` được
  phép null sau khi quiz nguồn bị xoá. Public RPC luôn dựng payload preview từ
  snapshot đã lọc, không trả `is_correct` hay `accepted_answers`.
- Browse/preview chỉ đọc `approved`; approve/reject/hide kiểm tra `auth.role()`
  là `service_role` và không được grant cho anon/authenticated. Không có secret
  hoặc moderation client trong bundle.
- Clone chỉ đọc snapshot approved trong `security definer` transaction, sau đó
  tạo quiz/câu/lựa chọn mới thuộc giáo viên gọi. Report có unique
  `(publication_id, reporter_id)` để retry an toàn.
- DB library đạt **5/5** và EXPLAIN browse theo subject/grade dùng index
  `quiz_publications_browse_idx` dưới `LIMIT 24`; không thêm extension/cache.

### Kết luận

- Phase 08 hoàn thành. Phase 09 có thể bắt đầu từ contract library này.

## Phase 09 — UI kho học liệu và tích hợp sản phẩm

- Thêm `/library` và `/library/[id]` với browse/filter URL-backed, preview
  approved không có answer key, clone cho giáo viên đăng nhập và trạng thái
  publication của chủ sở hữu. Navigation và landing đã trỏ tới route thật.
- Next 16 route động `/library/[id]` chủ động opt-out instant navigation bằng
  `instant = false`, theo guide cục bộ, vì page đọc `params` ngoài boundary
  streaming. Không đổi contract dữ liệu.
- E2E public/auth library đạt: browse, preview, clone, axe và overflow 375px.

## Phase 10 — Privacy, retention và quality gate

- Privacy được cập nhật để mô tả chính xác assignment không tài khoản và kho học
  liệu kiểm duyệt; test privacy bảo vệ 11 mục, text retention/boundary và link
  neo tương ứng.
- Thêm migration local `20261112110000_assignment_retention_schedule.sql`.
  Lịch `pg_cron` dọn assignment closed quá 365 ngày theo mẻ 500, idempotent;
  fallback vẫn là purge cơ hội có sẵn khi tạo assignment.
- DB assignment mở rộng: ranh giới 364/366 ngày, batch=1, cascade attempt/answer
  và xoá lớp, ACL private và nhánh scheduler thiếu/lỗi `pg_cron`.
- Sửa ba expectation E2E stale để phản ánh redirect `/dashboard` đã được chốt
  trong Phase 04 và TOC privacy mở rộng; không thay production behavior.

### Verification

- `npm run typecheck`, `npm run lint`, `npm test`: **294 unit đạt**.
- `npm run test:db -- --reporter=dot`: **195 DB đạt**; targeted assignment:
  **10/10**.
- `npm run test:load`: **1/1 đạt**, profile 40×5, p95 mở câu 59ms, 0 HTTP/submit
  lỗi.
- `npm run build`: đạt production; `npm run scan:bundle`: 472 tệp sạch;
  `git diff --check`: đạt.
- `npm run test:e2e -- --reporter=dot`: hai lượt liên tiếp **254/254 đạt**.

### Handoff

- Không commit/push/deploy hay `db push`. Migrations Phase 07–10 vẫn chỉ được áp
  trên Supabase local; service-role moderation không có client implementation.
