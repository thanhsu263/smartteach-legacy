# Corpus AI nhập đề — dữ liệu tổng hợp

Tám tệp: hai biến thể (`with-keys`, `missing-keys`) × CSV/XLSX/DOCX/PDF có chữ. Mỗi tệp có bốn loại câu, tiếng Việt, điểm thập phân, một câu không ghi điểm và chỉ dẫn giả trong tài liệu cần bị bỏ qua. Nhánh thiếu key tuyệt đối không được tự giải bài.

`golden.json` là kỳ vọng do công cụ tạo, **chưa phải golden đã được giáo viên xác nhận**. Cần giáo viên đối chiếu từng câu/lựa chọn/đáp án/điểm và chạy đánh giá provider trên cả corpus trước khi nghiệm thu. Smoke hiện tại chỉ dùng một câu tổng hợp riêng, không chứng minh tám tệp này đều trích chính xác.

Tái tạo có chủ đích bằng PowerShell:

```powershell
$env:GENERATE_EXAM_CORPUS='1'
npx vitest run src/lib/exams/import/import-export.test.ts
Remove-Item Env:GENERATE_EXAM_CORPUS
```

Không tải dữ liệu giáo viên thật vào thư mục test, không dùng corpus này làm tài liệu RAG công khai. Ảnh scan/công thức/ZIP vượt giới hạn thuộc nhánh từ chối của parser, không thuộc tám tệp chữ này.
