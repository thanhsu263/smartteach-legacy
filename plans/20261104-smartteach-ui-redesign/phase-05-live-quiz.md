# Phase 05 — Quiz trực tiếp: host, học sinh và kết quả

## Overview

Triển khai host projection 16:9, player mobile join/play và results theo flow
Stitch, bảo toàn session/state/realtime/scoring hiện hữu.

## Files / areas

- src/app/host/**, src/app/play/page.tsx
- src/components/live/host/**, src/components/live/player/**,
  src/components/live/results/**, src/components/qr-code.*
- e2e/host.spec.ts, host-a11y.spec.ts, play.spec.ts, play-a11y.spec.ts,
  results.spec.ts, auto-advance.spec.ts, treasure.spec.ts
- tests/db/live*.test.ts, tests/load/live-load.test.ts

## Tasks

- [x] 05.1 Apply minimal host session bar, PIN, participant/status, large
  question/timer, state indicator and fixed teacher dock. Preserve keyboard,
  fullscreen, reconnect and phase transitions.
- [x] 05.2 Preserve A–F mapping in answer-shape.tsx/answer-styles.ts: letter +
  distinct shape + color, plus selected/locked/correct non-color feedback.
- [x] 05.3 Make PIN/name entry, lobby, question, submitted/result/final,
  network/expiry/elimination mobile-first, legible and non-modal by default.
- [x] 05.4 Restyle leaderboard, podium, result detail, history and delete
  confirmation; retain score/access/ownership/focus behavior.
- [x] 05.5 Review that presentation changes do not alter RPC, realtime,
  storage recovery, speed-score or auto-advance timing.

## Acceptance criteria

- Host readable on 16:9 desktop; player independently usable at 375px including
  error/reconnect/reduced-motion state.
- PIN/QR, lock/remove/start/end/auto-advance/fullscreen và all question types
  retain behavior/accessibility.
- Results/access/delete/score totals do not change.

## Verification

- npm run typecheck; npm run lint; npm test
- npm run test:e2e -- e2e/host.spec.ts e2e/host-a11y.spec.ts e2e/play.spec.ts e2e/play-a11y.spec.ts e2e/results.spec.ts e2e/auto-advance.spec.ts e2e/treasure.spec.ts
- npm run test:db; npm run test:load with local Supabase.
- Visual inspection host 1280px and player 375px.
