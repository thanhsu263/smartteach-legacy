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

- [ ] Browse page: search, subject/grade filters, URL-backed query, result count,
  pagination/load-more, loading/empty/error và clear filters.
- [ ] Resource rows/cards ưu tiên title/subject/grade/question count/author label
  tối thiểu; không metric clone/rating giả và không grid card đồng dạng quá mức.
- [ ] Detail preview: description, metadata, question preview không key, owner/
  moderation status khi signed in, clone CTA và quiz-limit/auth errors.
- [ ] Publish flow trong quiz: metadata, review summary, submit confirmation,
  pending/approved/rejected/hidden copy, reviewer reason, withdraw/resubmit.
- [ ] Không tạo moderator UI công khai. Operator action nằm ngoài client; UI owner
  chỉ phản ánh status và hướng xử lý.
- [ ] Update navigation và landing “Kho học liệu” tới `/library` chỉ khi backend
  phase đã chạy; giữ private quiz route `/my-quizzes` riêng.
- [ ] Mobile filter dùng sheet/popover accessible, desktop inline; URL state cho
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
