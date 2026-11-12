# Phase 03 · Sidebar giáo viên

Phụ thuộc Phase 01. Thực hiện sau Phase 02 theo thứ tự đã yêu cầu. File dự kiến là `src/components/teacher-shell.tsx`, `teacher-shell.module.css`, và CSS sizing cục bộ ở `countdown-tool.module.css` hoặc `quiz/quiz-editor.module.css` nếu probe 768 px chỉ ra clipping. Dùng `src/components/app-chrome.tsx` và `src/app/layout.tsx` để kiểm tra phạm vi hiện hữu. `e2e/teacher-sidebar.spec.ts` là spec mới cho hành vi công khai, tận dụng `/games`, `/library`, `/tools` để phần shell chạy được khi chưa bật Supabase. `e2e/dashboard.spec.ts`, `e2e/tools.spec.ts` và `e2e/quiz-editor.spec.ts` giữ vai trò regression theo route.

## S1 · Cuộn danh sách và giữ mục hiện tại trong tầm nhìn

- Tách vùng cuộn giữa brand và footer bằng flex `min-block-size: 0` và `overflow-y: auto`. Nhãn, target và focus ring không bị cắt. Footer/nút đóng có đường dùng được ở viewport thấp. Áp dụng cho desktop, tablet và nội dung mobile drawer đang mở. Khi vùng đạt biên, giữ cuộn trong vùng nav nếu browser hỗ trợ `overscroll-behavior`.
- Khi mount, pathname đổi, mở panel hoặc vùng nav đổi chiều cao, đọc vị trí mục `aria-current="page"` và điều chỉnh tối thiểu `scrollTop` của đúng vùng nếu bị khuất. Chỉ thực hiện khi vùng hiển thị và có kích thước. Cập nhật tức thì ở mọi chế độ. Giữ cách match prefix route, quyền truy cập và thứ tự bảy mục. Người dùng cuộn thủ công vẫn được giữ vị trí cho đến lần đổi mục/kích thước tiếp theo. Không lấy focus để báo mục hiện tại.
- Khi Tab đến mục phía dưới, browser cuộn trong vùng nav. Nếu DOM/API đo kích thước chưa sẵn có, vùng cuộn native và trạng thái hiện tại vẫn dùng được.

**Nghiệm thu S1.** Ở 1280 × 420, vào `/tools`, kiểm mục Tiện ích trong khung cuộn, `scrollTop` của nav thay đổi khi cần và vị trí cuộn body không đổi trong thao tác đó. Dùng wheel trên nav và Tab qua danh sách, rồi đi qua route khác và về lại. So brand/footer, mục focus và active trong viewport. Kiểm lại với dialog mở ở 375 × 500.

## S2 · Mở tạm, ghim và thu gọn ở desktop

| Trạng thái | Trigger và đích | Chuyển động, focus và dừng |
| --- | --- | --- |
| Ghim mở 240 px | Mặc định ban đầu như code. Nút đang hiện “Thu gọn menu” thu về rail 88 px. | Khi ghim/thu gọn, cập nhật offset topbar/main cùng một lần. Chỉ animate lớp nhãn/panel bằng opacity/transform nhỏ. Nút và link giữ identity DOM. |
| Rail 88 px | Chuột fine vào rail hoặc keyboard focus-visible đi vào vùng nav/nút thì mở tạm tới 240 px. Click/Enter/Space trên nút “Mở rộng menu” ghim mở, kể cả lúc đang mở tạm. Touch ở desktop dùng nút. | Panel tạm chồng lên workspace. Offset và scroll main vẫn theo rail 88 px. Hiện `--motion-layer`/`--ease-fluid`, đóng `--motion-state`/`--ease-fluid-in`. Focus mở ngay đủ để thấy nhãn/vòng focus. Giữ nhãn truy cập ổn định trong cả hai trạng thái. Nút có accessible name theo hành động ghim/thu gọn, phản ánh trạng thái mở và vùng được điều khiển. |
| Mở tạm 240 px | Giữ khi chuột trong panel hoặc keyboard focus trong vùng. Khi cả hai rời, đóng. Escape thu tạm và giữ focus ở control hiện tại nếu còn thấy được. Nếu control vừa ẩn, chuyển focus về nút ghim/thu gọn. Nút thu gọn tường minh và Escape chặn tự mở lại do hover/focus cũ đến khi có lần vào mới. | Khi focus ra workspace, lớp che đóng tức thì để focus bên ngoài không bị che. Đổi breakpoint, đổi input media hoặc unmount xóa trạng thái tạm. Reduced motion chuyển tức thì. Nếu CSS transition/API không có, nút pin vẫn điều khiển layout. |

Ở rail, chính nhãn khi mở tạm cung cấp tên mục. Bỏ tooltip pseudo-element của các mục đã có nhãn trong panel tạm để tránh trùng hoặc clipping. Nút ghim có accessible name và nhãn khi panel mở. Nếu còn tooltip bổ sung ở control thật khác trong phạm vi, đặt ngoài vùng cuộn, có hover/focus và Escape theo W1. Giữ tùy chọn ghim trong vòng đời shell hiện tại. Reload dùng mặc định mở và không thêm persistence.

**Nghiệm thu S2.** Playwright thu rail, hover một mục, đi vào panel, rời chuột, lặp bằng Tab/Shift+Tab, Escape khi focus còn bên trong, rồi ghim bằng Enter và rời cả chuột lẫn focus. So `main`/topbar trước/sau mở tạm. Sau khi ghim hoặc thu hẹp, kiểm link vẫn là cùng control và click đi đúng route. Touch context không mở tạm vì tap nav, vẫn mở được bằng toggle. Chạy ca chính với motion đầy đủ, lặp luồng bàn phím ở reduced motion.

## S3 · Nhãn hiện sẵn trên tablet

Ở 720–959 px, dùng sidebar 152 px làm giá trị triển khai ban đầu, có nhãn thật và target tối thiểu 44 px. Giữ nhãn tiếng Việt có thể xuống dòng nếu zoom/chữ lớn, với padding và khoảng cách đủ để đọc. Chỉ báo mục hiện tại có `aria-current="page"` và dấu hình học ngoài tint. Ẩn toggle thu gọn ở dải này. Trạng thái pin desktop không chi phối dải tablet. Đo không gian thực của `main`, không mở rộng vùng bằng cách giấu overflow. Timer ưu tiên số tabular và sizing theo container thay cho sizing thuần `vw` nếu probe cần. Quiz editor giữ form, hành động và thứ tự focus, cho cột hoặc hàng co/xuống dòng theo không gian thực.

**Nghiệm thu S3.** Kiểm các nhãn nhìn thấy ở 720/768/959 px, focus ring không bị cắt và một click/tap đi đúng route. Mở dashboard, quiz editor có câu trả lời dài và timer ở 768 px. So `scrollWidth/clientWidth` cả document và vùng trọng yếu, số đếm và các nút hiện đầy đủ. Kiểm tại 719/720 và 959/960, gồm resize từ rail desktop sang tablet. `dashboard.spec.ts:63` và `tools.spec.ts:150` giữ assertion overflow, bổ sung kiểm nhãn bằng spec shell và ca quiz 768 px dùng fixture hiện tại. Không viết assertion khóa rail 88 px ở tablet.

## S4 · Mobile drawer

Ở ≤719 px giữ `<dialog>` hiện có với nút 44 px, `aria-expanded`, trap focus native, nút đóng, Escape và backdrop. Mở bằng tap/Enter/Space, đưa focus vào nút đóng hoặc control đầu có thể thao tác. Hiện sheet từ cạnh gắn với trigger, `--motion-layer` với `--ease-fluid`. Đóng bằng click/escape/backdrop/chọn link. Kết thúc close theo native dialog và trả focus về trigger nếu còn hiển thị; khi resize sang desktop/tablet, đóng modal và trả focus về mục tương ứng trong nav hiển thị. Chỉ dùng exit 180 ms ở browser hỗ trợ giữ overlay mà vẫn khôi phục focus đúng. Mở/đóng tức thì cho reduced motion và fallback. Không chờ `animationend` để mở khóa tương tác.

**Nghiệm thu S4.** Mở drawer qua keyboard và touch ở 320/375, Tab ở trong dialog, Escape/backdrop/nút đóng trả focus, chọn link đóng và chuyển route. Khi resize qua 720 trong lúc mở, body hoạt động lại và không còn modal/top layer cũ. Giữ `dashboard.spec.ts:73` kiểm Escape/focus, bổ sung test touch và resize trong `teacher-sidebar.spec.ts`. Chạy `e2e/dashboard.spec.ts`, `e2e/a11y-auth.spec.ts`, `e2e/tools.spec.ts`, `e2e/quiz-editor.spec.ts` và spec shell. Dùng ảnh 1280 rail/tạm/ghim, 768 nhãn, 375 drawer và 320 viewport thấp.
