---
title: Quiz chơi trực tiếp bằng mã PIN (giai đoạn 2)
date: 2026-10-19
status: decided
---

# Quiz chơi trực tiếp bằng mã PIN (giai đoạn 2)

Tiếp nối [brief giai đoạn 1](./brainstorm-2026-10-19-smartteach-hub.md). Tham chiếu: Wayground (trước đây là Quizizz) và Kahoot.

## Intent / Problem

Giáo viên muốn soạn quiz, chiếu lên lớp và để cả lớp trả lời trên điện thoại, thấy bảng xếp hạng ngay, giống Wayground/Kahoot. Hub hiện có tài khoản giáo viên, lớp, kho game và tiện ích; chưa có quiz.

## Desired Outcome

Giáo viên đăng nhập soạn quiz, bắt đầu một phiên trực tiếp, nhận mã PIN. Học sinh không cần tài khoản: vào trang chơi, nhập PIN và biệt danh, trả lời từng câu trên điện thoại. Cuối buổi giáo viên xem kết quả. Chạy trên gói miễn phí cho khoảng 5 lớp (mỗi lớp tối đa 40-50 học sinh) chơi cùng lúc.

## Constraints

- Một người làm, gói miễn phí Supabase và Vercel Hobby, chi phí hạ tầng 0.
- Học sinh không có tài khoản và không cần nhập tên thật. Dữ liệu của trẻ em ở mức tối thiểu: biệt danh, câu trả lời, điểm.
- Giới hạn Supabase Realtime gói Free (tài liệu 2026-10-19): 200 kết nối đồng thời, 100 tin nhắn mỗi giây, 100 lượt vào channel mỗi giây.
- Đăng nhập ẩn danh của Supabase mặc định 30 lần mỗi giờ mỗi địa chỉ IP; cả lớp dùng chung wifi trường nên không dùng được cho học sinh.
- Thiết kế và giọng điệu theo `PRODUCT.md` và `DESIGN.md`; WCAG AA (đáp án không phân biệt chỉ bằng màu).

## Non-goals

- Chế độ giao bài tự làm có hạn nộp (làm sau trên nền này).
- Hình ảnh và công thức Toán trong câu hỏi, âm nhạc và meme, avatar, power-up, tạo câu hỏi bằng AI, thư viện công khai, nhập quiz từ Word/PDF/Excel (thuộc giai đoạn 3 hoặc sau).
- Học sinh chọn tên từ lớp đã lưu (có thể thêm sau; hiện dùng biệt danh tự nhập).
- Xuất báo cáo Excel (kết quả xem trên màn hình trước).

## Domain Context

- Dạng câu hỏi (đã chốt): trắc nghiệm 1 đáp án (2-6 lựa chọn), đúng/sai, nhiều đáp án đúng, điền từ ngắn.
- Chia sẻ (đã chốt): quiz mặc định riêng tư; chia sẻ bằng link để đồng nghiệp xem và nhân bản về tài khoản của mình.
- Phạm vi chơi (đã chốt): chỉ trực tiếp, chưa có bài tự làm.
- Quy mô (đã chốt): vài lớp cùng lúc trên Realtime miễn phí.
- Nền đã có: Supabase Auth cho giáo viên, RLS theo chủ sở hữu, trigger giới hạn có khoá advisory, kiểm thử RLS trên stack cục bộ, `parseNames`, danh sách lớp.

## Options Considered

| Option | Key assumption | Failure condition | Trade-offs |
|---|---|---|---|
| **A. Học sinh vào bằng hàm RPC + mã tham gia riêng, Realtime chỉ làm "chuông báo", polling làm nguồn đúng (chọn)** | Mọi trạng thái và chấm điểm nằm ở Postgres; học sinh gọi hàm `security definer` bằng mã tham gia ngẫu nhiên; Realtime Broadcast chỉ gửi vài byte "đổi pha"; nếu mất kết nối thì client hỏi lại mỗi vài giây | Hàm sai ở phần kiểm tra mã tham gia hoặc thời gian thì lộ đáp án hoặc cho gian lận | Không tạo người dùng Auth, không dính giới hạn đăng nhập ẩn danh, không dính giới hạn tin nhắn; phải tự viết và kiểm thử kỹ các hàm |
| B. Học sinh đăng nhập ẩn danh, RLS theo `auth.uid()`, Postgres Changes | Mỗi học sinh có JWT riêng | 30 lần đăng nhập ẩn danh mỗi giờ mỗi IP: một lớp 40 bạn dùng chung IP vượt ngay | RLS gọn hơn nhưng không chạy được ở lớp thật |
| C. Chỉ Broadcast, phát mọi câu trả lời cho cả lớp | Số tin ít | 40 bạn trả lời gần cùng lúc gửi hàng nghìn tin, vượt 100 tin mỗi giây; đáp án đi qua kênh mà ai biết PIN cũng nghe được | Đơn giản nhất nhưng sai về bảo mật và giới hạn |
| D. Chỉ polling, không Realtime | Đồ thị yêu cầu nhỏ | Câu hỏi đến chậm vài giây, mất cảm giác trò chơi | Không giới hạn kết nối nhưng kém trải nghiệm |

## Decision

Chọn **A**. Giáo viên (đã đăng nhập) điều khiển phiên; học sinh tham gia bằng hàm RPC. Cụ thể:

1. **Dữ liệu:** quiz, câu hỏi và **khoá đáp án đặt ở bảng riêng** mà học sinh không đọc được; phiên chơi (mã PIN 6 chữ số, trạng thái, câu hiện tại, thời điểm mở và đóng câu do **máy chủ** đặt); người chơi (biệt danh, mã tham gia ngẫu nhiên); câu trả lời; điểm.
2. **Học sinh:** `join(pin, biệt_danh)` trả về mã tham gia; lưu trong `sessionStorage` để tải lại trang vẫn vào lại được. Mọi hàm sau đó nhận mã này. Hàm `lấy_câu_hiện_tại` chỉ trả đề và lựa chọn khi câu đang mở, **không** trả đáp án đúng. Đáp án đúng chỉ trả sau khi câu đóng (bước hiện đáp án).
3. **Chấm điểm ở máy chủ:** mỗi người một đáp án mỗi câu, không sửa; hạn chót theo đồng hồ máy chủ; câu trễ bị từ chối. Điểm cơ bản cố định khi đúng; có tuỳ chọn cho từng phiên "tính thêm điểm theo tốc độ" (mặc định bật). Câu nhiều đáp án: đúng hết mới được điểm. Điền từ: so khớp không phân biệt hoa thường và khoảng trắng thừa, **phân biệt dấu tiếng Việt**, có tuỳ chọn theo câu "chấp nhận không dấu"; mỗi câu có danh sách đáp án chấp nhận.
4. **Thời gian thực:** kênh Broadcast theo phiên chỉ phát số thứ tự pha ("đã sang câu 3, đang mở"); client nhận thì gọi RPC lấy nội dung. Nếu không nhận được tin trong vài giây thì client hỏi lại định kỳ (polling dự phòng), nên mất Realtime vẫn chơi tiếp được. Màn hình giáo viên đếm số người đã trả lời bằng cách hỏi RPC mỗi 1-2 giây (một client). Không dùng Presence.
5. **Hạn mức:** tối đa 50 người chơi mỗi phiên, 1 phiên đang chạy mỗi giáo viên, tối đa 50 câu mỗi quiz, 6 lựa chọn mỗi câu, 50 quiz mỗi giáo viên, độ dài chữ có giới hạn; mọi giới hạn ép bằng trigger như phase 1. Phiên tự đóng sau 4 giờ.
6. **Quản lý phiên:** giáo viên khoá phòng chờ và loại người chơi; PIN chỉ có hiệu lực khi phiên đang mở.
7. **Kết quả:** lưu điểm, câu trả lời; giáo viên xem bảng xếp hạng cuối, đúng/sai từng câu, tỉ lệ đúng mỗi câu; chỉ chủ phiên xem được. Tự xoá dữ liệu người chơi sau **90 ngày** (mặc định tạm; cập nhật trang Quyền riêng tư tương ứng).
8. **Chia sẻ:** quiz có mã chia sẻ ngẫu nhiên (thu hồi được bằng cách đổi mã); người có link và đã đăng nhập xem được và nhân bản về tài khoản mình. Link lộ cả đáp án nên ghi rõ khi chia sẻ.

## Reasoning

B bị loại vì lớp thật dùng chung IP. C bị loại vì vượt giới hạn tin nhắn và đẩy đáp án qua kênh nghe lén được. D giữ độ tin cậy nhưng làm mất cảm giác trực tiếp, nên được giữ làm lớp dự phòng của A. A đặt toàn bộ phần nhạy cảm (đáp án, điểm, thời gian) ở máy chủ, nên một học sinh sửa trình duyệt cũng không gian lận hay đọc trước đáp án, và Realtime chỉ còn là gợi ý nhẹ nên khó chạm trần 100 tin mỗi giây (cả lớp 40 bạn chỉ nhận một tin mỗi lần đổi câu).

## Acceptance Criteria

- Giáo viên tạo, sửa, nhân bản, xoá quiz với bốn dạng câu hỏi; dữ liệu sai (thiếu đáp án đúng, câu rỗng, vượt giới hạn) bị chặn với lời nhắn rõ; người khác không xem hay sửa được quiz của mình (RLS, có test hai tài khoản).
- Chia sẻ bằng link: đồng nghiệp đã đăng nhập mở link, xem và nhân bản; đổi mã thì link cũ hết hiệu lực; khách chưa đăng nhập không xem được.
- Giáo viên bắt đầu phiên, nhận PIN; học sinh trên điện thoại vào bằng PIN và biệt danh mà không có tài khoản; phòng chờ hiện danh sách; giáo viên khoá phòng và loại người chơi được; PIN sai hay phiên đã đóng bị từ chối.
- Học sinh **không bao giờ nhận được đáp án đúng trước khi câu đóng**, kể cả khi gọi trực tiếp API (test bằng vai trò `anon`).
- Mỗi người chỉ trả lời một lần mỗi câu; trả lời sau hạn bị từ chối theo đồng hồ máy chủ; điểm đúng theo quy tắc ở trên cho cả bốn dạng câu (có unit test cho phần chấm và so khớp điền từ, gồm dấu tiếng Việt).
- Luồng đầy đủ chạy được: phòng chờ, từng câu có đếm giờ, hiện đáp án và phân bố, bảng xếp hạng, bục cuối; học sinh tải lại trang vẫn vào lại đúng người chơi.
- Mất kết nối Realtime thì trò chơi vẫn tiếp tục nhờ polling (có test giả lập mất kênh).
- Thử tải với 40 người chơi mô phỏng trong một phiên: tin nhắn Realtime dưới 100 mỗi giây, không có yêu cầu nào lỗi, độ trễ đổi câu chấp nhận được; số kết nối đo được để biết còn bao nhiêu lớp cùng chơi.
- Học sinh dùng được trên điện thoại ở 375px; đáp án phân biệt bằng hình dạng và chữ chứ không chỉ màu; không vi phạm WCAG A/AA theo axe.
- Giáo viên xem kết quả sau buổi; giáo viên khác không xem được; dữ liệu người chơi tự xoá sau 90 ngày.
- Không có khoá bí mật trong mã, không lộ đáp án trong gói gửi cho học sinh.

## Open Questions / Risks

- **Giới hạn gói miễn phí của đăng ký giáo viên (phát hiện thêm):** Supabase Auth dùng dịch vụ email tích hợp giới hạn **2 email mỗi giờ**, trong khi đăng ký bằng email đang bật xác nhận. Trước khi mời nhiều giáo viên đăng ký cần cấu hình SMTP riêng (dịch vụ gửi email có gói miễn phí) hoặc chỉ dựa vào Google. Đây là việc của giai đoạn 1, chưa xử lý.
- **Đoán PIN:** mã 6 chữ số có thể bị đoán; học sinh lạ có thể vào phòng chờ. Giảm thiểu bằng khoá phòng, loại người chơi, PIN chỉ sống khi phiên mở. Cân nhắc giới hạn số lần thử `join` sai theo phiên.
- **Quy mô thật:** 200 kết nối là trần của cả dự án; chỉ nên coi là "vài lớp cùng lúc". Cần đo trước khi cam kết, và nâng gói nếu dùng thật rộng.
- **Các hàm `security definer` là ranh giới bảo mật duy nhất** của phần học sinh: cần kiểm thử bằng vai trò `anon` và xem xét riêng.
- **Quyền riêng tư:** biệt danh trẻ em và câu trả lời được lưu 90 ngày; cập nhật trang Quyền riêng tư và duyệt lại; chưa có kiểm duyệt biệt danh ngoài việc giáo viên loại người chơi.
- Hình ảnh trong câu hỏi, công thức Toán, bài tự làm, báo cáo xuất Excel: làm sau, sẽ cần Supabase Storage hoặc thiết kế thêm.
- Quy tắc điểm và thời hạn xoá 90 ngày là mặc định tạm, có thể đổi mà không đổi kiến trúc.

## Design Brief (đã xác nhận)

- **Phong cách:** cùng hệ thiết kế với hub (nền sáng, xanh dương và vàng, Be Vietnam Pro); không nhạc, không nhân vật; chuyển động 150-250ms, thanh đếm giờ chạy tuyến tính, tôn trọng giảm chuyển động. Đã chọn cùng hệ thiết kế, thêm bộ màu đáp án.
- **Ô đáp án:** mỗi lựa chọn là một ô lớn có chữ cái A-F, hình dạng riêng và một màu, nên không phân biệt chỉ bằng màu. Bộ hình và màu riêng của dự án (không sao chép bộ của Kahoot); màu mới thêm vào DESIGN.md dưới dạng token và được kiểm tra tương phản bằng unit test như các token hiện có. Chữ trên ô đạt 4.5:1.
- **Học sinh (điện thoại, 375px, một tay):** trạng thái gồm nhập PIN, nhập biệt danh, phòng chờ, câu hỏi, đã gửi đáp án (khoá, chờ), kết quả câu (đúng/sai, điểm, hạng), kết thúc (hạng cuối), mất kết nối đang thử lại, bị loại, phiên đã đóng. Ô đáp án cao tối thiểu 72px.
- **Giáo viên:** **một trang** `/host/[id]` vừa là màn chiếu vừa là bảng điều khiển, có chế độ toàn màn hình (đã chọn). Trạng thái: phòng chờ (PIN cỡ lớn, đường dẫn tham gia, danh sách người chơi, khoá phòng, loại người chơi), đang hỏi (đề cỡ lớn, đếm giờ, số người đã trả lời), hiện đáp án (đáp án đúng, phân bố), bảng xếp hạng top 5, bục cuối, mất kết nối đang thử lại.
- **Soạn quiz:** danh sách quiz và trình soạn theo quy ước giao diện "product" (quen thuộc, nhất quán): form riêng cho từng dạng câu, xem trước, báo lỗi ngay tại trường, xác nhận trước khi xoá.
- **Một nút vàng chính mỗi màn hình** theo DESIGN.md (Bắt đầu phiên, Câu tiếp theo, Gửi đáp án...).

## Làm rõ kỹ thuật sau khi kiểm tra mã và môi trường

- **Không cần bảng khoá đáp án riêng.** Học sinh (vai trò `anon`) không có quyền trên bất kỳ bảng nào; chỉ gọi được các hàm `security definer` trả đúng các cột an toàn. Test bằng vai trò `anon` bảo đảm điều đó. Đáp án đúng và đề của phiên được chụp thành jsonb trong dòng phiên lúc bắt đầu, nên sửa hay xoá quiz sau đó không làm đổi kết quả đã chơi.
- **Chặn đoán PIN theo địa chỉ IP, làm hết sức:** PostgREST đưa `request.headers` vào hàm SQL (đã kiểm tra trên stack cục bộ), nhưng giá trị `x-forwarded-for` có phần đầu do máy khách tự đặt; chỉ tin phần do gateway nối thêm. Cần kiểm tra lại trên dự án Supabase thật. Vì đây là lớp giảm thiểu, không phải ranh giới bảo mật, cách bù là khoá phòng và PIN chỉ sống khi phiên mở.
- **Realtime đang tắt ở stack cục bộ** (cấu hình phase 4); giai đoạn này bật lại, tải thêm image.
- **Xoá dữ liệu sau 90 ngày:** `pg_cron` có sẵn ở cục bộ nhưng chưa bật; kèm xoá cơ hội khi tạo phiên mới làm phương án không phụ thuộc cron.
