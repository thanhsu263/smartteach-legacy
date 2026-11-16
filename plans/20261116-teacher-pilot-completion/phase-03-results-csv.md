# Phase 3 — Xuất kết quả CSV theo từng buổi/bài

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC9–12; hoàn thiện mapping v2 ở P7.2.

## Files

Hiện có: src/lib/live/{results,rpc}.ts; src/components/live/results/results-screen.tsx; src/lib/assignments/{api,types}.ts; src/components/assignments/assignment-detail.tsx; tests/db/assignment-attempts.test.ts; e2e/assignments.spec.ts.
Mới: src/lib/export/{csv,results-csv}.ts + tests; e2e/results-export.spec.ts.

## Tasks

- [x] **P3.1 Serializer an toàn và CSV quiz.** UTF8 BOM/CRLF, escaping, sanitize typed cells và tên file theo contracts§4. Export owner-authorized live results mới nhất của session ended; preserve removed/left/rank/points game. UI có empty/busy/error; tải Blob URL và revoke sau dùng.
  - Verify: dấu Việt, quote/comma/newline, nickname =HYPERLINK, tab/space/control prefix, filename path separators; parse lại đúng số cột/hàng. Owner kết thúc tải được, chưa kết thúc bị server từ chối.
- [x] **P3.2 CSV roster bài giao và auth matrix.** Đọc full roster từ RPC owner, không export chỉ page đang hiển thị. Phân biệt null/not_started/in_progress/invalidated/submitted, correct/count khác điểm; legacy score không tự làm weighted score. Không token/credential/publicCode/key trong payload/file. Tích hợp P7 sau khi fields v2 có.
  - Verify: teacherA/B/admin/anon gọi RPC và thử export đúng quyền; roster100student và không bỏ hàng; pending score để trống; timeout không tạo file rỗng như thành công; retention/permission không mở rộng. E2E download parse contents so với DB fixture, không chỉ nút download có.

## Done

Không thêm endpoint service role hoặc XLSX. Document ngày/timezone và cột có nghĩa rõ; không hứa CSV tải về còn được thu hồi.
