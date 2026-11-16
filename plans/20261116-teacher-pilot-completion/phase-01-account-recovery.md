# Phase 1 — Khôi phục và đổi mật khẩu

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. Độc lập với tính năng đề. AC1–4; hỗ trợ P2 logout.

## Files

Hiện có: src/components/login-form.tsx, auth-provider.tsx, teacher-shell.tsx; src/app/auth/callback/route.ts và route.test.ts; src/lib/auth/{safe-next,messages,protected-paths}.ts; src/proxy.ts; src/lib/supabase/{client,server}.ts; e2e/{auth,a11y-auth}.spec.ts; supabase/config.toml.
Mới: src/app/{forgot-password,reset-password}/page.tsx, src/app/account/security/page.tsx + account/layout.tsx; components/auth/password-forms.tsx/module.css; lib/auth/password.ts/tests; e2e/account-recovery.spec.ts.

## Tasks

- [x] **P1.1 Recovery email → callback → reset.** Thêm link Quên mật khẩu ở login, form yêu cầu/notice/send-again, redirect canonical theo contracts§3. Phân biệt failure recovery với login OAuth mà không phá callback hiện có. Trang reset xác minh phiên Auth, token hết hạn/đã dùng/mất verifier có lối gửi lại; xóa auth code khỏi URL sau exchange, no-store/no-referrer trên recovery. Không coi next=/reset-password là quyền reset tùy tài khoản. Local thêm exact redirect path phù hợp, không đụng SMTP remote.
  - Verify: unit safe-next + callback malicious next/encoded paths/provider error/missing code; Mailpit local email thật rồi dùng link một lần, link hết hạn và link mở nơi mất verifier; email lạ cùng phản hồi. Không sửa test đúng để chấp nhận callback vòng lặp.
- [ ] **P1.2 Đổi/reset mật khẩu của chính phiên.** Confirm password, pending/error/success; map policy errors, reauth nonce khi Supabase yêu cầu. Trang /account/security có đường vào trong account section TeacherShell; Google-only có hướng dẫn đúng. Sau reset thành công hướng đăng nhập lại, xử lý session/signOut qua API chung không làm mất nháp ngầm. Sửa signOut trả kết quả SDK thật/throw lỗi trước redirect để P2 hook cảnh báo/dọn đúng; tất cả entry kể cả admin dùng cùng luồng.
  - Verify: Auth integration local password cũ fail/mới pass, nonce thiếu/sai/hết hạn và cấu hình secure-password-change trong test profile tạm local; anon/teacherB không đổi được A; Google OAuth callback regression; 375/768/1280 + keyboard/focus/axe.

## Done

Có evidence local email → reset → login, không chỉ mock SDK. Mật khẩu/token không trong URL ngoài flow provider, log, screenshot hoặc RAG. Policy/SMTP online chưa verified phải giữ riêng ở P9.2, không chặn làm code local hoặc tự bật provider.
