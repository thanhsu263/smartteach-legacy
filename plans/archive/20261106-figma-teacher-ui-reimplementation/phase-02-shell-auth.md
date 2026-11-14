# Phase 02 — App shell và đăng nhập

## Mục tiêu

Áp dụng shell giáo viên Figma cho các route sản phẩm và chuyển `/login` sang bố
cục desktop/mobile đã thiết kế mà không mất bất kỳ luồng auth hiện có.

## Công việc

1. Lấy design context và asset cho `34:3800`, `34:3894`, `34:4083`, `34:4120`,
   `34:4649`, `34:4769`.
2. Tạo `TeacherShell`/`RouteChrome` dùng chung:
   - desktop sidebar 240px và collapsed 88px;
   - active nav cho Lớp học, Quiz của tôi, Trò chơi, Tiện ích;
   - tooltip khi collapsed, breadcrumb, account/auth actions;
   - mobile top bar + drawer, Escape/overlay/restore focus;
   - trạng thái collapse là UI preference cục bộ, không chạm Supabase.
3. Giữ root layout là Server Component; client shell chỉ nhận `children` đã được
   server render. Không chuyển toàn bộ route tree thành client module.
4. Chỉ áp shell cho product routes. Landing dùng chrome riêng; host/player/live
   canvas không bị shell bọc; login dùng layout auth riêng.
5. Không render global search chưa có logic. Khoảng trống top bar co giãn đúng
   responsive; search cụ thể nằm trong từng page list.
6. Tái cấu trúc `/login` theo frame:
   - desktop hai cột với quiz preview tĩnh, mobile chỉ form;
   - giữ sign-in, sign-up, Google OAuth, callback error, notice xác nhận email,
     busy, server-not-configured và redirect `next`;
   - không thêm checkbox ghi nhớ hoặc quên mật khẩu giả;
   - form error dùng alert Foundation, focus đi tới lỗi/field phù hợp.
7. Cập nhật test chrome/auth theo role và trạng thái mới; không khóa vào class hay
   pixel không cần thiết.

## File dự kiến

- `src/app/layout.tsx`
- `src/components/app-chrome.tsx`
- `src/components/teacher-shell.tsx` (mới)
- `src/components/teacher-shell.module.css` (mới)
- `src/config/navigation.ts`
- `src/components/site-header.tsx` / `.module.css` nếu còn compatibility
- `src/app/login/page.tsx`
- `src/app/login/login.module.css`
- `src/components/login-form.tsx`
- `src/components/login-form.module.css`
- `e2e/auth.spec.ts`, `e2e/a11y.spec.ts`, `e2e/a11y-auth.spec.ts`

## Acceptance

- Shell expanded/collapsed khớp hierarchy Figma; mobile không tràn 375px.
- Nav active có text/icon/shape, không chỉ màu; icon-only có accessible name và tooltip.
- Drawer/dialog quản lý focus, Escape, overlay và reduced-motion đúng.
- Mọi luồng auth hiện hữu chạy nguyên trạng, gồm Google và sign-up dù mockup chưa vẽ.
- Không có input hoặc link giả không thực hiện được hành động.
- Targeted auth/a11y tests đạt ở 1280px và 375px.

## Evidence

- Screenshot shell expanded/collapsed 1280px và drawer 375px.
- Screenshot login 1440/375, error/focus/busy.
- Keyboard trace: skip link → nav → account → nội dung; mở/đóng drawer trả focus.
