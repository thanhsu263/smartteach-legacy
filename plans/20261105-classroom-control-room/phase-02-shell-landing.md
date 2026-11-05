# Phase 02 — App shell và brand landing

## Files/areas

- `src/components/site-{header,nav,footer}.*`, `app-chrome.tsx`, ambient background
- `src/app/page.tsx`, `page.module.css`, thay/rebuild `quiz-flow-preview.*` thành Lesson Launch Board
- `e2e/home.spec.ts`, `headings.spec.ts`, `a11y.spec.ts`, `apple-interface.spec.ts`

## Tasks

- Xây app chrome theo brand mới: navigation rõ theo task, trạng thái active, mobile drawer/focus/Escape và footer hữu ích; không đổi URL hay accessible names cốt lõi nếu không cần.
- Rebuild landing thành narrative: promise cho giáo viên → Lesson Launch Board có 3 use case thật → chapter chuẩn bị/dẫn lớp/đọc phản hồi → catalogue quick path → CTA kết.
- Lesson Launch Board là client island riêng; tách wrapper pointer/entrance/tab; tab semantics + roving focus, panel inactive inert/aria-hidden, local spotlight/rAF inertia và touch/reduced fallback.
- Story scroll dùng IntersectionObserver, default content visible, no auto-loop; mobile chỉ active board layer.
- Chụp baseline/after 320/375/768/1280 và kiểm console thực tế.

## Acceptance/verification

- Một h1, CTA chính rõ, SmartTeach copy/data thật; không marketing/CRM template copy.
- Keyboard, touch, fast-pointer-click/reset, no write request, axe AA và overflow 320–1280 đạt.
- `home`, `headings`, `a11y`, `apple-interface` đạt trên production build.
