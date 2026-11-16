# Phase 6 — Nhập theo mẫu và xuất Word/PDF

Implemented-local; xem [verification.md](./verification.md) để phân biệt kiểm chứng local và acceptance còn thiếu. AC21,24,25,30. Phụ thuộc5. Không dùng AI;4format là tiêu chí bắt buộc.

## Files

Hiện có: src/lib/quiz/import/{csv,xlsx,zip-guard,...}.ts; src/lib/rag/extract.ts; next.config.ts; package.json/package-lock.json.
Mới: src/lib/exams/import/{types,template,rows,text,parse}.ts và extract-server.ts; src/lib/exams/export/{print-model,docx,pdf}.ts; API parse/export theo contracts; components/exams/exam-import.tsx/module.css; public/templates/exams/ (4file+hướng dẫn); tests/fixtures/exams/; unit/parser tests; e2e/exam-import-export.spec.ts; font static TTF+license ở vị trí assets hiện hành hoặc src/assets/fonts/ mới.

## Tasks

- [x] **P6.1 Parser deterministic + corpus mẫu.** Triển khai grammar/schema templates contracts§6; giữ locator nguồn xuyên extract→parse→issues. CSV/XLSX dùng utility sẵn có khi cùng contract, không copy warning cắt hàng của quiz. DOCX/PDF text-only có ZIP/page/text/deadline bounds; kiểm resource bằng server trước xử lý lớn, reject protected/scan/unsupported/mixed content cần ảnh/công thức. Với PDF, /api/exams/parse mỗi request nhận cùng tệp≤2MiB và cursor, trả batch≤5page + hash/cursor/done/sections; client chỉ ghép khi đủ batch của cùng hash. Không giả30page luôn xong trong một30sfunction. Text assembly≤100k và parse hoàn tất chỉ khi done. Free không gọi Gemini/RAG.
  - Verify: golden tương đương ở4format,50questions4kind, page breaks/multiline/Việt/JSONaccepted/6options/decimal; invalid header/missing/duplicate field, PDF multi-column/out-of-order phải lỗi vị trí, scan/encrypted/image/formula, corruptZIP/expansion bomb/oversize/page31/row501. Không cắt hàng hoặc silently bỏ pages, không network fetch relationships.
- [x] **P6.2 Flow chọn → kiểm → nhập.** Tải template4format, thông báo text-only; mode theo mẫu mặc định Free. Preview editable từng câu với locator/totals/issues, field cần sửa; sửa trước confirm, input còn invalid có thể lưu nháp được gắn lỗi nhưng chưa publish/export hợp lệ. Confirm gọi create/save exam với requestId và revision, không tạo trùng khi retry. File parse lỗi giữ nguồn/chọn lại; đổi file hủy batch cũ, bỏ partial results. Không lưu source file vào RAG.
  - Verify: Figma36:60368/36:60509/36:60928 và browser4fileformats; entry mới WordPDF/shorttext/points rõ; parse/import/network error, keyboard editing/dropzone fallback, 375/768/1280. Tệp cùng tên nhưng nội dung khác không reuse batch sai.
- [ ] **P6.3 Xuất hai audience trên model chung.** Thêm docx+pdfkit dependency (pin version sau compatibility probe), embed TTF hỗ trợ Việt kèm license; tracing/font/PDF worker include áp đúng route mới, không chỉ RAG cũ. Validate owner+revision và model trước generate; student loại key khỏi model thực, teacher key riêng. Server generation bounded≤30s, output≤4MiB và≤60trang; vượt báo413, không file thiếu. Attachment no-store safe filename. DOCX editable, PDF text selectable, page breaks không cắt câu/options hoặc che footer.
  - Verify: production Next build Node24 route test (không chỉ chạy thư viện trực tiếp); DOCX unzip/read lại paragraphs+answers, PDF extract text+render từng trang, long prompt/50câu/nhiều phần/phân trang/Việt; so cùng revision/tổngđiểm và canary đáp án chỉ trong teacher file; owner khác/admin/anon không tải. Thử opening Word-compatible editor/PDF viewer thực. Nếu glyph/font/tracing fails thì sửa adapter, không chuyển thành ảnh hoặc bỏ PDF.

## Done

Có download fixtures và hướng dẫn nhập rõ cho4format; kết quả xuất phản ánh nội dung chuẩn hóa, không cam kết layout nguồn. Chỉ tạo code/template trong build, không cần skill tác giả tài liệu để lập plan; lúc tạo/QA file thật áp dụng skill định dạng liên quan.
