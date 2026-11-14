# Phase 07 — Kiểm chứng toàn hệ thống và hoàn thiện

## Overview

Đối chiếu production build với Decision Brief và mock đã duyệt, sửa defect
thật được quan sát và thu đủ evidence trước khi bàn giao. Không commit/push.

## Files

- Cập nhật khi có defect: các file thuộc Phase 01–06, không mở rộng nghiệp vụ.
- Cập nhật: `implementation-notes.md`
- Cập nhật test chỉ khi accessible contract/copy đã duyệt thực sự thay đổi; không nới assertion để che lỗi.

## Tasks

- [ ] Chạy app production và chụp after screenshots cùng route/state/viewports
  với baseline: 375px, 768px, 1280px. Đọc lại từng ảnh, đối chiếu silhouette,
  sheet stack, hierarchy, density, CTA và mobile composition với brief A+B+C.
- [ ] Kiểm mọi interactive state: default, hover, focus-visible, active,
  disabled, loading, error, success, empty và confirmation; keyboard-only và touch.
- [ ] Stress pointer trên Quiz Sheets: di nhanh, click tab/answer/CTA, rời/đổi tab,
  cuộn và resize; xác nhận transform reset, không stuck RAF, không console error.
- [ ] Bật reduced motion/reduced transparency/high contrast; xác nhận nội dung
  luôn hiện, rear sheets không focus và live canvas vẫn đặc/readable.
- [ ] Kiểm 320/375/768/1024/1280px, portrait/landscape, zoom 200%, không tràn
  ngang và không cắt text tiếng Việt hoặc tooltip.
- [ ] Rà diff: không thay `src/lib`, migration/env/secret; không import từ
  `cloneTemplate`; không thêm dependency; không đụng fixture người dùng.
- [ ] Chạy command matrix đầy đủ. Playwright phải chạy trên production build và
  đạt hai lượt liên tiếp; ghi số test/thời gian/kết quả thực vào notes.
- [ ] Chạy bundle scan và kiểm client bundle của landing không kéo Supabase quiz
  API hoặc dependency template ngoài providers vốn có.
- [ ] Chạy `git diff --check`, kiểm console/network và ghi mọi giới hạn còn lại.

## Command matrix

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run supabase:start`
5. `npm run supabase:env`
6. `npm run test:db`
7. `npm run test:e2e`
8. `npm run test:e2e` lần hai liên tiếp
9. `npm run scan:bundle`
10. `git diff --check`

## Acceptance criteria

- Tất cả tiêu chí trong plan mapping có evidence, không chỉ nhận xét chủ quan.
- Production UI thể hiện rõ mock kết hợp A+B+C; không còn khoảng cách lớn giữa
  hình duyệt và sản phẩm chạy thật.
- Full suite xanh hai lượt, console sạch, bundle scan sạch và không overflow.
- Không commit, push, deploy hoặc ghi dịch vụ ngoài trong phase này.

## Risks

- Nếu Supabase/Docker chưa sẵn sàng, ghi đúng blocker môi trường; không đánh dấu
  phase hoàn thành hoặc bỏ test DB/E2E.
- Không sửa business code để làm visual test xanh. Nếu test lộ lỗi nghiệp vụ có
  trước, tách chẩn đoán và xin hướng xử lý ngoài plan UI.
