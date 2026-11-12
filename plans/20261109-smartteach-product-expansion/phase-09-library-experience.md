# Phase 09 — UI kho học liệu và tích hợp sản phẩm

## Overview

Đưa curated library vào sản phẩm bằng browse/preview/clone thật và workflow gửi
duyệt rõ ràng, không biến SmartTeach thành mạng xã hội.

## Files / areas

- Tạo `src/app/library/page.tsx`, `src/app/library/[id]/page.tsx` và CSS Modules.
- Tạo `src/components/library/**`.
- Quiz list/editor/share panel để thêm metadata + submit/withdraw/resubmit status.
- `src/config/navigation.ts`, TeacherShell, landing/footer links và copy liên quan.
- E2E library public/auth/moderation-state/a11y/security.

## Tasks

- [x] Browse page: search, subject/grade filters, URL-backed query, result count,
  pagination/load-more, loading/empty/error và clear filters.
- [x] Resource rows/cards ưu tiên title/subject/grade/question count/author label
  tối thiểu; không metric clone/rating giả và không grid card đồng dạng quá mức.
- [x] Detail preview: description, metadata, question preview không key, owner/
  moderation status khi signed in, clone CTA và quiz-limit/auth errors.
- [x] Publish flow trong quiz: metadata, review summary, submit confirmation,
  pending/approved/rejected/hidden copy, reviewer reason, withdraw/resubmit.
- [x] Không tạo moderator UI công khai. Operator action nằm ngoài client; UI owner
  chỉ phản ánh status và hướng xử lý.
- [x] Update navigation và landing “Kho học liệu” tới `/library` chỉ khi backend
  phase đã chạy; giữ private quiz route `/my-quizzes` riêng.
- [x] Mobile filter dùng sheet/popover accessible, desktop inline; URL state cho
  back/forward/share; long Vietnamese content wrap an toàn.

## Acceptance criteria

- Public user browse/filter/search/preview approved publication; pending/hidden
  URL trả not-found/generic unavailable, không rò metadata/key.
- Signed-in teacher clone được thành quiz độc lập và submit/withdraw publication.
- Filter/URL/back-forward hoạt động; empty/error chỉ dẫn bước tiếp theo.
- Navigation/landing copy phản ánh đúng curated review, không hứa publish tức thì.
- Axe, keyboard, 375/768/1280 và reduced-motion đạt.

## Verification

- Unit library query/state/format tests + DB library suite.
- Playwright public browse/detail, signed-in submit/clone/withdraw, pending/hidden
  negative paths, quiz limit và navigation from landing.
- Axe/overflow/heading/security/console assertions và screenshots frame-matched.

## Risks

- Không cho filter/search setState gây request mỗi ký tự không kiểm soát; debounce
  hoặc explicit submit theo contract và abort stale request.
- Không hiển thị tên/email teacher nếu chưa có consent/profile contract; dùng
  nhãn nguồn phù hợp hoặc ẩn tác giả trong MVP.

## Verification — 2026-11-12

- Playwright production build library: **1/1 đạt** — URL filter public, preview
  không key, clone authenticated, axe WCAG và overflow 375px.
- `typecheck`, `lint` và DB contract Phase 08 đạt.

## Kết luận

- Phase 09 hoàn thành. Native select là popover accessible trên mobile; không
  dùng custom sheet để tránh thêm interaction không cần thiết.

## Review remediation — 2026-11-12

- Browse UI nay chuyển tiếp đầy đủ `limit=24` và `offset` tới RPC, giữ
  `total/hasMore` trong client và cho tải thêm không làm mất kết quả đang xem.
- Form publication cho chỉnh tiêu đề/mô tả, hiển thị native confirmation dialog
  trước khi gửi và vẫn giữ luồng withdraw/resubmit của chủ sở hữu.
- Thêm regression Playwright cho cả trang thứ hai và metadata được lưu thành
  publication `pending`. `typecheck`, lint, `diff --check`, production build
  và Playwright production **1/1 đạt** (bao gồm axe/overflow 375px).
