# Phase 7 - Kết quả, lưu trữ và quyền riêng tư

## Overview

Giáo viên xem kết quả sau buổi chơi; dữ liệu người chơi tự xoá sau 90 ngày; trang Quyền riêng tư nói đúng những gì ứng dụng lưu. Dùng các bảng của phase 3.

## Files

- `supabase/migrations/<thời gian>_results_retention.sql` (mới).
- `src/app/host/[id]/results/page.tsx` hoặc `src/app/my-quizzes/sessions/[id]/page.tsx`, `src/components/live/results/` (mới).
- `src/components/quiz/quiz-editor.tsx`: danh sách các buổi đã chơi.
- `src/app/privacy/page.tsx`, `e2e/privacy.spec.ts`.
- `tests/db/live-retention.test.ts`, `e2e/results.spec.ts` (mới).

## Tasks

- [ ] **7.1 Hàm và trang kết quả.** `host_results(session)` (chỉ chủ phiên): xếp hạng cuối, điểm từng người, tỉ lệ đúng từng câu, đáp án của từng người ở từng câu, thời gian trả lời trung bình. Trang kết quả: bảng xếp hạng, bảng theo câu, bảng theo người chơi; danh sách các buổi đã chơi của một quiz (ngày, số người, điểm trung bình) và xoá một buổi có xác nhận. Kiểm tra: test DB (B không xem được kết quả của A, kết quả khớp điểm tính tay); e2e xem, xoá buổi.
- [ ] **7.2 Xoá dữ liệu sau 90 ngày.** Hàm `purge_old_sessions(days int default 90)` xoá phiên cũ (người chơi và câu trả lời theo cascade); được gọi cơ hội khi giáo viên tạo phiên mới (xoá phiên cũ của chính họ, và cả phiên quá hạn toàn hệ thống nếu cần); migration lập lịch `pg_cron` mỗi ngày **có điều kiện** (nếu tiện ích có và bật được thì lập lịch, nếu không thì bỏ qua mà không làm hỏng migration). Hàm không gọi được bởi `anon` hay `authenticated` ngoài phạm vi cho phép. Kiểm tra: test DB chèn phiên cũ bằng `service_role`, gọi hàm và xác nhận bị xoá cùng người chơi, phiên mới còn nguyên; migration chạy được cả khi không có `pg_cron`.
- [ ] **7.3 Cập nhật trang Quyền riêng tư.** Thêm vào `/privacy` mục về quiz: dữ liệu lưu (biệt danh, câu trả lời, điểm, thời gian), mục đích, ai xem được (chỉ giáo viên chủ phiên), thời hạn giữ 90 ngày, học sinh không cần tài khoản, giáo viên xoá được buổi chơi ngay; sửa câu "tên học sinh lưu ở đâu" cho khớp. Đặt lại `privacyReviewed` thành `false` cho tới khi chủ dự án duyệt nội dung mới. Kiểm tra: e2e trang privacy hiện đủ mục mới và biểu ngữ bản nháp.

## Acceptance criteria

- Chỉ chủ phiên xem được kết quả, số liệu khớp với điểm tính tay.
- Dữ liệu người chơi tự xoá sau 90 ngày, kể cả khi `pg_cron` không khả dụng.
- Trang Quyền riêng tư mô tả đúng dữ liệu quiz; chủ dự án phải duyệt lại.

## Risks

- `pg_cron` trên dự án thật có thể cần bật thủ công; có phương án xoá cơ hội nên không chặn, nhưng dữ liệu của giáo viên ít dùng có thể ở lại lâu hơn 90 ngày: ghi rõ trong README.
- Nội dung mới của Quyền riêng tư không phải tư vấn pháp lý; cần chủ dự án rà theo quy định hiện hành về dữ liệu của trẻ em.
