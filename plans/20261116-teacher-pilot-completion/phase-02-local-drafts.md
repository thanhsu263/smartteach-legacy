# Phase 2 — Khôi phục nội dung chưa lưu trên trình duyệt

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC5–8; adapter dùng tiếp ở P5. Đọc schema thực của QuestionInput trước serialize.

## Files

Hiện có: src/components/quiz/{quiz-editor,question-form}.tsx + CSS; src/components/auth-provider.tsx, teacher-shell.tsx, admin/sign-out-account.tsx; src/lib/quiz/{api,validate,types}.ts; e2e/quiz-editor.spec.ts.
Mới: src/lib/drafts/{storage,types,conflicts}.ts + tests; src/components/drafts/{restore-notice,use-local-draft,logout-drafts-guard}.tsx/ts; e2e/local-drafts.spec.ts.

## Tasks

- [x] **P2.1 IndexedDB adapter có version/owner/baseline.** Theo contracts§3, inject adapter/clock để test, validate schema/size/version khi đọc; ghi dirty debounce và flush lifecycle. Record target/câu mới, fingerprint server, local revision/writer; không TTL; storage lỗi giữ form và notice không còn bảo đảm recovery. Race hai tab: read-check-write trong một transaction IndexedDB + BroadcastChannel/focus reread, ngừng writer cũ và yêu cầu xử lý conflict.
  - Verify: roundtrip4kind + new/existing; corrupt JSON/unsupported version/quota/denied storage; near max128KiB; A/B/entity keys; writer conflict; nháp vượt quota không bị báo đã lưu.
- [ ] **P2.2 Restore vào editor mà không ghi đè.** Sau auth+owner quiz load, báo timestamp + Khôi phục/Bỏ nháp; khôi phục đúng form/loại/câu, giữ cảnh báo dirty khi chuyển/rời. Baseline khác server/câu bị xóa có thông báo trước khi restore; không auto gọi save RPC. Save success chỉ clear revision đã gửi; failure hoặc gõ tiếp trong request giữ nháp mới. Tránh remount/onDirtyChange cleanup làm mất record.
  - Verify: browser reload/close-reopen, câu mới/cũ4kind, discard, failed save, delayed save+typing, switch-cancel, hai tab server mới/local mới, auth pending không flash nội dung account trước.
- [x] **P2.3 Logout/session expiry.** Tích hợp tại AuthProvider/guard chung trước mọi signOut: có nháp thì confirm dọn, cancel quay lại; SDK failure giữ nháp và không redirect như success. Sau success clear namespace account và thông báo các tab. Session expiry/signed-out tự nhiên khóa hiển thị/ghi nhưng không xóa; reauth đúng A mới offer restore. Không yêu cầu user approve lại chính sách đã chốt.
  - Verify: A logout confirm→B không nhìn nháp A; cancel/failure giữ; tự hết hạn→loginA restore; B→A không flash; logout từ teacher/mobile/admin entry cùng hành vi.

## Done

Rời trang có cảnh báo best-effort; pagehide không đảm bảo được chạy khi OS kill, nên không hứa mọi ký tự cuối chắc chắn còn. Chứng minh trên production browser storage thật; không test chỉ key naming.
