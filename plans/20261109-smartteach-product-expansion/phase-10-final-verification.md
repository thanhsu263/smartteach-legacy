# Phase 10 — Privacy, retention và kiểm chứng toàn hệ thống

## Overview

Đóng toàn bộ acceptance, cập nhật thông tin dữ liệu đúng với chức năng mới và
chứng minh production build ổn định. Không thực hiện production migration/deploy.

## Files / areas

- `src/app/privacy/**`, landing/footer/navigation/site config nếu copy cần đồng bộ.
- Assignment/library retention migrations hoặc private purge functions còn thiếu.
- Toàn bộ unit/DB/load/E2E configs và test suites.
- `plans/20261109-smartteach-product-expansion/implementation-notes.md`.
- Evidence local dưới `artifacts/` theo convention; không tự commit ảnh lớn.

## Tasks

- [x] Cập nhật privacy: roster credential, assignment answers/results, mục đích,
  access boundary, 365-day retention, delete/rotate, public publication/report,
  live 90-day retention và contact/delete request hiện có.
- [x] Hoàn thiện scheduled + opportunistic purge assignment; test boundary,
  bounded batch, owner delete cascade và không cho API gọi private purge.
- [x] Audit Landing: mọi CTA/copy về dashboard, giao bài, tiến độ, thư viện dẫn
  tới chức năng thật; loại/ghi rõ bất kỳ promise chưa triển khai.
- [x] Audit grants/RLS/security-definer/search_path/token/key/error/log và client
  bundle; không có service key, secret, answer key hoặc PII ngoài contract.
- [x] Audit Next 16 Server/Client boundary, route status/404, metadata, bundle
  growth, no runtime Figma/Stitch/cloneTemplate reference.
- [x] Chạy targeted tests của từng phase trước, rồi full quality matrix; sửa
  regression ở lớp nguyên nhân, không nới assertion hợp lệ.
- [x] Chạy browser thật: hover/touch/keyboard, dialog focus/Escape, offline,
  fast pointer, 320/375/768/1280/1440, reduced-motion, console/network.
- [x] Chụp final screenshots và ghi command/result/file changes/intentional
  differences/remaining operational release steps trong implementation notes.

## Acceptance criteria

- Privacy và Landing trung thực với behavior/schema cuối.
- Assignment purge sau tối đa 365 ngày; live vẫn 90 ngày; test 364/366 và xóa
  owner/class/assignment không để orphan.
- Không có unauthorized table/RPC access hoặc answer/token/secret leakage.
- Không overflow ngang, axe WCAG A/AA xanh ở 375/1280, keyboard/reduced-motion
  đầy đủ và console không có lỗi trên core flows.
- Hai lượt full E2E production build liên tiếp đạt; bundle scan và diff check đạt.
- Không chạm fixture quiz của người dùng; không commit/push/deploy/db push.

## Verification matrix

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run test:db` với `npm run supabase:start` + `npm run supabase:env`
5. `npm run test:load` cho live và assignment profiles đã định
6. `npm run build`
7. `npm run test:e2e` hai lần liên tiếp trên production build; shard nếu runner
   cần nhưng tổng coverage mỗi lượt phải đầy đủ và có exit code thành công
8. `npm run scan:bundle`
9. `git diff --check` và audit changed/untracked files

## Release handoff

- Liệt kê migrations chưa đẩy, thứ tự chạy và rollback/compatibility notes.
- Liệt kê moderation operation cần service role nhưng không chứa secret/value.
- Production `db push`, Git commit/push và deploy chỉ chuyển sang `hs-ship` khi
  người dùng yêu cầu rõ; không suy ra từ việc plan/test hoàn tất.

## Verification — 2026-11-12

- Privacy hiện nói rõ roster credential, attempt/answer/result, QR fragment,
  rotate/revoke, 365 ngày, curated publication/report; live giữ thông báo 90
  ngày. Landing/nav audit chỉ giữ CTA tới dashboard, assignment và library đã có
  route/RPC thật.
- Migration `20261112110000_assignment_retention_schedule.sql` lập lịch 03:23
  hằng ngày khi `pg_cron` khả dụng, idempotent theo job name; nếu không khả dụng,
  migration chỉ notice và `create_assignment` vẫn dọn cơ hội. Targeted DB
  assignment: **10/10**, gồm 364/366 ngày, batch=1, cascade và private ACL.
- Full local matrix: `typecheck`, `lint`, **294 unit**, **195 DB**, load profile
  40 người chơi × 5 câu (0 lỗi HTTP/submit; p95 mở câu 59ms), production build,
  bundle scan **472 tệp sạch**, và `git diff --check` đều đạt.
- Playwright production build: targeted privacy/quiz-editor **23/23**, full E2E
  hai lượt liên tiếp đều **254/254**. Bao phủ axe/overflow 375px và 1280px,
  reduced motion, touch/keyboard/dialog/offline trong các core flows. Visual
  artifacts cuối: `test-results/phase-04-dashboard-375.png`, `-768.png`,
  `-1280.png`; visual suites Phase 02/03 cũng chạy trong full E2E.
- Test legacy sửa theo contract Phase 04 (đăng ký về `/dashboard`) và privacy
  đã mở rộng từ 9 thành 11 mục; đây là test-defect, không đổi nghiệp vụ.
- Không đụng fixture người dùng, không chạy `db push`, commit, push hay deploy.

### Production handoff

- Migrations chưa phát hành theo thứ tự: `20261112090000_assignment_analytics`,
  `20261112100000_quiz_publications`,
  `20261112110000_assignment_retention_schedule`. Chúng additive; rollback cần
  tắt cron job `smartteach-purge-old-assignments` trước khi gỡ object liên quan.
- Moderation chỉ gọi `moderate_quiz_publication` ở service-role boundary; không
  có UI/client key. Cần quy trình operator riêng trước khi đưa vào production.

## Risks

- Full suite dài: dùng targeted evidence trong vòng lặp, nhưng không thay thế hai
  lượt full E2E cuối.
- Docker/port/font network failure phải được phân loại là environment hay code
  bằng evidence; không đánh dấu pass khi không có exit code/complete report.
