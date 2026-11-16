# Phase 5 — Soạn đề Free có phần, điểm và thời lượng

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC20,23,30 và nháp AC8. Phụ thuộc adapter P2, chưa cần online/AI.

## Files

Hiện có: src/lib/quiz/{types,limits,validate}.ts; src/lib/assignments/types.ts; src/components/quiz/question-form.tsx; TeacherShell, RequireUser, Button, WorkspaceFeedback; protected-paths/proxy.
Mới: migration *_exam_documents.sql; src/lib/exams/{types,limits,validation,api}.ts + tests; src/app/my-exams/{layout,page}.tsx, new/page.tsx, [id]/page.tsx, import/page.tsx; APIs exams theo contracts; components/exams/{exam-list,exam-editor,exam-question-form}.tsx + module.css; tests/db/exams.test.ts; e2e/exam-editor.spec.ts.

## Tasks

- [x] **P5.1 Document/CRUD có quyền và revision.** Xây schema/index/RLS owner-active và bounded JSON document contracts§5; validators draft vs publish/export, issue path section/question/field. Tái sử dụng type/validation question phù hợp nhưng không đưa TimeLimit/game scoring vào đề. Save draft có field chưa đầy đủ dùng null/empty hợp lệ, vẫn bounds cấu trúc; missing key không tự hóa đáp án đúng. CRUD optimistic revision+create requestId, list pagination, delete không mất snapshot của bài đã giao. Free CRUD được cả HTTP/RPC, admin không đọc private teacher khác.
  - Verify: DB Free/Premium/A/B/admin/blocked/anon và direct tables/RPC, atomic count50 dưới race, stale revision409, duplicate create, invalid types/weights/bounds, incomplete draft save vs publish blocker. Unit và SQL chạy cùng fixture4kind và pointUnits.
- [x] **P5.2 Editor/list và nháp.** Entry “Đề kiểm tra” trong TeacherShell; danh sách empty/create/delete/rename, editor sections/reorder bằng nút,4kind/options/accepted answers, points2decimal, duration1–180, total. Lưu tài khoản rõ với local draft riêng; dùng adapter entity=exam, ID tạm ổn định cho /new để reload trước server create vẫn recover, chuyển key sau create atomic. Conflict không overwrite, form Save failure giữ nội dung. Có Preview và actions Import/Export/Phát hành, action chưa triển khai phase sau không giả hoạt động.
  - Verify: Free tạo/sửa/save/reload,10sections/50questions, title dài/Việt/2decimal và bounds, new draft restore, changing question loại không lẫn answers; UI desktop3panel/tablet tabs/mobile1column; sidebar768 có nhãn và không overflow. Đối chiếu Figma36:39819/36:40301, giải thích khác20s/1000points/autosave. Các màn đề mới chưa có frame riêng phải ghi trong evidence.

## Done

Có đề nguồn có thể lưu/sửa trên account Free; exam khác live quiz. Không thay cấu trúc/giới hạn/tính phí quiz hiện có, không thêm ngân hàng câu hỏi/copy features chỉ vì mock có icon.
