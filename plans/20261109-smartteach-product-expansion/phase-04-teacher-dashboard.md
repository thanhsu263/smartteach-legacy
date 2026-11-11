# Phase 04 — Dashboard giáo viên và điều hướng

## Overview

Thêm điểm vào sau đăng nhập bằng dữ liệu thật, không biến SmartTeach thành cổng
quản trị hay tạo metric trang trí. Dashboard ưu tiên tiếp tục công việc gần đây.

## Files / areas

- Tạo `src/app/dashboard/page.tsx` và CSS/module/component dashboard tương ứng.
- Tạo `src/lib/dashboard/` nếu cần contract tổng hợp có type/test riêng.
- `src/components/teacher-shell.tsx`, `app-chrome.tsx`, navigation config/icons.
- `src/proxy.ts`, `src/lib/auth/protected-paths.ts`, safe-next/auth tests.
- Landing/login CTA chỉ đổi đích khi ngữ nghĩa là “vào không gian giáo viên”.
- E2E auth/home/dashboard/a11y.

## Tasks

- [x] Thêm `/dashboard` vào TeacherShell, protected prefixes và matcher viết
  thẳng của Next proxy; đổi login fallback/brand link sang dashboard.
- [x] Tổng hợp bounded data thật: lớp gần đây, quiz gần đây, phiên gần đây và
  quick actions; không query answer/player chi tiết cho overview.
- [x] Dùng skeleton/empty/error/partial-error; lỗi một nguồn không làm mất các
  khối còn tải được nếu contract cho phép.
- [x] Mỗi metric/card dẫn tới route hoặc action thật. Không hiển thị assignment
  trước Phase 07; thêm vùng đó bằng contract mở rộng sau.
- [x] Mobile ưu tiên quick actions và recent items; desktop dùng layout tối đa
  hai cột, không lồng card nhiều lớp.
- [x] Giữ page/layout là Server Component khi phù hợp; client boundary chỉ cho
  auth/actions tương tác theo Next 16 docs.

## Acceptance criteria

- Đăng nhập không có `next` về `/dashboard`; deep link vẫn quay đúng route cũ.
- Dashboard không render dữ liệu mẫu; empty account mới chỉ dẫn tạo lớp/quiz.
- Mỗi khối có loading/error/action rõ, keyboard/touch sử dụng được.
- Shell current item, collapsed rail, mobile dialog và sign-out không regression.

## Verification

- `npm run typecheck`, `npm run lint`: đạt.
- `npm test -- src/lib/auth/protected-paths.test.ts src/app/auth/callback/route.test.ts`:
  2 files, **8 tests đạt**.
- Playwright `e2e/auth.spec.ts e2e/dashboard.spec.ts`: **21/21 đạt** trên
  production build với Supabase local.
- Dashboard axe + overflow: đạt ở 375px, 768px, 1280px; Escape đóng drawer
  mobile và trả focus đúng về nút mở menu.
- Visual smoke `e2e/phase-04-visual.spec.ts`: **1/1 đạt**, không lỗi console;
  đã rà ảnh dashboard thật ở 375px, 768px và 1280px.
- `git diff --check`: đạt.

## Risks

- Tránh một RPC tổng hợp lớn nếu reuse bounded API hiện có đủ nhanh; chỉ thêm
  contract server khi loại được round-trip/N+1 thực tế.
- Phase 07 phải bổ sung assignment block mà không đổi thứ bậc/dashboard baseline.
