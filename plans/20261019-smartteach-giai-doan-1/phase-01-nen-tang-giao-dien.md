# Phase 1 - Nền tảng và giao diện

## Overview

Dựng khung Next.js, hệ token thiết kế theo Design Brief, bố cục chung và trang chủ. Kiểm tra độc lập được: build chạy, trang chủ hiển thị đúng token ở điện thoại và máy tính. Các phase sau dùng lại khung này.

## Files

Tất cả là file mới ở gốc `F:\smartTeach` (hiện chưa có mã ứng dụng):
- `package.json`, `tsconfig.json`, `next.config.*`, `eslint` config: khung Next.js (App Router, TypeScript).
- `src/config/site.ts`: tên thương hiệu và mô tả (tên tạm "SmartTeach").
- `src/app/layout.tsx`, `src/app/globals.css`: font Be Vietnam Pro, token màu/bo góc/khoảng cách, bố cục chung.
- `src/components/`: header, footer, nút, thẻ.
- `src/app/page.tsx`: trang chủ.
- `PRODUCT.md`, `DESIGN.md`: ngữ cảnh dự án theo quy ước `hs-frontend-development`, tạo từ Design Brief đã xác nhận.

## Tasks

- [x] **1.1 Khởi tạo dự án.** Tạo ứng dụng Next.js (App Router, TypeScript, ESLint) ở gốc repo bằng phiên bản ổn định mới nhất lúc khởi tạo; `git init` nếu người dùng đồng ý (thư mục hiện chưa phải git repo); thêm Vitest và Playwright. Kiểm tra: `npm run build`, `npm run lint` và một test mẫu chạy qua.
- [x] **1.2 Token thiết kế và bố cục.** Đưa Design Brief vào `DESIGN.md`/`PRODUCT.md` và thành token CSS: xanh dương chủ đạo, vàng chỉ cho nút kêu gọi hành động, nền sáng, Be Vietnam Pro (có subset tiếng Việt), bo góc khoảng 10px. Làm header (logo, Khám phá, Tiện ích, Đăng nhập), footer, nút, thẻ. Tên thương hiệu đọc từ `src/config/site.ts`. Kiểm tra: tương phản chữ trên nút vàng đạt WCAG AA; không cuộn ngang ở 375px.
- [x] **1.3 Trang chủ.** Hero (tiêu đề giọng "Thầy cô…", nút vào kho game), lối tắt tới tiện ích, khu vực game nổi bật. Dữ liệu game nổi bật lấy từ catalog ở phase 2; trước khi phase 2 xong dùng danh sách rỗng và trạng thái trống. Kiểm tra: Playwright mở trang chủ ở 375px và 1280px, từ trang chủ tới trang game/tiện ích trong tối đa 2 lần bấm (khi các phase kia xong).

## Acceptance criteria

- `npm run build` và `npm run lint` thành công.
- Trang chủ hiển thị đúng bảng màu, font, bo góc của Design Brief ở 375px và 1280px.
- Đổi tên thương hiệu ở `src/config/site.ts` thì header, footer và tiêu đề trang đổi theo.
- Điều hướng bằng bàn phím được, có focus rõ ràng.

## Risks

- Be Vietnam Pro phải có subset tiếng Việt, nếu không dấu hiển thị sai. Kiểm tra bằng đoạn văn có đủ dấu trên trang chủ.
