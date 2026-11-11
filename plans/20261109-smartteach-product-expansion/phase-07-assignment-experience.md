# Phase 07 — UI giao bài, làm bài và phân tích

## Overview

Kết nối contract Phase 05–06 thành flow production-ready cho giáo viên và học
sinh, đồng thời đưa dữ liệu assignment thật vào dashboard/class/quiz.

## Files / areas

- Tạo `src/app/assignments/**`, `src/app/learn/page.tsx`, `learn/[code]/page.tsx`.
- Tạo `src/components/assignments/**` và CSS Modules.
- `teacher-shell.tsx`, `app-chrome.tsx`, protected paths/proxy, dashboard,
  class detail, quiz list/editor action integration.
- Tạo E2E assignment teacher/student/a11y/security.

## Tasks

- [ ] Teacher list: filter open/closed/draft, empty/loading/error, create CTA,
  due status và bounded pagination/load-more nếu data vượt một trang.
- [ ] Create flow: chọn quiz/lớp, title, open/due, reveal policy, validation và
  review-before-publish; quiz invalid phải link về editor.
- [ ] Detail: status/actions, link/code/QR, access-card generation/rotate/revoke,
  roster progress, close/delete/reset confirmation và partial errors.
- [ ] Tích hợp “Giao bài” từ quiz và “Bài đã giao” từ class; không tạo duplicate
  shell hoặc state riêng khác contract assignment.
- [ ] `/learn`: nhập assignment code + credential; `/learn/[code]`: loading,
  not-open/expired/closed/revoked/recovery và privacy copy ngắn.
- [ ] Student runner: one-question focus, visible progress, previous/next,
  autosave feedback, resume, review unanswered, submit confirmation và released/
  withheld result. Không dùng hover, không lộ key trong DOM/network trước release.
- [ ] Analytics: counts chưa bắt đầu/đang làm/đã nộp, roster table, question
  correct rate/unanswered, attempt detail và reset; label + icon, không chỉ màu.
- [ ] Bổ sung assignment cards vào dashboard bằng data thật, không làm dashboard
  thất bại toàn trang khi assignment API lỗi.
- [ ] Mobile: teacher table chuyển summary rows/cards có detail; student CTA ở
  thumb reach, bàn phím ảo không che action; tablet master-detail khi phù hợp.

## Acceptance criteria

- Teacher hoàn tất quiz → create/publish → share access → monitor → close →
  inspect result; student hoàn tất join → resume → submit → result policy.
- Một học sinh không thấy tên/kết quả học sinh khác; teacher khác không thấy bài.
- Refresh/tab close không mất answer đã save; double-click submit vẫn một kết quả.
- Credential rotate/reset/revoke có feedback và recovery rõ.
- Axe/keyboard/375px đạt; long name/title và 100-student roster không overflow.

## Verification

- Unit adapter/format/state tests và targeted DB assignment suites.
- Playwright teacher + two student contexts: happy path, refresh/resume,
  duplicate submit, revoked code, due/close, reset, reveal hidden/released.
- Axe 375/1280, keyboard-only flow, reduced-motion, offline/save retry and
  no-console/no-horizontal-overflow assertions.
- Screenshot compare với frames Phase 01 ở 375/768/1280.

## Risks

- Không gọi mọi keystroke là network write; save theo answer/step với visible
  pending/saved/error state và retry không mất local draft.
- Destructive reset/delete cần native dialog/focus restore; không ẩn hành động
  duy nhất sau swipe/gesture.
