# Kiểm chứng bộ tài liệu RAG

Ngày kiểm tra: 16/11/2026. Phiên bản: 2026-11-16.1.

## VERIFIED

- `python rag-documents/build-corpus.py`: tạo 9 DOCX và 9 Markdown từ 64 mục hỏi đáp. Tổng DOCX khoảng 348 KiB, từng tệp dưới 40 KiB, nhỏ hơn giới hạn nạp 10 MiB.
- `node --conditions=react-server rag-documents/validate-corpus.mjs`: PASS. Gọi trực tiếp `extractDocx` và `chunkSections` của dự án; 91 đoạn, tất cả 64 cặp hỏi đáp giữ nguyên trong một đoạn, không mất dấu tiếng Việt, có vị trí đoạn để trích dẫn. Kiểm tra mã SHA-256 tệp và nguồn đối chiếu. Xem `validation.json`.
- Các tham chiếu trong 30 ca nghiệm thu đều trỏ tới mục nội dung tồn tại. Đây là kiểm tra tính hợp lệ bộ câu hỏi, chưa phải kết quả chạy mô hình.
- `render-corpus.ps1`: Microsoft Word mở DOCX read-only ở chế độ ẩn, xuất PDF cục bộ. Đã rasterize và đọc lại đầy đủ 16 trang PNG. Đã bỏ đường kẻ Title mặc định, cân đối trang để không tách riêng một câu trả lời ở trang cuối; không phát hiện cắt chữ, lỗi dấu hoặc chồng lấn.
- Đối chiếu đặc biệt: trang chia sẻ quiz cho đồng nghiệp hiển thị đáp án; trang xem trước học liệu công khai ẩn đáp án. Hai luồng được mô tả riêng.
- Nội dung chỉ là hướng dẫn hệ thống tự biên soạn và dữ liệu khái quát; không đọc hoặc đưa vào bộ tài liệu các secret, tài khoản, lớp, điểm học sinh hay chat thật.

## Sự cố đã xử lý

- Bộ trích xuất Mammoth bỏ soft line break trong Word. Lần kiểm tra đầu phát hiện câu hỏi và câu trả lời dính liền ở ranh giới. Đã thêm dấu cách thực trước soft break trong bộ sinh DOCX; kiểm tra lại xác nhận văn bản trích xuất đủ dấu phân tách và vẫn chung một đoạn. Không sửa parser của ứng dụng để né lỗi.
- `render_docx.py` mặc định không chạy được vì Windows chưa cài LibreOffice. Dùng Microsoft Word cài sẵn để render chính DOCX sang PDF rồi rasterize bằng Poppler. Đây là thiếu phụ thuộc môi trường render, không phải lỗi DOCX.

## UNVERIFIED và bước còn lại

- Chưa tải tài liệu lên Supabase, chưa tạo embedding/vector, chưa đánh giá retrieval hoặc câu trả lời với Gemini thật. Không có API call, thanh toán hay thay đổi cấu hình bên ngoài trong tác vụ tạo tài liệu này.
- Sau cấu hình, quản trị tải 9 DOCX tại `ready/` vào `/admin/rag/documents`, chọn Hướng dẫn chung và không chọn khối lớp, đợi ready rồi chạy bộ câu hỏi trong `evaluation/questions.json` bằng tài khoản giáo viên.
- Mô tả tính năng dựa code và quyết định được khảo sát ngày 15/11/2026. Cần kiểm lại cấu hình và dữ liệu của môi trường triển khai. payOS thật vẫn hoãn; trước khi kích hoạt phải cập nhật tài liệu 08 và thay phiên bản nguồn đang phục vụ.

Ảnh render và PDF chỉ là bản QA cục bộ trong `qa/render/`, được bỏ qua bởi Git. Không tải báo cáo này hoặc tài liệu vận hành quản trị vào kho dùng chung của giáo viên.
