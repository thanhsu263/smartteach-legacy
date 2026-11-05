Mode: local
Status: active

# Kế hoạch tái thiết kế toàn diện SmartTeach — Classroom Control Room

## Outcome và nguồn quyết định

Triển khai [Decision Brief Classroom Control Room](../reports/brainstorm-2026-11-05-classroom-control-room.md) trên toàn bộ SmartTeach. `cloneTemplate/` chỉ là tham chiếu cục bộ, không được import hay trở thành dependency. Plan Quiz Sheets ở `../20261105-clone-template-ui-redesign/` đã bị superseded/cancelled.

## Scope

Bao gồm token/design system, app chrome, landing, catalogue game/tool, quiz/class workspaces, auth/support, host/player/results và test contract. Giữ nguyên Next.js App Router, CSS Modules, API, route, props công khai, logic Supabase và fixture người dùng. Không thêm Tailwind, Shadcn, GSAP, hoặc dependency từ template. Không commit/push/deploy trong lúc build nếu không có lệnh riêng.

## Phases

| Phase | Tên | Trạng thái |
| --- | --- | --- |
| 01 | [System foundation và motion contract](./phase-01-system-foundation.md) | Done |
| 02 | [App shell và brand landing](./phase-02-shell-landing.md) | Done |
| 03 | [Catalogue game, tool và stage](./phase-03-catalogue-tools.md) | In progress |
| 04 | [Workspace lớp học và quiz](./phase-04-workspaces.md) | Pending |
| 05 | [Host, player và kết quả](./phase-05-live-surfaces.md) | Pending |
| 06 | [Accessibility, responsive và release verification](./phase-06-verification.md) | Pending |

## Quy ước thực thi

- Đọc `AGENTS.md` và Next 16 docs tương ứng trước mỗi phần có client island/route/CSS test thay đổi.
- Brand và product giữ hai register khác nhau: landing có Lesson Launch Board + story scroll; app workspace dùng bề mặt gần đặc, state rõ, motion vì trạng thái.
- Signature pointer chỉ gồm Lesson Launch Board và một workflow classroom/quiz được chỉ định ở Phase 04. Dùng rAF, nội suy 0.08–0.14, `visibilitychange`/leave/unmount cleanup và CSS variables/refs, không render React theo frame.
- Host/player/game embed/whiteboard không dùng tilt, parallax, blur nặng hoặc scroll choreography. Không có content phụ thuộc animation để hiển thị.
- Quy ước visual mới thay toàn bộ hard-coded role về token, không dùng gradient text, card grid lặp máy móc, side-stripe >1px hoặc CRM vocabulary/data.
- Phase triển khai phải tôn trọng all existing E2E accessible names, focus flow và contract nghiệp vụ; cập nhật assertion chỉ khi observable visual contract thực sự đổi.

## Bản đồ acceptance

| Criterion | Phase | Evidence |
| --- | --- | --- |
| Bản sắc riêng, không Orbit/CRM/copy template | 01–04 | source/DOM scan + visual review |
| Landing có product demo SmartTeach thao tác được | 02 | Playwright keyboard/pointer/touch/reduced-motion + axe/overflow screenshots |
| Toàn bộ routes có hierarchy/workflow mới, logic cũ giữ nguyên | 03–05 | existing E2E suites theo route family + targeted visual tests |
| Motion cục bộ hiệu năng, fallback đầy đủ | 01,02,04,06 | DOM/computed-style + fast-pointer/reset/reduced-motion tests |
| AA, responsive, build suite xanh hai lượt | 06 | typecheck/lint/unit/DB/E2E twice/bundle scan |

## Rủi ro và kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| CSS redesign toàn diện làm drift | Token/primitive trước, một route family mỗi phase, screenshot checkpoints |
| Visual quá gần template | Dùng vocabulary SmartTeach, use case lớp học thật, review grep Orbit/CRM/template data |
| 3D làm click/flaky | Outer/middle/inner transform wrappers, small amplitudes, E2E pointer sweep/click/reset |
| Canvas/live bị trang trí quá mức | Contract cấm riêng trong Phase 05, a11y/overflow/host/play regression suites |
| Supabase local chưa sẵn sàng | Targeted public checks trước; DB/live tests chỉ khẳng định verified khi stack local chạy |

## Handoff

`hs-build` bắt đầu Phase 01. `implementation-notes.md` chỉ ghi evidence, baseline/screenshot path và quyết định phát sinh; không đổi scope đã chốt.
