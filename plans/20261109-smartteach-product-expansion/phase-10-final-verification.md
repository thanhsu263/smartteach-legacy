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

- [ ] Cập nhật privacy: roster credential, assignment answers/results, mục đích,
  access boundary, 365-day retention, delete/rotate, public publication/report,
  live 90-day retention và contact/delete request hiện có.
- [ ] Hoàn thiện scheduled + opportunistic purge assignment; test boundary,
  bounded batch, owner delete cascade và không cho API gọi private purge.
- [ ] Audit Landing: mọi CTA/copy về dashboard, giao bài, tiến độ, thư viện dẫn
  tới chức năng thật; loại/ghi rõ bất kỳ promise chưa triển khai.
- [ ] Audit grants/RLS/security-definer/search_path/token/key/error/log và client
  bundle; không có service key, secret, answer key hoặc PII ngoài contract.
- [ ] Audit Next 16 Server/Client boundary, route status/404, metadata, bundle
  growth, no runtime Figma/Stitch/cloneTemplate reference.
- [ ] Chạy targeted tests của từng phase trước, rồi full quality matrix; sửa
  regression ở lớp nguyên nhân, không nới assertion hợp lệ.
- [ ] Chạy browser thật: hover/touch/keyboard, dialog focus/Escape, offline,
  fast pointer, 320/375/768/1280/1440, reduced-motion, console/network.
- [ ] Chụp final screenshots và ghi command/result/file changes/intentional
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

## Risks

- Full suite dài: dùng targeted evidence trong vòng lặp, nhưng không thay thế hai
  lượt full E2E cuối.
- Docker/port/font network failure phải được phân loại là environment hay code
  bằng evidence; không đánh dấu pass khi không có exit code/complete report.
