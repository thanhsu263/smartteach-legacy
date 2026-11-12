# Phase 08 — Kho học liệu và kiểm duyệt ở backend

## Overview

Tạo curated public library từ snapshot quiz. Giáo viên gửi duyệt; chỉ nội dung
approved mới browse/preview/clone được.

## Files / areas

- Tạo migration `supabase/migrations/<timestamp>_quiz_publications.sql`.
- Tạo `src/lib/library/types.ts`, `limits.ts`, `errors.ts`, `api.ts` và unit tests.
- Tạo `tests/db/library.test.ts`, mở rộng RLS/security tests.
- Reuse `SUBJECTS`, `GRADES`, text normalization contract khi phù hợp.

## Data/API contract

- `quiz_publications`: owner/quiz nullable, immutable snapshot, title/description,
  subject, grades, moderation status, published/submitted/reviewed/hidden dates.
- `publication_reports`: publication, reporter teacher, reason/note bounded,
  unique report/reporter; anon reporting nằm ngoài MVP.
- Teacher RPC: submit/update-before-review/withdraw/resubmit own publication.
- Public RPC: paginated browse/search/filter and safe preview; authenticated
  clone; approved-only at every path.
- Moderator boundary: approve/reject/hide with reason, callable only bằng
  service-role/moderator context; không đưa service secret hoặc admin action vào UI.

## Tasks

- [x] Snapshot transaction từ quiz hợp lệ; publication không đổi khi quiz gốc
  sửa/xóa và không lộ answer key qua browse/preview.
- [x] State transition rõ: draft/pending → approved/rejected; approved → hidden;
  owner withdraw; resubmit tạo review mới hoặc version mới theo audit đã định.
- [x] RLS/grants deny default; owner chỉ thấy/mutate của mình trong state cho
  phép; anon chỉ gọi public approved RPC.
- [x] Browse trả metadata bounded, deterministic cursor/page và total/has-more
  nếu cần; query/filter validate subject/grade/search length/page size.
- [x] Preview trả public question text/options nhưng không accepted answers/
  `is_correct`; clone server-side kiểm approved rồi tạo quiz/câu/options atomically.
- [x] Report chỉ từ authenticated teacher, generic success khi gọi lặp, reason
  enum/note bounded; moderator hide lập tức loại khỏi browse/preview/clone mới.
- [x] Index search/filter/order dựa trên query thật; dùng EXPLAIN/load probe trước
  khi thêm extension/caching ngoài convention.

## Acceptance criteria

- Pending/rejected/hidden/private không bao giờ xuất hiện qua public RPC.
- Approve/hide không gọi được bằng anon hoặc authenticated teacher thường.
- Preview không chứa key; clone tạo bản độc lập đủ bốn dạng câu và thuộc caller.
- Search/filter/pagination ổn định, giới hạn payload và xử lý query tiếng Việt.
- Sửa/xóa quiz gốc không đổi publication approved/clone sau đó.

## Verification

- DB tests cho state transitions, owner/moderator/public permissions, snapshot,
  preview leakage, clone atomicity/limits, reports và concurrent submit/review.
- Unit tests cho query normalization, filter validation, error mapping.
- Query plan/load sample ở dataset đủ lớn để chứng minh bounded response; không
  tối ưu giả định.
- `npm run typecheck`, `npm run lint`, `npm run scan:bundle`.

## Safety

- Service role chỉ ở local DB tests/controlled server operation; không tạo
  browser admin client hoặc lưu key trong script/config được commit.
- Bật public browse production là release action riêng sau khi moderation path
  và privacy được duyệt; plan không cấp quyền deploy.

## Verification — 2026-11-12

- `npx supabase db reset` đã áp migration `20261112100000_quiz_publications.sql`.
- DB library: **5/5 đạt** — moderation boundary, approved-only browse/preview,
  answer-key leakage, clone snapshot, report idempotency và owner resubmit.
- `EXPLAIN` trên browse approved theo subject/grade có `LIMIT 24` dùng
  `quiz_publications_browse_idx`; chưa cần extension/cache ở dataset local.
- Unit library **2/2**, `typecheck`, `lint`, `scan:bundle`, `diff --check`: đạt.

## Kết luận

- Phase 08 hoàn thành trên local. Phase 09 mới được phép dùng các RPC này để
  xây bề mặt thư viện; không có UI moderation hoặc service secret ở client.
