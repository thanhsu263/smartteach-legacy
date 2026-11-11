# Phase 06 — Truy cập không tài khoản và attempt engine

## Overview

Mở trust boundary cho học sinh mà không tạo account. Roster credential xác định
học sinh; attempt token chỉ cấp quyền cho một assignment/student.

## Files / areas

- Tạo migration kế tiếp cho credential, attempts, answers, RPC và retention.
- Mở rộng `src/lib/assignments/**`; tạo storage/session helper nếu cần.
- `tests/db/assignment-attempts.test.ts`, RLS/security/concurrency tests.
- Có thể thêm `tests/load/assignment-load.test.ts` sau khi contract ổn định.

## Data/API contract

- `student_access_credentials`: một credential active/student, chỉ lưu digest +
  hint/version/timestamps; rotate/revoke teacher-only, raw secret trả đúng lúc tạo.
- `assignment_attempts`: assignment/student, token digest, status
  in_progress/submitted/invalidated, started/submitted/invalidated timestamps,
  score/correct/question totals và unique active attempt.
- `assignment_answers`: attempt/question position, answer, saved timestamp và
  grading result sau submit; key không lộ qua public select.
- Public RPC tối thiểu: exchange assignment code + roster credential, state,
  save answer, submit; teacher RPC: rotate/revoke credential, reset attempt,
  roster/progress/result detail.

## Tasks

- [x] Sinh credential bằng CSPRNG đủ entropy; raw value không lưu/log. QR dùng
  fragment nếu chứa secret, exchange xong `replaceState` để xóa khỏi URL.
- [x] Manual fallback dùng code dài đủ entropy và generic invalid response;
  không dùng PIN 6 số hoặc student name làm credential.
- [x] Exchange kiểm schedule/status/class relation rồi tạo hoặc trả attempt active
  an toàn khi retry; token attempt phạm vi hẹp và có expiry/revocation path.
- [x] Save answer upsert theo position, validate đúng kind/payload/size và cho
  resume; không cho sửa sau submit/close/due.
- [x] Submit khóa attempt, chấm toàn bộ snapshot trong transaction và idempotent;
  lời gọi đồng thời trả cùng kết quả, không double score/rows.
- [x] Chỉ trả key/result theo reveal policy; state trước release chỉ có question,
  own answer và progress tối thiểu.
- [x] Reset invalidates attempt hiện tại, không xóa audit ngay; lượt mới được tạo
  ở lần exchange kế tiếp. Rotate/revoke credential chặn token mới nhưng không
  vô tình sửa attempt đã submit.
- [x] Purge attempt/answer/token phạm vi assignment tối đa 365 ngày sau close;
  credential roster chỉ mất khi rotate/revoke hoặc student/class bị xóa. Class
  hoặc teacher delete có cascade rõ và test data orphan.

## Acceptance criteria

- Học sinh không account có thể vào, refresh/resume, save và submit; không đọc
  assignment/student/attempt khác.
- Secret/key không xuất hiện trong table grants, public payload, query/referrer,
  log, error hoặc client bundle.
- Retry/concurrency không tạo hai active attempts hay hai submission.
- Expired/closed/revoked/invalid credential có message an toàn và recovery path.
- Teacher progress/result chỉ trả dữ liệu của class/assignment sở hữu.

## Verification

- DB tests cho success, malformed input, ownership, token wrong/revoked/expired,
  pre/post due, reveal policy, rotate/reset, concurrent exchange/save/submit,
  cascade và retention boundary 364/366 ngày.
- Unit tests cho storage/URL-fragment cleanup và error mapping.
- Load probe lớp điển hình 40 học sinh lưu/nộp đồng thời; đo RPC error/latency,
  chỉ thêm index/tối ưu nếu evidence yêu cầu.
- Static security audit và `npm run scan:bundle` sau client adapter.

## Risks

- Bearer credential không chống chia sẻ tuyệt đối; UX phải nói rõ giáo viên có
  thể rotate/revoke và không gọi đây là danh tính mạnh.
- Không lưu IP hoặc fingerprint học sinh để rate-limit; bảo vệ dựa trên entropy,
  bounds, generic errors và operational monitoring phù hợp kiến trúc hiện tại.
