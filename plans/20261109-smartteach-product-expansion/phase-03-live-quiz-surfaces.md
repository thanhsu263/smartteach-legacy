# Phase 03 — Hoàn thiện trải nghiệm quiz trực tiếp

## Overview

Thiết kế lại presentation của live quiz trên contract RPC/state machine đã đạt
test, giữ nguyên realtime, polling, scoring, auto-advance và treasure.

## Files / areas

- `src/app/host/**`, `src/app/play/page.tsx`.
- `src/components/live/host/**`, `player/**`, `results/**` và CSS Modules.
- `src/lib/live/**` chỉ sửa khi một lỗi contract thật được chứng minh; không đổi
  state machine để khớp hình.
- `e2e/host*`, `play*`, `live.spec.ts`, `results.spec.ts`, `auto-advance.spec.ts`,
  `treasure.spec.ts` và DB live suites.

## Tasks

- [x] Dựng start-session và history với quiz picker, validation, active-session
  conflict, option speed/auto/reveal/treasure và error state thật.
- [x] Dựng host lobby cho màn chiếu: PIN/QR, roster, lock/kick/start, connection
  status, zero-player disabled state và fullscreen.
- [x] Dựng question/reveal/leaderboard/podium với timer, distribution, pause,
  manual/auto transition và control không nhảy vị trí khi click.
- [x] Dựng `/play`: join error gắn đúng field, lobby/offline/reconnect, bốn dạng
  answer, locked/submitted/reveal/final/removed và treasure states.
- [x] Dựng results/history responsive: ranking, question analytics, answer matrix,
  empty/long-list/deleted-quiz/delete-session states.
- [x] Giữ live canvas không dùng TeacherShell; semantic heading/landmark và
  contrast đủ để chiếu trong lớp sáng.
- [x] Motion chỉ giải thích phase change/countdown/result; reduced-motion bỏ
  choreography nhưng không bỏ trạng thái hoặc feedback.

## Acceptance criteria

- Giáo viên đi được quiz → session → lobby → question → reveal → end → results;
  học sinh đi được PIN → lobby → answer → reveal → final.
- Realtime hỏng vẫn chuyển polling; offline banner rõ và không mất answer đã gửi.
- Answer selection có hình/chữ/dấu chọn, không chỉ màu; touch target ≥44px.
- Auto-advance, pause, treasure và manual flow giữ nguyên kết quả DB hiện có.
- 375px không overflow; host 1280px/projector đọc được từ xa; axe A/AA đạt.

## Verification

- Unit live sync/result/answer-style tests.
- DB targeted: `live`, `live-auto`, `live-realtime`, `live-retention`,
  `live-treasure` trên Supabase local.
- Playwright targeted toàn bộ host/play/live/results/auto/treasure + a11y.
- Chạy một manual two-browser flow, keyboard join, network offline/reconnect,
  reduced-motion và console check.

## Evidence

- `/host` nay có quiz picker, loading/error/empty state và tái sử dụng
  `StartSession`; validation quiz, session conflict và option hiện có không bị
  tách thành luồng khác.
- Host và player luôn có nhãn chữ cho `live`/`polling`/`offline`; bảng kết quả
  dùng surface đặc để giữ tương phản trên máy chiếu.
- Unit live/answer style: **78/78 đạt**.
- Playwright host/play/live/results/auto/treasure/a11y + visual smoke: **63/63
  đạt** trên production build với Supabase local.
- DB targeted live/auto/realtime/retention/treasure đã chạy trên Supabase local;
  thông báo duplicate-key của `treasure_chests_unique_per_question` là assertion
  negative-path có chủ đích và được tái lập riêng với exit 0.
- Visual smoke 1280px host picker/lobby và 375px player join: **1/1 đạt**,
  không lỗi console; đã rà ảnh output.

## Risks

- Không animate node đang là click target khi Playwright/user thao tác.
- Không đổi polling cadence hoặc Realtime payload trong phase presentation.
- Nếu frame yêu cầu trạng thái RPC chưa có, quay lại contract/plan thay vì mock.
