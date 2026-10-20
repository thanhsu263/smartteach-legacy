---
title: Nâng cấp quiz trực tiếp - QR, tự động qua câu, kho báu, import từ file
date: 2026-10-20
status: decided
---

# Nâng cấp quiz trực tiếp: QR, tự động qua câu, kho báu, import từ file

Tiếp nối [brief giai đoạn 2](./brainstorm-2026-10-19-quiz-truc-tiep.md). Giai đoạn 2 đã hoàn tất và đã chạy trên dịch vụ thật (2026-10-19). Brief này là "giai đoạn 2.5": phát triển tiếp phần quiz, **trì hoãn đề thi online và nhập Word/PDF** (giai đoạn 3 của brief hub).

## Intent / Problem

Chủ dự án muốn làm phần quiz tốt hơn thay vì sang đề thi: vào phòng nhanh hơn khi chiếu cho cả lớp hay người xem thuyết trình, buổi chơi tự chạy không cần giáo viên bấm từng câu, thêm yếu tố giải trí để học sinh hào hứng, và đưa quiz có sẵn vào hệ thống nhanh hơn soạn tay từng câu.

## Desired Outcome

1. **QR vào phòng:** phòng chờ hiện mã QR cạnh PIN; quét bằng camera điện thoại là mở thẳng `/play` với PIN đã điền, chỉ còn bước chọn biệt danh.
2. **Tự động qua câu:** giáo viên bật "Tự động" khi bắt đầu phiên. Hết giờ một câu thì đóng câu, hiện đáp án và xếp hạng N giây (5, 8 hoặc 12), rồi tự mở câu kế; sau câu cuối tự sang bảng xếp hạng cuối. Có nút Tạm dừng và Tiếp tục.
3. **Chuỗi thắng/thua và kho báu (chế độ giải trí, tắt mặc định):** giáo viên bật khi bắt đầu phiên. Học sinh đạt chuỗi thắng hoặc chuỗi thua thì đổi chuỗi lấy một rương kho báu, mở rương ra một hiệu ứng toán học lên điểm hiện tại của chính mình (nhân, chia, cộng, trừ).
4. **Import quiz từ file:** giáo viên tải file mẫu Excel/CSV, điền câu hỏi, tải lên (hoặc dán văn bản theo cú pháp), xem trước, sửa lỗi từng dòng rồi lưu thành quiz mới.

## Constraints

- Một người làm, Supabase Free và Vercel Hobby, chi phí hạ tầng 0; Realtime Free: 200 kết nối, 100 tin mỗi giây.
- Học sinh vẫn không có tài khoản; dữ liệu trẻ em ở mức tối thiểu, **không lưu IP** (đã gỡ ở commit `0618fab`).
- **Cơ sở dữ liệu thật đã có ba migration giai đoạn 2.** Mọi thay đổi lược đồ lần này là **migration mới**, không sửa tại chỗ các file đã áp.
- Máy chủ là nguồn đúng: chấm điểm, mở rương và chọn hiệu ứng ngẫu nhiên đều ở hàm Postgres `security definer`; trình duyệt không chọn được hiệu ứng, không thấy dữ liệu của người khác (giữ ranh giới: `anon` không có quyền trên bảng nào).
- Hệ thiết kế `DESIGN.md`, WCAG AA (không phân biệt chỉ bằng màu, hỗ trợ `prefers-reduced-motion`), mobile-first cho học sinh, chiếu lớn cho giáo viên.
- Giữ 4 dạng câu, tối đa 50 câu mỗi quiz, 50 người chơi mỗi phòng, chỉ vào ở phòng chờ.

## Non-goals

- Đề thi online, nhập Word/PDF/ảnh, nhận dạng tự động (để giai đoạn 3).
- Hiệu ứng kho báu tác động lên **bạn khác** (cướp điểm, đổi điểm); chỉ điểm của chính mình.
- Cho vào muộn giữa phiên; tăng giới hạn 50 người; chế độ hội thảo 150-200 người.
- Tự đóng câu sớm khi mọi người đã trả lời (có thể thêm sau, không cần cho mục tiêu này).
- Avatar, nhạc, ảnh/công thức trong câu hỏi, tạo câu hỏi bằng AI, xuất báo cáo Excel.
- Nhập tệp Word/PDF; nhập kết quả buổi chơi.

## Domain Context

Đã có trong repo (đã kiểm tra):

- Phòng chờ `src/components/live/host/lobby.tsx` đã tính `joinUrl = <origin>/play?pin=<PIN>` và `/play` đọc `?pin=` (`play-entry.tsx`), nên QR chỉ cần mã hoá đúng địa chỉ này; chưa có thư viện QR trong `package.json`.
- Hết giờ: `host-screen.tsx` đã tự đóng câu qua `host_close_if_expired` (giờ máy chủ, thử lại mỗi giây). Phiên chưa có khái niệm "tự mở câu kế".
- Điểm: `private.score_question` chấm khi đóng câu (đúng 1000 điểm, thưởng tốc độ 500-1000); điểm cộng dồn vào `participants.score`. Đáp án của từng người lưu ở `answers` (có `position`, `is_correct`), nên chuỗi thắng/thua tính được từ đó.
- Quiz: `save_question` và `MAX_QUESTIONS_PER_QUIZ = 50`; có `parseNames` cho danh sách lớp làm tiền lệ phân tích văn bản.
- Thiết kế phiên chụp quiz thành `quiz_snapshot` lúc bắt đầu; cấu hình phiên mới (tự động, giải trí) nên chụp cùng lúc.

## Options Considered

| Option | Key assumption | Failure condition | Trade-offs |
|---|---|---|---|
| **QR: sinh ở trình duyệt bằng thư viện nhỏ (chọn)** | Mã hoá địa chỉ `/play?pin=` đủ ngắn cho QR phiên bản thấp | Thư viện có vấn đề giấy phép hoặc bảo trì | Không phụ thuộc dịch vụ ngoài, không gửi PIN ra ngoài. Cần thêm một dependency |
| QR: dịch vụ ảnh QR của bên thứ ba | Dịch vụ ổn định | Gửi PIN và địa chỉ lên máy chủ khác, có thể ngừng | Không dùng: lộ PIN, thêm điểm hỏng |
| **Tự động: máy giáo viên điều khiển, máy chủ kiểm giờ (chọn)** | Màn hình giáo viên luôn mở (đang chiếu) | Giáo viên đóng tab giữa phiên: phiên đứng chờ | Cùng mô hình `host_close_if_expired`; thêm `host_advance_if_due` kiểm giờ phía máy chủ, không tin đồng hồ trình duyệt |
| Tự động: pg_cron mỗi giây | `pg_cron` chạy dưới 1 phút | Nhịp tối thiểu của pg_cron không đủ cho 5-12 giây | Không dùng |
| **Kho báu: rương mở ở máy chủ, hiệu ứng ngẫu nhiên có trọng số theo loại chuỗi (chọn)** | Mỗi chuỗi chỉ đổi được một rương, mở idempotent | Client mở hai lần hoặc tự chọn hiệu ứng | Công bằng và chống gian lận; cần bảng sự kiện và test kỹ |
| Kho báu: hiệu ứng tính ở trình duyệt | Học sinh không sửa JS | Một em sửa điểm của mình | Không dùng: phá bảng xếp hạng |
| **Import: Excel/CSV theo mẫu và dán văn bản theo cú pháp, phân tích ở trình duyệt (chọn)** | Giáo viên chấp nhận điền file mẫu | Thư viện đọc `.xlsx` quá nặng hoặc có lỗ hổng | Không cần máy chủ đọc file; xem trước và báo lỗi từng dòng. Cần chọn thư viện `.xlsx` bằng nghiên cứu có nguồn |
| Import: Word/PDF tự nhận dạng | Định dạng đề của giáo viên đều đặn | Mỗi giáo viên một kiểu | Để giai đoạn 3 |

## Decision

Làm bốn hạng mục theo ba đợt, đợt trước độc lập đợt sau:

**Đợt A - Vào nhanh và chạy tự động** (một migration "cấu hình phiên"):
- QR ở phòng chờ (cả điện thoại chiếu lớn): mã đen trắng, kích thước lớn, vùng yên tĩnh đủ, kèm địa chỉ chữ và PIN; QR nhỏ ở góc màn hình chiếu không cần vì chỉ vào ở phòng chờ.
- Tự động qua câu: `live_sessions.auto_advance` và `reveal_seconds` (5/8/12), chụp lúc `create_session`; `host_advance_if_due` chỉ mở câu kế khi đang ở `reveal`, đã quá `reveal_seconds` theo giờ máy chủ, phiên đang bật tự động và không tạm dừng; tạm dừng/tiếp tục là cờ phía máy chủ (`paused`), phát `seq` như các thao tác khác. Khi bật chế độ giải trí, thời gian hiện đáp án tối thiểu 8 giây để kịp mở rương.

**Đợt B - Kho báu** (migration riêng, phần lớn công việc và rủi ro):
- Bật ở `create_session` (`treasure_mode`, mặc định tắt, chụp cùng phiên).
- Chuỗi tính ở máy chủ từ `answers` sau khi đóng câu: **3 câu đúng liên tiếp** thì có rương "thắng"; **3 câu sai hoặc bỏ trống liên tiếp** thì có rương "an ủi". Nhận rương thì chuỗi về 0. Ngưỡng 3 là hằng số cấu hình ở hàm, có thể đổi sau.
- Bảng `treasure_chests` (phiên, người chơi, loại `win`/`comfort`, trạng thái, hiệu ứng, điểm trước và sau); mỗi (người chơi, câu kích hoạt) chỉ một rương (khoá duy nhất) nên đóng câu gọi lại không tạo thêm.
- `open_chest(token)`: máy chủ chọn hiệu ứng ngẫu nhiên có trọng số, áp lên `participants.score`, ghi sự kiện, trả kết quả; gọi lại thì trả đúng kết quả cũ. Điểm không xuống dưới 0 và mức tăng một lần có trần (đề xuất không vượt +2000) để không phá hẳn bảng xếp hạng.
- Hiệu ứng, **chỉ lên điểm của chính mình**: rương thắng có cả may và rủi (`+500`, `+1000`, `x2`, `x1,5`, `-300`, `÷2`); rương an ủi chỉ có hiệu ứng dương hoặc trung tính (`+500`, `+1000`, `x2`). Tránh làm em đã thua còn bị trừ.
- Rương còn chờ thì mở được ở màn hình hiện đáp án; rương chưa mở khi phiên kết thúc được máy chủ tự mở **trước khi** xếp hạng cuối, để bục vinh danh chỉ phản ánh điểm cuối cùng.
- Màn hình giáo viên hiện một dòng thông báo vui khi có người mở rương (biệt danh và hiệu ứng) để cả lớp cùng thấy; bảng xếp hạng cập nhật như thường.

**Đợt C - Import từ file** (không đổi lược đồ ngoài một hàm nhận cả bộ câu):
- Hàm `import_quiz(title, questions[])` tạo quiz và mọi câu trong một giao dịch, tôn trọng `MAX_QUESTIONS_PER_QUIZ` và giới hạn độ dài; lỗi thì không tạo gì.
- Phân tích ở trình duyệt: file mẫu CSV/Excel (cột loại câu, câu hỏi, các lựa chọn, đáp án đúng, thời gian, đáp án điền từ, bỏ dấu), và ô dán văn bản theo cú pháp (dòng câu hỏi, các dòng `A.` `B.`..., dòng `Đáp án:`). Xem trước từng câu, báo lỗi theo số dòng, cho sửa trước khi lưu.

## Reasoning

- Mỗi hạng mục tận dụng nền có sẵn (PIN trong URL, đóng câu theo giờ máy chủ, bảng `answers`, `save_question`), nên rủi ro thấp trừ kho báu.
- Kho báu là phần duy nhất đổi ý nghĩa của điểm, nên phải ở máy chủ, idempotent, có test chống gian lận và chạy sau cùng trên nền đã vững.
- Giới hạn "chỉ điểm của chính mình" và rương an ủi không có hiệu ứng âm phản ánh chọn lựa của chủ dự án: tránh trẻ bị trêu hay buồn, đúng tinh thần dữ liệu trẻ em tối thiểu của dự án.
- Import qua trình duyệt giữ chi phí hạ tầng 0 và không thêm bề mặt tấn công đọc file ở máy chủ.

## Acceptance Criteria

**QR**
- Phòng chờ hiện QR có văn bản thay thế ghi địa chỉ; quét ra đúng `<origin>/play?pin=<PIN>`; trang `/play` mở với PIN đã điền (e2e: giải mã QR trong ảnh chụp trả đúng địa chỉ).
- Đạt axe 1280px và 375px; QR đủ tương phản và kích thước trên màn chiếu (kiểm thủ công ở nghiệm thu).

**Tự động qua câu**
- Bật tự động: hết giờ câu thì sang `reveal`, sau đúng `reveal_seconds` (theo giờ máy chủ) tự mở câu kế; câu cuối thì sang bục vinh danh. Test DB bằng đồng hồ máy chủ giả lập và e2e hai trình duyệt.
- Tạm dừng giữ nguyên `reveal` đến khi Tiếp tục; học sinh thấy trạng thái đồng bộ; nút Space và các nút thủ công vẫn dùng được.
- `host_advance_if_due` không mở sớm, không mở hai lần khi gọi trùng, không chạy khi tắt tự động.

**Kho báu**
- Chuỗi 3 đúng tạo đúng một rương thắng, 3 sai tạo đúng một rương an ủi; đóng câu gọi lại không tạo thêm; đạt chuỗi lại sau khi nhận.
- `open_chest` idempotent, chỉ chủ rương mở được; hiệu ứng nằm trong danh sách và trọng số đã định; điểm không âm; mức tăng không vượt trần; học sinh không đọc được hiệu ứng trước khi mở (test bằng vai trò `anon`).
- Rương còn lại được mở tự động trước xếp hạng cuối; bảng xếp hạng và kết quả khớp điểm cuối.
- Giao diện: chọn rương bằng bàn phím, kết quả có chữ (không chỉ màu, không chỉ hoạt hình), tôn trọng `prefers-reduced-motion`, đạt axe.
- Chế độ giải trí mặc định tắt; tắt thì hành vi y như hiện nay (test hồi quy).

**Import**
- File mẫu tải được; tải lên file đúng tạo quiz đủ câu; file lỗi báo đúng dòng và không tạo gì; vượt 50 câu bị từ chối; dán văn bản theo cú pháp cho cùng kết quả như file.
- Mọi dạng câu (4 dạng) nhập được; quiz sau nhập qua `quiz_problems` như quiz soạn tay.

**Chung**
- Không có khoá bí mật hay IP mới trong gói trình duyệt (`scan:bundle`), bộ test hiện có vẫn đạt, README và trang Quyền riêng tư cập nhật nếu có dữ liệu mới (bảng `treasure_chests` là dữ liệu thuộc buổi chơi, theo hạn 90 ngày).

## Open Questions / Risks

- **Thư viện:** cần nghiên cứu có nguồn để chọn thư viện QR và đọc `.xlsx` (độ phổ biến, giấy phép, kích thước, lỗ hổng đã biết) trước khi lập kế hoạch đợt A và C.
- **Cân bằng kho báu:** trọng số và trần là con số khởi đầu; chỉnh sau khi thử với lớp thật. Dễ làm bảng xếp hạng mất ý nghĩa nếu hiệu ứng quá lớn; cân nhắc hiển thị điểm "trước kho báu" trong kết quả.
- **Giáo viên đóng tab giữa phiên tự động:** phiên đứng chờ; chấp nhận được (cùng giới hạn với hiện nay).
- **Thời gian mở rương trong chế độ tự động:** `reveal_seconds` tối thiểu 8 giây khi bật giải trí là đề xuất; kiểm bằng lớp thật xem có đủ.
- **Tải Realtime:** thêm một tin báo cho mỗi lần mở rương (tối đa một tin gửi và một tin nhận, giống pha khác); không làm thay đổi kết luận về số lớp, nhưng nên chạy lại `npm run test:load` có bật tự động và kho báu.
- **Quyền riêng tư:** thêm bảng `treasure_chests` (biệt danh, hiệu ứng, điểm) theo hạn 90 ngày; cập nhật trang `/privacy`.
