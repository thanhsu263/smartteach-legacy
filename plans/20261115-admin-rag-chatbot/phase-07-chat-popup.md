# Phase 7 — Popup giáo viên và trải nghiệm nguồn

Status: Verified local — live configuration/provider quality UNVERIFIED where applicable
Depends on: Phase 6; Phase 2 cho settings/feature flag

## Kết quả

Giáo viên mở chatbot góc dưới bên phải, hỏi/tìm nguồn, xem lại hoặc xóa hội thoại mà không cản hoạt động dạy học. Tôn trọng design system hiện có, không thêm thư viện UI/motion thứ hai.

## Files / areas

- **Mới:** src/components/chat/{chat-widget,chat-panel,chat-messages,chat-composer,chat-history,source-citations}.tsx, chat.module.css; src/lib/chat/{api,use-chat,visibility}.ts.
- **Mới:** src/app/help/sources/[id]/page.tsx (hoặc source viewer tương đương theo contracts), source viewer component, e2e/{chat-widget,chat-accessibility}.spec.ts, src/lib/chat/visibility.test.ts.
- **Sửa tối thiểu:** src/app/layout.tsx để mount trong auth provider và Suspense; src/components/app-chrome.tsx nếu cần phối hợp overlay, src/components/teacher-shell.tsx cho entry liên quan. Dùng Button/IconButton/icons/token hiện có; không chỉnh hero model hoặc landing effects.

## Tasks

- [x] **P7.1 — Launcher, panel và route/fullscreen policy.** Chỉ user active có khả năng teacher nhìn thấy; không flash trước auth loading. Desktop non-modal popup gọn có accessible name, Escape/đóng/thu nhỏ và focus return; mobile modal sheet có trap focus/native dialog, visual viewport + safe area cho keyboard. Ẩn ở /admin, /login, /play, /learn/**, /host/** và fullscreen; khi native modal khác đang mở không tranh top layer. Trên landing tránh chồng launcher lên nút “Thử một câu quiz”; không sửa vị trí hero để né widget.
  - Verify: 375/768/1280, zoom, keyboard, reduced motion; mở/đóng/route/fullscreen và hero quiz modal, nguồn/CTA không bị che. Khi thoát fullscreen không tự bật lại panel để lộ chat trên máy chiếu. Session hết hạn/blocked/logout dọn state UI và abort, account khác không thấy hội thoại cũ trong RAM.
- [x] **P7.2 — Luồng hỏi đáp và nguồn.** Các gợi ý theo enum trang, không gửi URL token/query/DOM quiz/lớp. Composer có label, Enter gửi/Shift+Enter xuống dòng, chống double submit, requestId ổn định; SSE state thật, stop/retry không nhân nội dung đã gửi. Render text/Markdown an toàn, source citation từ server và viewer nguồn chỉ đọc excerpt còn hiệu lực. Không tự mở popup hoặc tạo câu trả lời giả khi backend unavailable.
  - Verify: state empty/retrieving/generating/final/no_source/clarify/error/quota/config-disabled/EOF; sources mở đúng document locator hoặc library preview; slow network/abort/retry. Model HTML/script/tracking image/unsafe link không chạy. Screen reader không đọc lại toàn transcript mỗi delta/state.
- [x] **P7.3 — History, deletion và thông báo AI.** Danh sách thread owner có mới/xem lại/xóa, TTL 30 ngày được giải thích ngắn; nút xóa có xác nhận thao tác rõ, không nhầm với thu nhỏ. Sau xóa, client dọn cache/context, reload không hồi dữ liệu. Thông báo dữ liệu gửi AI và giới hạn nguồn, dẫn privacy; không có admin “xem hội thoại giáo viên”.
  - Verify: A logout→B login, two-tab delete, expiry khi panel đang mở, refresh/reopen và thread đã xóa. Bản nháp không lẫn qua account; không lưu transcript vào localStorage. Backend lỗi deletion không hiển thị xóa thành công giả.

## Acceptance / evidence

Playwright dùng auth/threads/history/source API thật của local Supabase; provider boundary có thể fixture SSE ở browser cho state UI và service/DB tests riêng ở phase 6. Ghi rõ phần mock, không gọi đó là live Gemini end-to-end. Có screenshot đọc lại ở desktop/tablet/mobile, axe WCAG 2.1 AA và keyboard/focus checks cho cả popup lẫn source viewer.

Source viewer là route teacher-protected mới: thêm layout/server active-user check, protected-path matcher và teacher chrome phù hợp cho /help/sources/**. Không dựa vào việc chỉ API nguồn có auth để cho page hiển thị dữ liệu prerender.

## Risks

Global widget dễ chồng CTA, fullscreen hoặc modal; kiểm các trang giáo viên và landing, không chỉ một sandbox component. Giữ vùng đọc ít transparency; motion 100/180/260 ms theo tokens và instant khi reduce. Không thêm magnetic/gradient/glow vào vùng nhập liệu.

## Evidence thực thi

Xem [implementation-notes.md](./implementation-notes.md) và artifacts/admin-rag. Checked là triển khai/kiểm chứng local; không là xác nhận bật dịch vụ production hoặc chất lượng Gemini live.
