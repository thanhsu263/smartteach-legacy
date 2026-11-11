# Phase 01 — Khoá screen flow và baseline

## Overview

Các màn hình mới chưa có frame Figma. Phase này tạo contract UX đủ để phase
sau không tự quyết layout, state hoặc interaction trong lúc code.

## Files / areas

- `figmaDesign/` và file Figma SmartTeach hiện có (external write, chỉ sau xác nhận).
- `PRODUCT.md`, `DESIGN.md` để đối chiếu; không sửa nếu chưa có sai khác được duyệt.
- `plans/20261109-smartteach-product-expansion/implementation-notes.md` (tạo khi build).
- Route/component/schema/test inventory trong `src/`, `supabase/`, `e2e/`, `tests/`.

## Tasks

- [x] Ghi baseline commit, `git status`, route map, component map, migration map
  và test matrix; bảo vệ toàn bộ untracked user files và hai fixture quiz.
- [x] Đọc guide Next.js 16 liên quan tới App Router, route conventions,
  Server/Client Components, `not-found`, proxy/auth và metadata trước khi code.
- [x] Tạo flow map cho: core public/tool screens, live host/player/results,
  dashboard, assignment teacher/student/analytics và curated library.
- [x] Với mỗi flow, thiết kế desktop/tablet/mobile và các state default, empty,
  loading, error, offline, success, destructive, expired/revoked/hidden.
- [x] Dùng Foundation Figma đã có; product surface theo lane Restrained, motion
  100–260ms để truyền state, touch target 44px, không hover-only.
- [x] Chỉ rõ content contract và realistic range: 0–20 lớp, 0–100 học sinh/lớp,
  0–50 quiz, tối đa 50 câu/quiz, 0–50 live players và danh sách dài có pagination.
- [ ] Trình người dùng duyệt screen flow/frame trước khi sang Phase 02. Nếu không
  được phép ghi Figma, xuất local review artifact và vẫn dừng ở gate duyệt.

## Evidence hiện tại

- Annotated screen contract: [`screen-flow-contract.md`](./screen-flow-contract.md),
  baseline `main@1eab7e0`.
- Đã đối chiếu `PRODUCT.md`, `DESIGN.md`, token/component hiện tại và các guide
  Next.js 16 về layouts/pages, Server/Client Components, error handling,
  metadata, proxy, dynamic routes, loading và `not-found`.
- Contract probe: **VERIFIED** cho 20 route hiện tại + 8 route dự kiến, có state,
  breakpoint 375/768/1280, content bounds và mapping UI ↔ API/RPC.
- Runtime reference audit không thấy production/test import `cloneTemplate`,
  Stitch hoặc Figma; `git diff --check` đạt; không có diff trong `src/`.
- Chưa chạy full test suite vì Phase 01 chỉ tạo tài liệu local và chưa đổi code
  production. Phase vẫn mở cho tới khi người dùng duyệt contract.

## Acceptance criteria

- Mỗi route/flow trong plan có frame hoặc annotated screen contract ở
  375/768/1280, kèm trạng thái và interaction model.
- Không có control chết, metric giả, dữ liệu CRM/template hoặc promise chưa có
  contract backend.
- Có map một-một từ frame tới route/component và từ state UI tới API/RPC result.
- Người dùng xác nhận thiết kế; link/node/export và sai khác được ghi vào
  implementation notes.

## Verification

- Review bằng ảnh ở kích thước thực; kiểm text dài tiếng Việt và table/list
  overflow trước khi duyệt.
- `rg` xác nhận production không import asset URL Figma tạm hoặc `cloneTemplate`.
- Readiness gate: Phase 02 không bắt đầu khi còn frame/state material chưa duyệt.

## Risks

- External Figma write không được suy ra từ plan; workflow thực thi phải xin
  xác nhận riêng.
- Nếu frame mâu thuẫn dữ liệu thật, dữ liệu/schema contract trong Decision Brief
  thắng; sửa frame thay vì tạo dữ liệu giả.
