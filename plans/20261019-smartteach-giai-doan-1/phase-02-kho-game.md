# Phase 2 - Kho game và nhúng game

## Overview

Kho game đọc từ một file danh mục tĩnh, có lọc theo môn và lớp, và trang chơi nhúng game quyentran.online. Kiểm tra độc lập được và không cần backend.

## Files

- `src/data/games.ts`: danh mục game (mới).
- `src/lib/catalog.ts`: hàm lọc và tìm game (mới).
- `src/app/games/page.tsx`: trang kho game (mới).
- `src/app/games/[id]/page.tsx`: trang chơi game nhúng (mới).
- `src/components/game-card.tsx`, `src/components/game-embed.tsx` (mới).

## Tasks

- [ ] **2.1 Danh mục game.** Định nghĩa kiểu `Game` gồm `id`, `title`, `description`, `subjects[]`, `grades[]`, `embedUrl`, `thumbnail`, `credits`. Nạp game đầu tiên: "Gargamel bắt Xì Trum" với `embedUrl` là `https://www.quyentran.online/` và `credits` lấy từ footer của game. Danh mục là file tĩnh do chủ dự án quản lý. Kiểm tra: unit test đảm bảo `id` không trùng và mọi game có `embedUrl` hợp lệ.
- [ ] **2.2 Trang kho game và bộ lọc.** Lưới thẻ game, lọc theo môn và lớp, ô tìm theo tên. Hàm lọc nằm trong `catalog.ts`. Trạng thái: không có kết quả, danh mục rỗng. Kiểm tra: unit test hàm lọc (môn, lớp, kết hợp, không khớp); Playwright lọc và thấy đúng thẻ.
- [ ] **2.3 Trang chơi nhúng.** Iframe với `allow="autoplay; fullscreen"` và `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"`; nút toàn màn hình; đường dẫn "Mở trong tab mới" luôn hiện cạnh game (không thể phát hiện lỗi tải iframe khác origin, nên không dựa vào sự kiện lỗi); hiện `credits` của game dưới khung. Trạng thái đang tải. Kiểm tra: Playwright mở trang game ở 375px và 1280px thấy iframe có `src` đúng; kiểm tra thủ công trên điện thoại thật rằng game chạy, âm thanh và toàn màn hình hoạt động.

## Acceptance criteria

- Khách mở `/games`, lọc theo môn và lớp được, thấy đúng danh sách.
- Mở game từ thẻ vào trang chơi và chơi được trên điện thoại và máy tính.
- Trang chơi luôn có đường dẫn mở tab mới và phần ghi nguồn bản quyền của game.

## Risks

- Game có nội dung của bên thứ ba (xem plan.md): việc công khai do chủ dự án quyết định ở phase 5; phase này chỉ hiển thị credits của game đúng như game đang ghi.
- Nếu về sau game thêm `X-Frame-Options`/CSP chặn nhúng thì iframe trống; đường dẫn mở tab mới là phương án thay thế.
