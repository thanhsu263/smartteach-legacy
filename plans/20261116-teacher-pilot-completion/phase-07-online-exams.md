# Phase 7 — Kiểm tra online có thời hạn và điểm từng câu

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC23,26–28,17. Phụ thuộc5; cần3 để nối CSV.

## Files

Hiện có: migrations assignment/attempt/analytics/membership; src/lib/assignments/{api,types,errors}.ts; components/assignments/{assignment-compose,assignment-detail,student-assignment-runner}.tsx; /learn và /assignments routes; tests/db/{assignments,assignment-attempts,membership}.test.ts; e2e/assignments.spec.ts.
Mới: migration *_exam_assignments.sql, *_exam_finalization_schedule.sql; lib/exams/scoring fixtures/tests; tests/db/online-exams.test.ts; e2e/online-exams.spec.ts. Không sửa migration cũ để nhận schema sạch giả.

## Tasks

- [x] **P7.1 Versioned snapshot, scoring và clock DB.** Additive columns/DTO contracts§7; create_exam_assignment atomic Premium+owner exam/class+revision; publish kiểm lại, immutable snapshot từ tạo, xóa source vẫn giữ. Finalizer dùng integer pointUnits + existing correctness rules; manual/expiry/teacher close đồng nhất idempotent. Deadline tách tokenexpiry, renewal không gia hạn; save recheck clock/locks sau chờ transaction. Cron SQL bounded100/minute + heartbeat, opportunistic state/save/submit có finalizer để deadline chính xác khi Cron chậm; không phụ thuộc traffic cho eventual grade. Preserve v1 paths/guards/grants/indexes/token behavior.
  - Verify: DB legacy fixture trước migration → migration → mọi kết quả cũ không đổi; newv2 weighted0.25/0.5/1.75,4kind/case/NFC/bỏdấu/exact multi; deadline min duration/due/close; submitted doubleclick+Cron, save-at-boundary race/lock delay, renewal/changed computer clock, reset/revoke, Premium hết hạn trong attempt, non-Premium direct create/publish. Cron finalize khi không có HTTP; Cron off vẫn không save quá hạn. after_close không lộ điểm trước close.
- [x] **P7.2 Teacher/student UI, DTO và CSV.** Phát hành từ đề hoặc chọn source ở compose, mốc mở/hạn nộp/reveal policy và class. V2 có whole-examtimer, autosave state/error/pending, kết nối lại/reload không tăng giờ; countdown dùng serverNow/deadline, tabbackground/focus resync. Hết giờ khóa input tức thì, hiển thị chỉ câu đã lưu được tính; offline answers chưa commit không báo đã lưu hoặc gửi ngược quá hạn. Submit chờ save thành công trước, fail có lựa chọn retry trong hạn; finish/released receipt không lộ key. Teacher roster/attemptdetail và CSV dùng scorePoints/maxPoints riêng correct/total; legacy UI vẫn hiển thị counts đúng. Student chưa bắt đầu không fake0.
  - Verify: production browser375/1280, vào bằng mã riêng, reload/offline/reconnect, giảDate.now không tăng deadline, timer hết khi tabđóng, manual close; đọc network/DOM student không key; Free upsell nhưng owner đọc/đóng/export sau expiry; CSV decimal/empty statuses, attempt-detail không còn score/total sai đơn vị. Membership/create assignments regression.

## Done

Publish không chỉ là tạo URL; cần một lượt thực sự lưu/chốt/chấm/read kết quả đúng. Không thêm anti-cheat, webcam, shuffle hoặc policy partial credit ngoài brief.
