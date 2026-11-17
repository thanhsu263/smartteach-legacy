Mode: local
Status: approved 2026-11-17 (Q1 theo Figma; Q2–Q4 theo đề xuất) — đang thực thi
Created: 2026-11-17
Base: main @ 3e6ed37
Tiếp nối: [plans/20261116-ui-unification](../20261116-ui-unification/plan.md) (đã commit ở fd0d094, b33e7d5)

# Đưa app SmartTeach về đúng ngôn ngữ thiết kế Figma + shell admin riêng

## 1. Hiện trạng đã kiểm (17/11)

| Phát hiện | Bằng chứng | Hệ quả |
|---|---|---|
| Admin **đã có shell riêng**, không dùng teacher shell | `src/components/admin/admin-shell.tsx`, `app-chrome.tsx` trả `null` cho `/admin/*` | Việc 1 là **làm lại** shell admin, không phải tách khỏi teacher shell |
| Shell admin chỉ là bản tạm | `artifacts/ui-unification/after/admin-*.png`: link gạch chân, không icon, không topbar/tài khoản; mobile nav cuộn ngang; không có nhóm | Dựng lại theo cấu trúc ST/Shell (34:3800) |
| Màn admin dùng control native | admin-rag-documents: `<select multiple>` thô, `input[type=file]` mặc định, trạng thái thô `succeeded`, 3 nút ghost/hàng | Cần Field/Select/FileDrop/StatusBadge/Table chuẩn |
| Đợt 16/11 chốt **giữ glass, nút 44px bo 12**, chỉ đồng bộ bố cục | brainstorm-2026-11-16 §Hướng 1; `button.module.css` | Yêu cầu lần này ("token, component") **đảo** quyết định đó → cần chủ dự án chốt (Q1) |
| Nút phụ trong app là “viên kính trắng” (Quản lý, Chơi ngay, Soạn đề online) | admin-users, teacher-26, teacher-14 | Khác Figma Button Secondary/Ghost |
| Topbar giáo viên: email thô + “Thoát”; Figma: tìm kiếm, chuông, nút “Tài khoản” | teacher-0 vs Figma 34:3800 | Không thêm search/chuông (không có hành vi); gom email/bảo mật/thoát vào nút Tài khoản (Q2) |
| Mục phụ sidebar (Gói thành viên, Góp ý, Bảo mật, Quản trị) là hộp viền, bị cắt | teacher-0, teacher-14 | Đổi về Navigation Item 34:4120 nhóm “Tài khoản” |
| `/host` (trang giáo viên) vẫn dùng SiteHeader cũ: nav 9 mục xuống dòng, trùng “Kho học liệu”, hero gradient | teacher-26 | Chuyển `/host` vào teacher shell (Q3); `/host/[id]` + results giữ canvas |
| `/learn`, `/play`, `/privacy`, auth phụ dùng SiteHeader + footer | route-matrix | Header tập trung tối giản theo Foundations cho học sinh/công khai |
| Figma chỉ có 2 trang: Foundations (27:2) và Teacher Desktop (34:4060), không có admin/học sinh | figma inventory 16/11 | Admin + học sinh = mở rộng từ component Foundations |
| Token màu/khoảng cách/chữ code đã khớp Figma | `globals.css`: #2259ED, #F0F5FF, Be Vietnam Pro, thang space 4–56 | Không đổi `:root` màu; chỉ thêm token component (control-h 48, radius-control 8) |

Giới hạn khảo sát: phiên này không có Figma MCP; Figma xem được qua trình duyệt (view-only) nhưng cửa sổ bị thu nhỏ nên chỉ chụp được shell 34:3800. P0 phải chụp lại đủ frame trước khi code.

## 2. Quyết định cần chủ dự án chốt

- **Q1 — Vật liệu component trong app (trừ landing).**
  Đề xuất: theo Figma. Nút 48px bo 8 có 4 biến thể Primary đặc / Secondary viền / Ghost / Danger. Input, Select, Textarea 48px bo 8, viền 1px. Card trắng đặc bo 12/16, viền nhạt. Glass chỉ giữ cho lớp nổi (topbar dính, menu, dialog, drawer, popup chat) và giữ motion hiện có. Landing không đổi.
  Phương án còn lại: giữ glass như quyết định 16/11, chỉ sửa bố cục và các control native. Phương án này nhẹ hơn nhưng không đạt "đúng token/component".
- **Q2 — Topbar.** Đề xuất: không thêm ô tìm kiếm hay chuông (không có hành vi thật). Thay "email + Thoát" bằng nút "Tài khoản" mở menu gồm email, Bảo mật tài khoản, Gói thành viên, Thoát. Chỉ đổi cách bày, hành vi giữ nguyên.
- **Q3 — `/host` (danh sách buổi chơi).** Đề xuất: chuyển vào teacher shell, bỏ hero gradient, dùng PageHeader. `/host/[id]` và trang kết quả vẫn full-canvas.
- **Q4 — Nhận diện admin.** Đề xuất: dùng cùng cấu trúc ST/Shell nhưng sidebar nền navy `#142B50` (màu header board Foundations), có nhãn "Quản trị". 11 mục chia thành các nhóm:
  - Tổng quan.
  - Người dùng: Tài khoản, Thành viên/đơn, Góp ý.
  - Nội dung: Duyệt học liệu, Danh mục game, Tài liệu RAG.
  - Hệ thống: AI/API, Cấu hình website, Vận hành, Nhật ký.

  Cuối sidebar có "Về không gian dạy học". Phương án còn lại: sidebar trắng giống giáo viên, chỉ thêm nhãn "Quản trị".

## 3. Phạm vi

Trong phạm vi gồm 49 route app (danh sách theo [route-matrix 16/11](../20261116-ui-unification/route-matrix.md)), not-found, popup chat, dialog/drawer/toast và các trạng thái loading/empty/error.

Ngoài phạm vi:
- Landing `/` và các component/style riêng của nó.
- Nghiệp vụ, API, RPC, RLS, migration.
- payOS, Gemini thật.
- Sửa Figma, `PRODUCT.md`/`DESIGN.md`.
- Push/deploy.

Không thêm tính năng chỉ vì mockup có: search, notification, autosave, điểm/câu.

Bất biến hành vi: payload, form ownership, draft/dirty guard, realtime, đồng hồ, quyền Free/Premium/admin, điều kiện hiển thị chat. Đổi nhãn hiển thị (ví dụ `succeeded` → "Đã nạp") chỉ là map ở UI; giá trị gửi lên server giữ nguyên.

## 4. Phases

| Phase | Nội dung | Kết quả kiểm chứng | Phụ thuộc |
|---|---|---|---|
| P0 | **Baseline & Figma context.** Đọc guide Next đã cài (`01-app/01-getting-started/11-css.md`, layouts). Chụp **trước**: 49 route × 375/768/1280 → `artifacts/ui-figma-2026-11-17/before/`. Chụp frame Figma: Foundations 27:17075–27:19506, shell 34:3800/3894/4120, login 34:4649/4769, classes, quiz list/editor/import, tools → `…/figma/`. Ghi spec component (kích thước, padding, màu trạng thái) vào `figma-spec.md` | Đủ ảnh, đã xem; spec đủ cho P1 | — |
| P1 | **Primitives theo Foundations, chỉ trong app.** Thêm token component (`--control-h:48px`, `--radius-control:8px`…) dưới scope app (`[data-app-surface]`), không sửa `:root` landing dùng. Button: biến thể primary/secondary/ghost/danger theo Figma, kể cả trạng thái hover/focus/pressed/disabled/loading (tuỳ Q1). Mới trong `src/components/ui/`: `Field` (label/help/error có aria), `Select`, `Textarea`, `FileDrop` (bọc input file thật), `Card`, `DataTable` (cuộn ngang cục bộ, bản card trên mobile), `StatusBadge`, `Tabs`, `EmptyState`, `PageHeader`. Tái dùng `WorkspaceLayout`, `Breadcrumb`, `WorkspaceFeedback` | Landing pixel-diff = 0 (`ui-unification-landing.spec.ts`); axe component; tsc/eslint | P0 |
| P2 | **Shell admin mới.** `admin-shell.tsx` viết lại theo ST/Shell: sidebar 240 có icon và nhóm (Q4), thu gọn/peek như teacher, tablet 720–959 giữ nhãn, mobile < 720 mở drawer `<dialog>`. Topbar gồm breadcrumb và nút Tài khoản (email, Về không gian dạy học, Thoát). `RequireAdmin`: trạng thái "Không có quyền" và "Chưa thể kiểm tra" dùng EmptyState, fallback Suspense dùng skeleton. Không đổi logic `RequireAdmin` | Mọi `/admin/*` render trong shell; bàn phím/focus return/Escape; 375/768/1280; e2e mới `admin-shell.spec.ts` | P1 |
| P3 | **11 màn admin.** Overview: stat card và panel đơn. Users: thanh lọc + DataTable + dialog quản lý. AI/API: form theo Field, key chỉ hiện dạng che. RAG: form gồm FileDrop, chọn khối lớp dạng checkbox-chip thay cho `select multiple` (cùng giá trị gửi), quota hiển thị bằng Progress, bảng có StatusBadge và menu thao tác. Library/Games/Memberships/Settings/Audit/Operations/Feedback: dùng DataTable/Field/StatusBadge/EmptyState | `admin-rag.spec.ts`, e2e admin còn lại, axe; ảnh sau | P2 |
| P4 | **Teacher shell theo 34:3800/34:4120.** Nhóm mục phụ thành Navigation Item, nút Tài khoản (Q2), “Hướng dẫn sử dụng”, thu gọn ở đáy sidebar như Figma (chỉ khi có đích thật, nếu không thì bỏ). `/host` vào shell (Q3) | `teacher-sidebar.spec.ts`, `pilot-hydration.spec.ts`, auth flash | P1 |
| P5 | **Trang giáo viên.** Dashboard, lớp, quiz (list/editor/import), đề kiểm tra (list/editor/import), bài giao (list/new/detail), học liệu, game, tiện ích, membership, feedback, bảo mật, help/sources: thay nút/field/card/bảng tự viết bằng primitives P1; PageHeader thống nhất; đối chiếu frame có sẵn ở viewport Figma | e2e quiz-editor, quiz-import, exam-pilot, exam-ai-import (stub), assignments, library, games, tools, membership, dashboard, draft-isolation | P1, P4 |
| P6 | **Auth, học sinh, live, công khai.** Login/forgot/reset theo 34:4649/4769; account-disabled; `/learn`, `/learn/[code]`, `/play`, `/host/[id]`, results, `/shared/quiz`, `/privacy`, 404: header tập trung tối giản (logo + 1 hành động) thay SiteHeader nav đầy đủ; giữ màu đáp án/gameplay | auth, play, play-a11y, live, host, host-a11y, results, privacy, headings | P1 |
| P7 | **Lớp nổi.** Popup chat, dialog xác nhận, drawer, toast theo Modal 27:19321 / Drawer 27:19402 / Toast 27:19438; giữ điều kiện hiển thị chat | a11y-auth, chat trong admin-rag, focus/Escape | P1 |
| P8 | **Nghiệm thu.** Chạy `tsc --noEmit`, `eslint`, `vitest`, e2e liên quan, axe (`a11y*.spec.ts`), landing preservation + motion. Chụp **sau** 49 route × 3 viewport vào `…/after/`. `visual-review.md` ghép trước/sau/Figma và ghi ngoại lệ | Tất cả xanh; ảnh đã xem; không skip ngầm | P2–P7 |

Thứ tự đề xuất: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8. P2/P3 (admin) được ưu tiên vì là việc 1. Các shared file (Button, glass.css, tokens) sửa tuần tự, không song song.

## 5. Chạy kiểm chứng an toàn

- Không đụng server `next dev` :3000 (`.next/dev`).
- E2E dùng production build ở :3100:

  ```
  APP_BASE_URL=http://localhost:3100 npx playwright test <spec> --workers=2
  ```

- Trước P0 phải xác nhận `npm run build` chỉ ghi vào `.next` và không xoá `.next/dev`. Nếu không chắc, build trong workspace tách riêng như đợt trước (`cloneTemplate/…`).
- Supabase local chỉ dùng fixture có sẵn, không reset DB. Ảnh chụp chỉ chứa dữ liệu fixture, không chứa secret hay `.env.local`.
- Không stage/commit hàng loạt. Commit theo phase chỉ khi chủ dự án yêu cầu.

## 6. Rủi ro

| Rủi ro | Kiểm soát |
|---|---|
| Đổi Button/glass toàn cục làm lệch landing | Token và biến thể đặt dưới scope app. Landing dùng `LandingButtonEffects` riêng. Chạy landing spec sau mỗi lần sửa shared file |
| Selector e2e dựa vào text/role cũ (“Thoát”, link admin) | Cập nhật selector theo role/name mới trong cùng phase, ghi rõ trong log. Không nới assertion |
| Nút 48px làm vỡ hàng toolbar dày (editor, bảng) | Dùng size `sm` 40px cho toolbar dày; touch target ≥ 44px trên mobile |
| Chuyển `select multiple` → chip làm đổi payload | Giữ cùng `name`/giá trị. Unit test kiểm `FormData` |
| `/host` vào shell làm đổi auth/redirect | Chỉ đổi chrome trong `app-chrome.tsx`. Kiểm direct reload + soft nav |
| Khối lượng lớn (49 route) | Chia commit theo phase. P3/P5 có thể tách theo nhóm màn nếu chủ dự án muốn duyệt từng phần |

## 7. Hoàn thành khi

- Mọi `/admin/*` render trong shell admin mới.
- Các trang app (trừ landing) dùng primitives Foundations và khớp frame Figma về bố cục, component, khoảng cách, chữ ở 375/768/1280. Ngoại lệ được ghi trong `visual-review.md`.
- `tsc`, eslint, vitest, e2e liên quan và axe đều đạt.
- Có ảnh trước/sau trong `artifacts/ui-figma-2026-11-17/`.
- Không push/deploy.
