# Phase 2 - Soạn quiz và chia sẻ

## Overview

Giao diện giáo viên để quản lý và soạn quiz, chia sẻ bằng link và nhân bản. Dùng các hàm của phase 1, theo cách dựng của phase 4 giai đoạn 1 (client Supabase trong trình duyệt, RLS làm hàng rào). Chưa có nút chơi (phase 6).

## Files

- `src/proxy.ts` (matcher thêm `/my-quizzes/:path*`), `src/app/my-quizzes/layout.tsx`, `require-user.tsx` hoặc dùng lại cách của `src/app/my-classes/`.
- `src/config/navigation.ts`, `src/components/site-nav.tsx`: thêm mục "Quiz của tôi" khi đã đăng nhập.
- `src/app/my-quizzes/page.tsx`, `src/app/my-quizzes/[id]/page.tsx`, `src/app/shared/quiz/[token]/page.tsx` (mới).
- `src/components/quiz/`: `quizzes-manager.tsx`, `quiz-editor.tsx`, `question-form.tsx`, `share-panel.tsx`, `quiz-problems.tsx` và các tệp `.module.css` (mới).
- `src/lib/quiz/validate.ts`, `validate.test.ts`, `api.ts` (mới).
- `e2e/quiz-editor.spec.ts`, bổ sung `e2e/a11y-auth.spec.ts`.

## Tasks

- [ ] **2.1 Bảo vệ trang và điều hướng.** Mở rộng proxy và layout bảo vệ cho `/my-quizzes`; mục "Quiz của tôi" trong thanh điều hướng khi đã đăng nhập (và trong menu điện thoại). Kiểm tra: e2e khách vào `/my-quizzes` bị chuyển tới `/login?next=…`; giáo viên thấy mục điều hướng.
- [ ] **2.2 Danh sách quiz.** Tạo quiz (tên), nhân đôi, xoá có xác nhận (không dùng cửa sổ chặn, theo mẫu xác nhận tại chỗ của phase 4), hiện số câu, trạng thái chia sẻ và `n / 50 quiz`. Trạng thái: chưa có quiz, đang tải, lỗi kèm thử lại, đạt giới hạn. Kiểm tra: e2e các luồng; axe.
- [ ] **2.3 Trình soạn câu hỏi.** Danh sách câu bên trái (thêm, xoá, đổi thứ tự bằng nút lên/xuống có tên truy cập được), biểu mẫu theo dạng: `single` (2-6 lựa chọn, chọn 1 đáp án đúng), `true_false` (Đúng/Sai cố định, chọn 1), `multi` (2-6 lựa chọn, chọn từ 1 đáp án đúng trở lên), `short_text` (danh sách đáp án chấp nhận tối đa 10, công tắc "chấp nhận không dấu"); chọn thời gian từ {10, 20, 30, 60, 90} giây. Kiểm tra ngay tại từng trường bằng `validate.ts` (hàm thuần, cùng quy tắc với `quiz_problems`) và lưu bằng `save_question`. Bảng "Cần sửa trước khi chơi" từ `quiz_problems`. Kiểm tra: unit test `validate.ts` (bảng ca cho 4 dạng); e2e tạo quiz đủ 4 dạng, sửa, đổi thứ tự, xoá; mất mạng khi lưu hiện lỗi mà không mất nội dung đang gõ.
- [ ] **2.4 Chia sẻ và nhân bản.** Bảng chia sẻ trong trình soạn: bật, sao chép link `/shared/quiz/<token>`, tắt, đổi mã (thu hồi), kèm cảnh báo rằng link cho xem cả đáp án. Trang `/shared/quiz/[token]` bắt đăng nhập, xem chỉ đọc và nút "Sao chép về tài khoản của tôi"; token sai hoặc đã thu hồi báo "Không tìm thấy". Kiểm tra: e2e hai giáo viên (A chia sẻ, B xem và nhân bản, A thu hồi thì link cũ báo không tìm thấy, khách bị chuyển tới đăng nhập).

## Acceptance criteria

- Giáo viên tạo, soạn, nhân đôi, xoá quiz đủ 4 dạng với kiểm tra lỗi rõ ràng; dữ liệu sai không lưu được.
- Chia sẻ, nhân bản và thu hồi hoạt động; người khác không thấy quiz riêng tư.
- Trang dùng được ở 375px, không vi phạm WCAG theo axe, cấp tiêu đề không nhảy cấp.

## Risks

- Quy tắc kiểm tra ở `validate.ts` và `quiz_problems` có thể lệch nhau: cho một bảng ca dùng chung (tệp JSON trong `tests/`) mà cả unit test và test DB cùng đọc.
