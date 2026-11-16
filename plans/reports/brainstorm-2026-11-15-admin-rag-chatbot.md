---
title: Quản trị toàn hệ thống và chatbot RAG SmartTeach
date: 2026-11-15
status: decided
---

# Quản trị toàn hệ thống và chatbot RAG SmartTeach

## Intent / Problem

Giáo viên cần trợ lý popup ở góc dưới bên phải để được hướng dẫn dùng SmartTeach và tìm học liệu phù hợp. Chủ hệ thống cần khu vực quản trị riêng để cấu hình AI, quản lý nguồn kiến thức và vận hành các chức năng hiện có.

Brief này chốt phạm vi sản phẩm sau các vòng hỏi đáp; chưa phải kế hoạch triển khai hoặc xác nhận đã xây dựng tính năng.

## Desired Outcome

- Giáo viên đã đăng nhập có thể hỏi bằng tiếng Việt, nhận câu trả lời có nguồn hoặc học liệu đã duyệt kèm liên kết mở đúng nơi.
- Nguồn RAG kết hợp PDF/DOCX có văn bản do quản trị cung cấp và học liệu đã duyệt. Bộ tài liệu cần có hướng dẫn SmartTeach để phục vụ câu hỏi sử dụng hệ thống.
- Có role quản trị viên và khu vực `/admin` gồm 9 nhóm chức năng được người dùng xác nhận.
- Lịch sử chat thuộc từng tài khoản, tự xóa sau 30 ngày và có thao tác xóa ngay.
- Admin chỉ xem thông tin tài khoản, số liệu tổng hợp và nội dung công khai; không đọc nội dung riêng của giáo viên.

## Constraints

- Tận dụng Next.js, Supabase Auth/Postgres, RLS, token và shared component hiện có. Không sửa hero/motion hoặc các thay đổi chưa commit ngoài phạm vi.
- Chatbot dành cho giáo viên đăng nhập; không thêm điều kiện Premium. Học sinh và khách không truy cập API chat.
- Ưu tiên các model có Gemini Free Tier và quản lý cấu hình qua admin. Không tự bật billing hoặc chuyển sang model trả phí.
- Quota Gemini áp theo project/model, không theo API key. Nhiều key trong cùng project không làm tăng quota. Cấu hình dự phòng cần biết nhóm quota; không lặp qua key cùng nhóm đã hết hạn mức.
- Khóa API chỉ được dùng ở server, mã hóa khi lưu; UI quản trị không đọc lại giá trị gốc, log không chứa khóa. Khóa gốc bảo vệ mã hóa phải nằm ngoài DB chứa ciphertext.
- Với Gemini Free Tier, không tự đưa thông tin lớp, học sinh, điểm, quiz riêng hoặc dữ liệu tài khoản vào prompt/embedding. Phải thông báo phù hợp về việc nội dung người dùng nhập và đoạn tài liệu được gửi đến nhà cung cấp AI.
- Nội dung được nạp phải có quyền sử dụng/xử lý phù hợp; tài liệu chứa thông tin cá nhân hoặc bí mật không thuộc nguồn kiến thức Free Tier dự kiến.
- Xóa hội thoại phải loại nó khỏi truy vấn, ngữ cảnh tiếp theo và các bản sao/cache do ứng dụng quản lý. Job xóa hết hạn phải chạy được khi không có traffic; khi thiết kế cần xác định lịch purge và cách xử lý backup theo khả năng nền tảng, không hứa xóa dữ liệu ở nhà cung cấp ngoài quyền kiểm soát.
- payOS vẫn hoãn đăng ký/kích hoạt theo yêu cầu của người dùng. Không tạo giao dịch tiền thật hoặc cấu hình webhook bên ngoài trong phạm vi này.

## Non-goals

- OCR, ảnh chụp trang sách, PDF scan, tài liệu riêng do giáo viên tải lên.
- Chatbot tự tạo/sửa/phát hành quiz, thay đổi dữ liệu lớp hoặc thực hiện thanh toán.
- Chatbot giải bài tổng quát ngoài mục tiêu hướng dẫn hệ thống và tìm học liệu.
- Admin đọc quiz chưa công khai, roster/tên học sinh, bài làm/điểm hoặc nội dung chat của giáo viên.
- Cho phép người dùng tự đăng ký quyền admin hoặc sử dụng API key/service role từ trình duyệt.
- Trình biên tập mã nguồn, công cụ chỉnh scene 3D, hoặc bộ dựng trang tùy ý trong admin.

## Domain Context

- `PRODUCT.md`: giáo viên Việt Nam, thao tác nhanh, bảo vệ dữ liệu học sinh; `DESIGN.md`: Be Vietnam Pro, nền sáng, xanh cobalt/navy, vật liệu nổi có mục đích, WCAG AA và reduced motion.
- Repo chưa có AI/RAG, role admin hoặc giao diện quản trị. `src/components/auth-provider.tsx` hiện chỉ biểu diễn tài khoản đăng nhập; `RequireUser` kiểm tra phiên ở server.
- Kho học liệu đã có submit/review/report, trạng thái draft/pending/approved/rejected/hidden và public preview loại bỏ đáp án. `moderate_quiz_publication` hiện chỉ cho service role thực hiện; cần lớp quản trị kiểm tra quyền trước khi sử dụng chức năng này.
- Game nằm trong `src/data/games.ts`; tiện ích trong `src/data/tools.ts`; thông tin site và giá gói đang ở mã nguồn. Đưa cấu hình phù hợp lên admin cần chuyển nguồn dữ liệu có kiểm soát, giữ fallback và không làm đổi các đơn cũ.
- Membership có đơn, entitlement, giá cố định ở server/DB và xác nhận tiền nguyên tử. Cấp Premium thủ công phải là thao tác quản trị riêng có lý do/nhật ký, không giả trạng thái đơn đã thanh toán.
- Chính sách quyền riêng tư hiện nêu dữ liệu riêng chỉ chủ tài khoản xem được. Phạm vi admin đã chọn giữ nguyên nguyên tắc này; cần bổ sung mô tả AI/chat khi triển khai.

## Options Considered

| Lựa chọn | Giả định / điều kiện thất bại | Đánh đổi / kết luận |
|---|---|---|
| Chỉ chatbot hướng dẫn với nguồn nội bộ | Không đủ nguồn nếu thiếu tài liệu hướng dẫn được duyệt | Phạm vi ban đầu được mở rộng theo lựa chọn người dùng: tài liệu quản trị và kho học liệu đã duyệt |
| Chỉ quản trị AI/RAG | Không đáp ứng nhu cầu quản trị các module còn lại | Người dùng chọn quản trị toàn hệ thống gồm 9 nhóm |
| Admin đọc toàn bộ dữ liệu giáo viên | Xung đột phạm vi riêng tư được chủ dự án chọn | Không chọn; admin chỉ được thông tin tài khoản, tổng hợp và nội dung công khai |
| Chat chỉ tồn tại trong phiên / lưu vô hạn | Mất khả năng xem lại hoặc tăng dữ liệu lưu không cần thiết | Người dùng chọn lưu theo tài khoản 30 ngày, xóa ngay được |
| Đổi key bất kỳ khi quota hết | Thất bại với nhiều key cùng project vì dùng chung quota | Quản lý key dự phòng theo lỗi, nhóm quota và cooldown; thông báo khi hết cấu hình dùng được |

## Decision

### Phạm vi quản trị được xác nhận

| Nhóm | Chức năng sản phẩm |
|---|---|
| Tổng quan | Thống kê tổng hợp giáo viên, quiz, học liệu, hoạt động và tình trạng AI |
| Tài khoản & phân quyền | Tìm tài khoản, khóa/mở, cấp/thu hồi quyền admin; không hiển thị nội dung riêng |
| AI & API | Chọn model, quản lý key dự phòng, kiểm tra kết nối, đặt giới hạn sử dụng, bật/tắt chatbot |
| Tài liệu RAG | Tải PDF/DOCX có chữ, phân loại môn/lớp, xem tiến trình/lỗi, cập nhật, gỡ, lập chỉ mục lại |
| Duyệt học liệu | Xem bản gửi duyệt, duyệt/từ chối có lý do, xử lý báo cáo, ẩn/khôi phục |
| Danh mục game | Thêm/sửa metadata, nguồn nhúng, môn/lớp, trạng thái hiển thị; kiểm tra URL/nguồn nhúng |
| Thành viên & đơn | Xem gói/hạn/đơn, cấp/thu hồi Premium thủ công có lý do; payOS chưa kích hoạt |
| Cấu hình website | Thông tin liên hệ, thông báo, FAQ và bật/tắt các tính năng được hỗ trợ |
| Nhật ký & vận hành | Nhật ký thao tác admin, lỗi AI, tiến trình lập chỉ mục và job xóa dữ liệu; không chứa chat, tài liệu trích xuất hoặc khóa gốc |

### Định hướng UX cho bước lập kế hoạch

- Popup chỉ mở khi giáo viên bấm “Hỏi SmartTeach”, ở góc dưới bên phải. Có đóng/thu nhỏ, hội thoại mới, lịch sử và xóa hội thoại.
- Desktop dùng khung chat gọn; mobile dùng sheet lớn thích ứng bàn phím, safe area và WCAG AA. Bố cục/chiều rộng cụ thể là chi tiết có thể điều chỉnh khi thiết kế.
- Nền sáng, dùng hệ màu/token và component hiện có; chuyển động nhẹ, tắt theo reduced motion. Không tự mở, không nhấp nháy hoặc dùng mascot gây mất tập trung.
- Đề xuất ẩn ở màn hình học sinh, quiz đang chơi và các chế độ fullscreen; không che nội dung đang dạy hoặc modal khác. Kiểm tra route/fullscreen cụ thể ở bước lập kế hoạch.
- Gợi ý câu hỏi theo trang hiện tại bằng ngữ cảnh route được phép; không đọc tự động nội dung lớp hoặc quiz riêng.
- Trạng thái: đóng/mở, chưa có chat, đang tìm nguồn, đang trả lời, thiếu nguồn/hỏi thêm, lỗi kết nối, bị giới hạn, đã tắt bởi admin và lịch sử trống.
- Câu trả lời có dẫn nguồn do hệ thống kiểm chứng; tài liệu dẫn tên/trang PDF hoặc mục/đoạn DOCX, học liệu dẫn URL preview thật. Không bịa nguồn hoặc số trang DOCX.
- Admin có shell riêng, sidebar 9 nhóm, danh sách có tìm kiếm/lọc và trang chi tiết. Trạng thái tài liệu: chờ xử lý, đang xử lý, sẵn sàng, lỗi, đã gỡ.

### Định hướng kỹ thuật cho bước lập kế hoạch

- Dùng API server Next.js kiểm tra đăng nhập/quyền và giới hạn sử dụng trước khi gọi Gemini. Quyền admin lưu trong nguồn chỉ server được sửa, không tin role do client hoặc user metadata tự khai.
- Tạo embedding và lưu vào Supabase/pgvector; mỗi chunk giữ văn bản, nguồn, vị trí trích dẫn, phiên bản và trạng thái hiển thị bên cạnh vector. Không chỉ lưu vector.
- Nạp tài liệu là tiến trình có trạng thái, có thể thử lại có kiểm soát; tài liệu chỉ được truy vấn khi phiên bản đã sẵn sàng. Không gửi nguyên tài liệu trong mỗi lượt chat.
- Retrieval chỉ dùng tài liệu đang hoạt động và payload học liệu đã duyệt phù hợp mục tiêu tìm kiếm. Không nạp đáp án từ snapshot riêng hoặc dữ liệu của giáo viên vào kho dùng chung.
- Việc gỡ/ẩn nguồn có hiệu lực ngay tại retrieval, kể cả khi cleanup vector/cache thực hiện sau đó. Có đồng bộ cập nhật/thu hồi học liệu.
- Chat model có thể cấu hình; model embedding, chiều vector và cách chuẩn hóa phải đồng bộ giữa tài liệu và query. Đổi embedding model cần phiên bản/lập chỉ mục lại, không trộn vector không tương thích.
- Key lỗi xác thực được đánh dấu, lỗi tạm thời dùng retry/cooldown có giới hạn; quota cạn được ghi theo project/model. Chỉ dùng cấu hình dự phòng hợp lệ có quota, không hứa tăng quota bằng cách đổi key.
- Lịch sử theo owner/RLS, không vào kho vector tri thức chung. Log vận hành chỉ giữ metadata cần thiết; admin không có endpoint đọc nội dung chat.

## Reasoning

Phạm vi này giải quyết cả nơi cấu hình và nguồn dữ liệu để chatbot vận hành, đồng thời giữ kiến trúc Supabase và nguyên tắc dữ liệu riêng hiện có. Bộ 9 nhóm là phạm vi sản phẩm được xác nhận, không có nghĩa phải triển khai đồng thời hoặc xây một framework quản trị tổng quát. `hs-plan` cần xác định phụ thuộc và các phần có thể kiểm chứng riêng.

### Bổ sung đã được người dùng chốt khi khảo sát lập kế hoạch

- Tác vụ nền dùng hạ tầng hiện có: Supabase Cron gọi endpoint Next.js xử lý từng lô, job/trạng thái/checkpoint lưu trong Postgres. Không thêm worker Node.js chạy liên tục hoặc bật Edge Runtime.
- Quy mô chưa xác định; bắt đầu bằng kho nhỏ: tối đa khoảng 50 tệp quản trị đang hoạt động, mỗi tệp tối đa 10 MB và 200 trang PDF. Khi vượt giới hạn, admin được xem lý do rõ ràng. DOCX không giả định số trang cố định; giới hạn văn bản/giải nén được định lượng trong kế hoạch.
- Chat 30 ngày và cleanup nguồn được lập lịch độc lập với traffic. Cấu hình Cron/pg_net/secret cần được nghiệm thu trên môi trường đích trước khi công bố luồng vận hành thật.

## Acceptance Criteria

1. Giáo viên đăng nhập mở được popup trên desktop/mobile, dùng được bằng bàn phím và reduced motion; khách/học sinh không gọi được API chat.
2. Câu hỏi hướng dẫn và tìm học liệu dùng đúng nguồn đang được phép; nguồn không đủ phải báo thiếu/hỏi thêm, không tự dựng nguồn hoặc trả dữ liệu riêng.
3. Admin nạp được PDF/DOCX có chữ và theo dõi tiến trình/lỗi. Tài liệu sẵn sàng được truy xuất với trích dẫn đúng; cập nhật/gỡ không để nguồn cũ tiếp tục xuất hiện.
4. Học liệu chỉ được chatbot đề xuất khi approved; ẩn/thu hồi phải có hiệu lực với cả tìm kiếm và cache liên quan.
5. Chỉ admin truy cập được 9 nhóm quản trị và API tương ứng; teacher không tự nâng quyền. Không có đường đọc raw API key hoặc dữ liệu riêng của giáo viên qua admin, export, log hay API phụ.
6. Nhiều key cùng nhóm quota không gây vòng retry. Giả lập lỗi key, 429, timeout, hết toàn bộ cấu hình và phục hồi đều có trạng thái rõ; không tự gọi model trả phí.
7. Hai giáo viên không đọc được chat của nhau; xóa ngay làm chat không còn truy xuất/dùng làm context. Job 30 ngày hoạt động cả khi không có traffic; dữ liệu hết hạn không được đưa lại vào context.
8. Thao tác cấp/thu hồi admin, đổi cấu hình AI, duyệt/ẩn nguồn và điều chỉnh Premium có audit metadata phù hợp, không ghi nội dung riêng hoặc khóa.
9. Thay đổi admin/catalog/config không làm mất đường dùng game, tiện ích, quiz, giao bài, học liệu và giá trị đơn đã tạo. payOS vẫn chưa kích hoạt.

## Open Questions / Risks

Không còn câu hỏi phạm vi sản phẩm đang chờ trả lời. Các điểm cần xác minh/định lượng khi `hs-plan` khảo sát triển khai:

- Model Gemini/embedding còn hỗ trợ Free Tier, quota thực tế của project và API key thật khi cấu hình; không cố định số lượt miễn phí từ tài liệu tại một thời điểm.
- Chất lượng trích xuất tiếng Việt, giới hạn runtime thực tế và smoke test scheduler: đã chọn Next.js xử lý theo lô + Supabase Cron, kho nhỏ như bổ sung ở trên; không còn lựa chọn worker đang chờ chốt.
- Cơ chế tạo admin đầu tiên qua đường server tin cậy, bảo vệ admin cuối cùng và hiệu lực khóa/thu hồi phiên; không tự cấp role bằng email công khai hoặc client.
- Thiết kế chuyển cấu hình/game từ mã nguồn sang DB và giữ bất biến giá các đơn cũ. Giá gói thay đổi động chưa được chốt thành chức năng; không tự mở rộng thành công cụ thay đổi giá tùy ý.
- Điều kiện xử lý dữ liệu Gemini Free Tier, quyền với tài liệu và nội dung chính sách AI/chat; cần rà trước khi đưa dịch vụ thật vào sử dụng.
- Visual hiện ở mức định hướng ý tưởng theo DESIGN.md; chưa yêu cầu hoặc thực hiện mockup hi-fi, sinh ảnh hay code UI.

## Sources

- [Gemini rate limits — quota theo project](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Gemini pricing / Free Tier](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini additional terms — dữ liệu ở dịch vụ miễn phí](https://ai.google.dev/gemini-api/terms)
- [Supabase RAG with permissions](https://supabase.com/docs/guides/ai/rag-with-permissions)
- [OWASP RAG Security](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html)
