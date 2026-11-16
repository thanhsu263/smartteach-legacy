# Phase 9 — Nghiệm thu và chuẩn bị dùng thử online

Local core verified và runbook đã có; online/pilot acceptance còn mở. Xem [verification.md](./verification.md). AC16–19 và regression toàn bộ. Phụ thuộc1–8; tách local verified và online accepted.

## Tasks

- [ ] **P9.1 Gate local và review toàn candidate.** Thu diff baseline (165 thay đổi trước planning; số thực khi build có thể khác), giữ phạm vi sở hữu nhưng review candidate thực gồm admin/RAG/membership liên quan. Chạy unit/typecheck/lint/build/bundle scan, DB và E2E theo rủi ro; fixtures2 teacher+admin, Free/Premium/blocked, legacy trước nâng cấp. Đối chiếu6 node Figma và các màn chưa có mẫu, ảnh375/768/1280, keyboard/axe/reduced motion; không dùng ảnh Figma thay quyền/nghiệp vụ.
  - Evidence: lệnh/exit code/log/exclusions; import/export4 format, QA Word/PDF, Cron/Auth canaries, weighted score/deadline, CSV, feedback, draft/logout. Không dùng số pass của plan cũ hoặc mock làm kết quả thật. Review qua hs-code-review sau build khi phù hợp, không tự spawn agent.
- [ ] **P9.2 Preflight online và release handoff.** Tạo bảng deployed SHA/build/env names (không secret values), Supabase project/migration history, schema/RLS/function versions, buckets, Cron/Vault/worker secrets/heartbeats, Auth SiteURL/allowlist/template/password policy, SMTP gửi được tới nhóm thử, AI model/quota. Kiểm tracing/font/PDF worker trên runtime host. Chuẩn bị backup/restore và rollback commit/schema additive; thứ tự expandDB→app tương thích→enable feature. Không drop dữ liệu mới để rollback.
  - Read-only trước; không đủ quyền đối chiếu thì ghi UNVERIFIED, không tự đăng nhập production bằng tài khoản local. Không supabase config push, reset DB hoặc chép dữ liệu local đè online.
  - Chuẩn bị candidate cụ thể, thao tác/target/tác động/recovery trước xin authorization cho remote migrations/config/secrets/SMTP/role grant/deploy/push. Sau được phép mới thực thi và smoke website đích: login/recovery email thật, owner authoring/import/export, Premium phát hành→student nộp→CSV, feedback admin, AI job/Cron. Kiểm không lộ dữ liệu riêng. Chưa có phép/cấu hình thì giữ online pending, không bỏ gate để báo hoàn thành.
- [ ] **P9.3 Kịch bản 2–3 giáo viên và phản hồi.** Checklist: truy cập/khôi phục→tạo nháp→reload→nhập đề→sửa→xuất Word/PDF→kiểm tra online đúng gói→làm/nộp→CSV→góp ý. Premium thử dùng cơ chế admin hiện có chỉ khi được phép trên đúng môi trường, không kích hoạt payOS. Dùng dữ liệu giả/được phép, ghi bước vướng và mức ảnh hưởng qua feature góp ý. Không tự gửi tin/email mời ngoài recovery smoke đã cho phép.
  - Evidence: phản hồi thật và lỗi đã triage/retest; chưa có người dùng thì chỉ “sẵn sàng dùng thử”, không “pilot đã nghiệm thu”. Cập nhật hướng dẫn/membership CTA/RAG guides khi behavior đã implemented/reviewed; không tự rewrite PRODUCT.md/DESIGN.md. Nếu sửa corpus RAG, phân biệt tài liệu local và publish nguồn thật cần phép.

## Completion và recovery

hs-build có thể hoàn thành code/local evidence rồi handoff online pending với danh sách việc chủ dự án cần làm. Mục tiêu dùng thử thật chỉ hoàn thành sau live smoke và vòng giáo viên. Cron/SMTP lỗi phải có hướng xử lý, không dùng client fallback giả để che dependency.

Artifacts: implementation-notes.md và artifacts/teacher-pilot/, chỉ fixture/metadata an toàn. Không gom token/email/mật khẩu hoặc nội dung riêng thật vào repo.
