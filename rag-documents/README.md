# Kho tài liệu RAG SmartTeach

Bộ hướng dẫn tiếng Việt dành cho giáo viên, đối chiếu mã nguồn SmartTeach ngày 15/11/2026. Tài liệu giúp chatbot giải thích cách dùng hệ thống và cách tìm học liệu; không thay thế giáo trình môn học.

## Cấu trúc

- `source/corpus.json`: nội dung gốc và bằng chứng theo từng chủ đề.
- `source/*.md`: bản đọc và rà soát, được sinh từ nội dung gốc.
- `ready/*.docx`: tài liệu có chữ để quản trị viên tải vào kho RAG.
- `manifest.json`: danh mục, phiên bản, mã kiểm tra và nguồn đối chiếu.
- `evaluation/questions.json`: câu hỏi nghiệm thu và tiêu chí trả lời.
- `build-corpus.py`: sinh lại tài liệu sau khi cập nhật nội dung gốc.
- `validate-corpus.mjs`: kiểm tra DOCX bằng bộ trích xuất và chia đoạn thực tế của dự án.

## Tải lên và nghiệm thu

1. Cấu hình AI/API và tác vụ nền theo [hướng dẫn vận hành](../docs/admin-rag-operations.md). Chỉ nhập Gemini API key trong giao diện quản trị; không đặt key trong tài liệu hay gửi vào chatbot.
2. Mở `/admin/rag/documents`. Màn hình phải báo đủ điều kiện nạp: khóa mã hóa, worker, scheduler, credential và heartbeat. Bộ tài liệu có thể được chuẩn bị trước khi các dịch vụ này sẵn sàng.
3. Tải lần lượt **9 tệp trong `ready/`**, thứ tự `01` đến `09`. Dùng tiêu đề theo bảng bên dưới hoặc `manifest.json`, Môn học chọn **Hướng dẫn chung**, Khối lớp để trống. Đây là tài liệu hướng dẫn dùng sản phẩm, không gắn giả môn Toán/lớp 6.
4. Đợi từng tài liệu chuyển sang trạng thái **ready**. Tệp nằm trên máy hoặc tải lên xong chưa đồng nghĩa đã có vector sẵn sàng. Không tải README, JSON, báo cáo QA hoặc tài liệu vận hành nội bộ vào kho giáo viên.
5. Đăng nhập tài khoản giáo viên, chạy 30 câu trong `evaluation/questions.json`, kiểm tra câu trả lời cùng nguồn trích dẫn. Ca thiếu nguồn hoặc yêu cầu dữ liệu riêng phải được xử lý phù hợp. Chưa thực hiện đánh giá với Gemini thật trong đợt tạo tài liệu này.

| Tệp DOCX | Nội dung |
| --- | --- |
| `01-bat-dau-va-tai-khoan.docx` | Bắt đầu, đăng ký, đăng nhập, phạm vi tài khoản |
| `02-lop-hoc-va-danh-sach.docx` | Lớp, danh sách học sinh, dùng lớp trong công cụ |
| `03-soan-nhap-va-chia-se-quiz.docx` | Bốn loại câu, nhập Excel/CSV/văn bản, chia sẻ |
| `04-to-chuc-quiz-truc-tiep.docx` | PIN, mở phiên, tự động, kho báu, kết quả |
| `05-soan-de-va-giao-bai-online.docx` | Bản nháp, phát hành, mã riêng, bài làm, Premium |
| `06-tim-va-chia-se-hoc-lieu.docx` | Tìm, xem trước, sao chép, gửi duyệt, nguồn RAG |
| `07-tien-ich-va-kho-game.docx` | Đồng hồ, bốc thăm, chia nhóm, bảng trắng, game |
| `08-goi-thanh-vien-va-thanh-toan.docx` | Free, Premium, gia hạn, payOS đang hoãn |
| `09-tro-ly-rag-va-xu-ly-su-co.docx` | Chatbot, trích dẫn, thiếu nguồn, lịch sử, riêng tư |

Kho RAG dùng chung cho giáo viên: chỉ đưa vào tài liệu được phép chia sẻ và gửi tới nhà cung cấp AI. **Thư mục này không tự đồng bộ vào Supabase, chưa tạo vector và chưa được tải lên hệ thống.**

## Cập nhật tài liệu

Sửa `source/corpus.json` làm bản gốc, tăng phiên bản rồi sinh lại bằng `python rag-documents/build-corpus.py` trong môi trường có `python-docx`. Không sửa riêng DOCX hoặc Markdown sinh ra vì lần dựng sau sẽ ghi đè. `manifest.json` lưu SHA-256 nội dung, tệp DOCX và các tệp code đã đối chiếu; khi code nguồn thay đổi cần rà soát nội dung trước khi dựng lại, không chỉ thay hash để vượt kiểm tra.

Kiểm tra trích xuất bằng Node 24 từ thư mục dự án:

```powershell
node --conditions=react-server rag-documents/validate-corpus.mjs
```

Lệnh trên gọi đúng `extractDocx` và `chunkSections` của dự án, không gọi Gemini hoặc cơ sở dữ liệu. Câu hỏi và câu trả lời được giữ chung một đoạn Word, có thể trích dẫn theo vị trí đoạn, để tránh lấy câu hỏi mà mất phần trả lời. Báo cáo nằm ở `qa/validation.json`; kiểm tra này chỉ chứng minh tính tương thích văn bản và chia đoạn, không đo chất lượng tìm kiếm vector hoặc chất lượng trả lời của mô hình.

Sau chỉnh sửa, render DOCX và rà soát bố cục, kiểm lại Unicode và nội dung rồi dùng **Thay phiên bản tài liệu** trong admin cho đúng nguồn đã nạp. Không tải thêm nguồn trùng chỉ để cập nhật. **Lập chỉ mục lại** dùng tệp đang có trên server, không tự lấy bản mới trong thư mục local. Khi payOS thật được kích hoạt, phải cập nhật mục trạng thái trong tài liệu 08 và thay phiên bản trên kho trước khi để chatbot hướng dẫn thanh toán.

## Phạm vi và dữ liệu riêng tư

- Tạo ngày **16/11/2026**, dựa trên code và quyết định sản phẩm đã đối chiếu từ ngày 15/11/2026. Nội dung mô tả hành vi có trong code, không xác nhận mọi cấu hình hoặc tích hợp production đã được bật.
- Bộ này có **64 mục hỏi đáp hướng dẫn sản phẩm**. Không chứa giáo trình môn học, nguồn học liệu đã duyệt giả, tên/lớp/điểm học sinh thật, API key, thông tin tài khoản thực hoặc nội dung chat riêng.
- Học liệu theo môn cần bổ sung từ tài liệu bạn có quyền sử dụng hoặc các bản đã duyệt trong kho. Chưa có nguồn phù hợp thì chatbot cần báo thiếu nguồn; không bịa tên tài liệu để trả lời.
- Hạn mức chat, thông tin liên hệ, FAQ và game có thể được quản trị đổi. Thông tin hiển thị và trạng thái của môi trường đang dùng cần được kiểm tra khi hỗ trợ một trường hợp cụ thể.
- `docs/admin-rag-operations.md` phục vụ người vận hành, không nằm trong bộ DOCX dùng cho chatbot giáo viên.
