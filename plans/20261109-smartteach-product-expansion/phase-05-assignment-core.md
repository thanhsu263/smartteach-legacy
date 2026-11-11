# Phase 05 — Assignment core và API giáo viên

## Overview

Tạo domain assignment do giáo viên sở hữu, snapshot quiz bất biến và lifecycle
draft/published/closed. Phase này chưa mở trust boundary cho học sinh.

## Files / areas

- Tạo migration `supabase/migrations/<timestamp>_assignments.sql`.
- Tạo `src/lib/assignments/types.ts`, `limits.ts`, `errors.ts`, `api.ts` và unit tests.
- Mở rộng helper snapshot nội bộ từ migration live nếu có thể reuse an toàn.
- Tạo `tests/db/assignments.test.ts`; cập nhật `tests/db/rls.test.ts`.

## Data/API contract

- `assignments`: owner, class, quiz nullable-on-delete, title, immutable snapshot,
  public code, schedule, reveal policy, status, timestamps/closed_at.
- Teacher RPC tối thiểu: create-from-quiz, update draft/schedule, publish, close,
  delete và list/detail. Tên SQL cuối theo convention snake_case hiện có.
- Create/publish snapshot là transaction và dùng validation `quiz_problems`;
  sửa/xóa quiz sau đó không đổi assignment.
- Giới hạn cần khóa trong migration và TypeScript: bounded assignments/teacher,
  snapshot ≤50 câu, title/description/code/schedule hợp lệ.

## Tasks

- [x] Viết migration additive; không sửa migration cũ đã chạy. Bảng/owner/class
  immutable, indexes cho owner/class/status/due/public-code và RLS deny default.
- [x] Chỉ giáo viên sở hữu class/quiz tạo hoặc mutate assignment; giáo viên khác
  và anon không đọc/ghi được bảng hoặc RPC teacher.
- [x] Định nghĩa state transition hợp lệ: draft chỉnh được; publish khóa snapshot;
  closed không mở lại trong MVP; delete là explicit destructive action.
- [x] Thêm opportunistic purge hook/điểm mở rộng cho 365 ngày sau `closed_at`;
  scheduled path hoàn thiện ở Phase 10.
- [x] Xây TypeScript adapter trả discriminated result và message tiếng Việt,
  không lộ lỗi SQL; validation client chỉ giúp sớm, DB là nguồn đúng.
- [x] Test transaction, duplicate/concurrency, ownership, invalid transition,
  quiz/class missing, snapshot sau sửa/xóa và resource limits.

## Acceptance criteria

- Teacher owner CRUD/lifecycle đúng; anon/teacher khác bị từ chối bằng 4xx hoặc
  zero rows theo convention, không 5xx cho lỗi nghiệp vụ.
- Create failure không để assignment/snapshot dở dang.
- Assignment published giữ nguyên title/questions/key sau khi quiz gốc sửa/xóa.
- List/detail bounded và ổn định theo thời gian/id; không N+1 qua câu hỏi/options.

## Verification

- Supabase local `db reset`: migration additive áp thành công.
- Unit `src/lib/assignments/api.test.ts`: **3/3 đạt**.
- DB `tests/db/assignments.test.ts`: **7/7 đạt**, gồm ownership/anon, atomic
  create failure, snapshot sau source edit/delete, lifecycle, list, concurrent
  limit 100 và purge 365 ngày.
- `npm run typecheck`, `npm run lint`, `git diff --check`: đạt.
- Schema audit xác nhận grants/RLS/search path/indexes của assignment. `db lint`
  chỉ còn finding baseline ngoài phase: `private.copy_quiz` dùng temporary table
  khi static analysis và ba warning biến vòng lặp ở live cũ; không có finding
  assignment mới.

## Safety

- Chỉ `supabase db reset`/test local trong build. `supabase db push` hoặc production
  migration cần người dùng yêu cầu riêng.
