Mode: local
Status: active

# Kế hoạch triển khai UI SmartTeach từ screen flow Stitch

## Mục tiêu

Triển khai lại lớp trình bày SmartTeach theo brief đã duyệt và project Stitch
SmartTeach — Screen Flow 2026. Giữ nguyên hành vi nghiệp vụ, route, props, API
Supabase và mô hình dữ liệu; kết quả phải nhất quán desktop/mobile, rõ khi
trình chiếu, tiếp tục đạt WCAG AA và toàn bộ test hiện có.

## Nguồn quyết định

- plans/reports/brainstorm-2026-11-04-smartteach-stitch-redesign.md
- DESIGN.md và PRODUCT.md
- .stitch/metadata.json
- Mã nguồn Next.js 16 / React 19 và Playwright/Vitest hiện có

## Phạm vi

Bao gồm app chrome, trang chủ/kho game/kho công cụ, xác thực, lớp học, kho
quiz/trình soạn/import/chia sẻ, live quiz host-player-results và các trạng
thái loading/empty/error/confirmation.

Không bao gồm thay đổi schema, RLS, RPC, API, URL route, state-machine live
quiz, quy tắc tính điểm, import format, dependency UI, hay copy HTML Stitch
vào production. Không sửa tests/fixtures/quiz-thu-nghiem.csv hoặc .xlsx.

## Phases

| Phase | Tên | Trạng thái |
| --- | --- | --- |
| 01 | [Handoff thiết kế và nền tảng chrome](./phase-01-design-foundation.md) | Completed locally — dùng screen Stitch đã duyệt làm contract; không ghi ngược vào Stitch |
| 02 | [Khám phá công cụ và game](./phase-02-discovery-tools-games.md) | Completed — hero quyết định, lọc/danh mục phân cấp và action card rõ ràng |
| 03 | [Xác thực và không gian lớp học](./phase-03-auth-classes.md) | Completed — entry auth và khu tạo/quản lý lớp nhất quán |
| 04 | [Kho và trình soạn quiz](./phase-04-quiz-authoring.md) | Completed — library, editor workspace và icon action được áp dụng/kiểm chứng |
| 05 | [Quiz trực tiếp: host, học sinh và kết quả](./phase-05-live-quiz.md) | Completed — entry học sinh, history host và các canvas live chuyên dụng được giữ nhẹ/đọc rõ |
| 06 | [Kiểm chứng, responsive và hoàn thiện](./phase-06-verification-polish.md) | Completed — full suite lặp lại hai lần và bundle scan sạch |

## Quy ước xuyên suốt

- Dùng CSS Modules, globals.css, tokens.css và glass.css hiện có; không thêm
  Tailwind hay thư viện component.
- Tái sử dụng Button, ButtonLink, IconButton, icon SVG, data-glass và
  data-surface. Nút icon luôn có accessible name, tooltip và vùng bấm 44px.
- Nội dung làm việc là bề mặt gần đặc; translucency chỉ cho header/menu/popover
  hoặc sheet. Host/player, bảng trắng và game không được phủ blur/kính.
- Một CTA vàng chính cho mỗi màn hình. Xanh dành cho điều hướng, chọn và action
  phụ; trạng thái không chỉ biểu đạt bằng màu.
- Giữ focus management, heading, aria contract, reduced motion và accessible
  name mà e2e hiện kiểm tra.
- Screen Stitch là reference. Mọi tạo/sửa screen là external write và phải có
  xác nhận trong build workflow.

## Bản đồ acceptance

| Tiêu chí | Phase | Evidence |
| --- | --- | --- |
| Flow desktop/mobile và brand nhất quán | 01–05 | Screenshot 375/768/1280px đối chiếu .stitch metadata |
| Mở công cụ/quiz nhanh, hierarchy rõ | 02–04 | Playwright home/tools/games/quiz editor |
| Lớp/authoring giữ dữ liệu và thao tác | 03–04 | E2E, unit và DB test không hồi quy |
| Host/player readable, đủ live state | 05 | E2E host/play/results và axe desktop/mobile |
| WCAG AA, keyboard, reduced motion, không tràn | 01–06 | axe, focus, overflow 375px, reduced-motion tests |
| Không đổi API/schema/routing/bí mật | 01–06 | review diff, typecheck, DB suite, không migration/env change |

## Rủi ro và kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| Artboard Stitch chưa phủ toàn bộ route | Hoàn thiện reference của route đó trước khi code surface ở phase tương ứng. |
| Header/footer làm nhiễu canvas live | Presentation wrapper route-aware trong một root layout, tránh multiple root layouts/full reload. |
| Markup làm vỡ selector/a11y | Chạy targeted e2e từng phase; giữ accessible name hoặc cập nhật test cùng lúc với copy duyệt. |
| CSS giảm tương phản hoặc tràn | Axe/overflow tại 1280px và 375px, kiểm focus/reduced motion. |
| UI vô tình đổi logic live | Review diff, chạy DB/live e2e; không sửa src/lib trừ type-only import được chứng minh cần thiết. |

## Handoff

hs-build bắt đầu Phase 01, đọc AGENTS.md và docs Next.js liên quan trước khi
viết code, ghi evidence vào implementation-notes.md. Không commit/push nếu
người dùng chưa yêu cầu.
