# Phase 05 · Kiểm chứng tích hợp

Bắt đầu sau khi L1–L4, S1–S4 và W1–W4 có kết quả cục bộ. Chạy trên production build, dùng cấu hình `playwright.config.ts` với port mặc định 3100 hoặc `PLAYWRIGHT_PORT` nếu cần. `reducedMotion: "reduce"` là mặc định. Chỉ test hành vi motion chủ động đặt `no-preference`, và set rõ cho context tự tạo bằng `browser.newContext()` khi test touch hoặc fullscreen. Supabase local là dependency của các luồng auth/data/live. Dùng test fixture và cleanup sẵn có trong `e2e/helpers/live.ts`. Khi thiếu local env thì báo các ca skip và bổ sung evidence trước khi đóng phase.

## V1 · Responsive, bàn phím, touch và axe

| Viewport | Evidence cần lưu và kiểm |
| --- | --- |
| 320 × 700 | Landing copy, hero tĩnh, CTA và menu mở. Shell drawer và vùng chạm. Kiểm tràn ở trang và clipping ở nội dung/heading/CTA. |
| 375 × 812 | Landing tap menu/anchor và Escape. Drawer, dashboard, form quiz/lớp, kho học liệu/game/tiện ích. Kiểm loading, empty và lỗi đại diện. |
| 768 × 900 | Tablet touch, landing, sidebar có nhãn, dashboard, quiz editor, timer và whiteboard. Kiểm mục active, không tràn vùng làm việc và không cắt số. |
| 1280 × 800 | Landing nghỉ, hero đang hover, sticky hiện/ẩn và scrollspy. Shell mở, rail, mở tạm, dialog, save pending/error/success. Kho game/học liệu và đồng hồ. |
| 1280 × 420 và 1280 × 720 | Shell chiều cao thấp, cuộn độc lập và focus. Màn trình chiếu timer/host/player, chữ và hit target ổn định. |

Lưu ảnh qua `testInfo.outputPath()` hoặc evidence của build. `e2e/phase-02-visual.spec.ts`, `phase-03-visual.spec.ts`, `phase-04-visual.spec.ts` đang chụp evidence, không có baseline pixel diff. Giữ các ca hồi quy đó. Bổ sung ảnh mới ngay ở spec sở hữu state, chỉ so bố cục/ngữ nghĩa và kiểm bounding box khi cần. Dùng vị trí hover xác định cho ảnh động, font sẵn sàng, fixture ổn định và tắt animation khi chụp ảnh baseline tĩnh.

Axe tái dùng `a11y.spec.ts`, `a11y-auth.spec.ts`, `dashboard.spec.ts`, `library.spec.ts`, `host-a11y.spec.ts` và `play-a11y.spec.ts`. Kiểm landing menu mở, shell desktop/tablet/drawer, dialog nghiệp vụ, feedback lỗi và trạng thái timer. Giữ tags A/AA sẵn có, thêm `wcag22aa` ở ca mới khi axe hỗ trợ. Kiểm tay Tab/Shift+Tab, focus không bị sticky/overlay che, tooltip hoverable/dismissible, status được đọc một lần, tương phản vật liệu, zoom 200% và target 44 px theo chuẩn nội bộ. Axe hỗ trợ một phần kiểm chứng. Kết luận cho các ca đã kiểm dựa trên cả hành vi và quan sát. [WCAG 2.2 về focus](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum), [nội dung hover/focus](https://www.w3.org/TR/WCAG22/#content-on-hover-or-focus), [pause/stop/hide](https://www.w3.org/TR/WCAG22/#pause-stop-hide).

**Nghiệm thu V1.** Ma trận ảnh có đủ 320/375/768/1280, các control và nội dung chính không tràn/cắt và các ca axe/keyboard/touch đã nêu đạt. Ghi viewport/input mode và state cho từng ảnh. Ở màn máy chiếu giả lập, xem độ đọc ở 1280 × 720 và ghi rõ điều kiện đo.

## V2 · Reduced motion, fallback và lifecycle

Chạy `no-preference` và `reduce` cho hero, header, sidebar và một luồng lưu. Ở `reduce`, hình và wash tĩnh, header giữ hiện, hash nhảy đúng offset, overlay/feedback cập nhật ngay. Test đi khỏi `/` rồi quay lại, resize qua breakpoint, chuyển media trong khi tương tác, vào thẳng URL có fragment và fallback khi JS tắt trên landing. Theo dõi `pageerror` và console hydration. Kiểm cùng URL bằng mouse và touch context để phát hiện sticky hover. Giữ nội dung, dữ liệu và quyền sẵn có trong mọi chế độ.

**Nghiệm thu V2.** So endpoint hữu hình của hành vi, focus và URL bằng `expect.poll`/web-first assertions. Đợi đúng response/clock hoặc trạng thái, tránh `waitForTimeout`, số frame cố định và so easing theo pixel. Chạy riêng nhóm motion hai lượt trên cùng server build mới để phát hiện flaky test. Lưu exit code và counts của từng lượt.

## V3 · Hiệu năng và bundle

- Dùng cùng phiên bản Node/browser, fixture, màn hình và cấu hình CPU giữa hai lần đo. Build/start production trước (Phase 01) và sau (Phase 05). Đo first-load trong browser context mới, cache tắt, đợi UI ổn định và chưa hover/focus link. Thu request same-origin `/_next/static` tải bởi route, dedupe URL, đọc byte của file JS/CSS tương ứng trong `.next/static`, báo tổng raw và gzip theo route. Đo `/`, `/tools/countdown` và `/play` làm control. Đo `/dashboard` với fixture nếu boundary chung thay đổi. So package/lock và kiểm scope chunk tải theo route.
- Ngân sách nghiệm thu đề xuất cho bản build đầu là JS gzip first-load tăng tối đa 8 KiB ở `/`, 4 KiB ở route teacher shell và 4 KiB ở `/play` cho phần chrome dùng chung. `app-chrome.tsx` đang import `TeacherShell` tĩnh nên `/play` có thể nhận chunk dùng chung, nhưng shell không mount hay đăng ký listener ở đây. Client island landing chỉ tải ở landing. Nếu vượt, thu nhỏ boundary/listener hoặc bỏ phần JS dư rồi đo lại. `npm run scan:bundle` sau `npm run build` kiểm lộ secret, việc đo byte dùng probe riêng.
- Ghi ba trace ngắn với cùng cấu hình, gồm load/idle, hover hero, cuộn đổi hướng/anchor và mở tạm sidebar. Xem Event/Animation Frame, Style/Layout, paint, long task và Layout Shift. Yêu cầu phần mới không gây task >50 ms trong các tương tác đo, không thêm shift tự phát khi header ẩn/hiện hoặc sidebar mở tạm. Khi ghim/thu sidebar, workspace chỉ cập nhật hình học một lần do hành động rõ ràng. Đối chiếu baseline, dùng bounding box và attribution thay vì quy mọi task của cả trang cho motion. Sau khi hero rời viewport, tắt media hoặc rời route, không còn callback theo frame hay animation hero đang chạy. Check không có cập nhật React theo frame trong hero, listener landing được hủy và selector không làm repaint cả màn hình.

**Nghiệm thu V3.** Lưu bảng raw/gzip trước–sau và trace ghi rõ điều kiện. Đạt ngân sách hoặc sửa cho đạt trước khi đóng. Kiểm không có `package.json`/lockfile thay đổi và bundle scan local pass. Rà tài nguyên khi tắt JS/animation để bảo đảm không mất nội dung.

## V4 · Hồi quy và bàn giao

- Chạy `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run scan:bundle` và `git diff --check`. Chạy Playwright theo danh sách từng phase. Chạy thêm `e2e/live.spec.ts`, `e2e/assignments.spec.ts`, `e2e/security.spec.ts` để giữ luồng live, assignment và truy cập đã có. Rà `e2e/phase-02-visual.spec.ts`, `phase-03-visual.spec.ts`, `phase-04-visual.spec.ts` trên cùng build. Chạy `npm run test:e2e` hoặc shard khi fixture Supabase local và thời gian chạy phù hợp. Lưu tổng pass/fail/skip và exit code, kể cả khi runner bị ngắt.
- So diff với baseline theo phạm vi file, giữ routes, schema, API, quyền, auth, locale, toàn bộ nghiệp vụ quiz/lớp/assignment và data fixtures. Rà CTA/link landing dẫn đúng bề mặt đang chạy. Xác nhận `app-chrome.tsx` giữ phân tuyến hiện có, global `AmbientBackground` vẫn tĩnh và CSS opt-in không chạm vùng host/player/iframe/canvas.

**Nghiệm thu V4.** Bằng chứng theo D/L/S/W/V nằm trong `implementation-notes.md` do `hs-build` ghi. Các ca regression bắt buộc chạy qua thực tế, các lỗi, skip và giới hạn thiết bị được ghi rõ. Review diff so với trạng thái workspace đầu vào trước khi hoàn tất phase.
