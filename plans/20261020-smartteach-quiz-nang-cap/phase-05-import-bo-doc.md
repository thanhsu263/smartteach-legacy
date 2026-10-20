# Phase 5 - Import: bộ đọc tệp và văn bản

## Overview

Phần thuần logic, chưa có giao diện và chưa chạm cơ sở dữ liệu: biến tệp CSV, tệp `.xlsx` hoặc văn bản dán thành danh sách câu hỏi cùng báo cáo lỗi theo dòng. Tách riêng vì kiểm tra được hoàn toàn bằng test đơn vị, và vì đây là nơi chứa cổng quyết định về thư viện `.xlsx`. Độc lập với phase 1-4.

## Files

- Mới: `src/lib/quiz/import/types.ts`, `csv.ts`, `xlsx.ts`, `rows.ts`, `text.ts`, `template.ts`, `index.ts` và test tương ứng (`csv.test.ts`, `rows.test.ts`, `text.test.ts`, `template.test.ts`, `xlsx.test.ts`); `tests/fixtures/make-quiz-xlsx.mjs` (sinh tệp mẫu) và `tests/fixtures/quiz-mau.xlsx`, `tests/fixtures/quiz-mau.csv`.
- Sửa: `package.json` và lockfile (thêm `read-excel-file` đúng `9.3.12`).

## Tasks

- [x] **5.1 Cổng quyết định thư viện `.xlsx` (làm đầu tiên).** Thêm `read-excel-file@9.3.12` (đúng phiên bản, không `^`). Viết `xlsx.ts` bọc `readSheet` từ `read-excel-file/browser`, **nạp bằng `import()` động** để không vào gói chính, nhận `File`/`ArrayBuffer`, trả mảng hàng-ô chuẩn (`string[][]`), bắt mã lỗi (`XLS_FILE_NOT_SUPPORTED`, `INVALID_ZIP`, `FILE_NOT_SUPPORTED`, `SheetNotFoundError`) thành lời nhắn tiếng Việt, và giới hạn: tệp ≤ 1 MB, chỉ đọc sheet đầu, tối đa 500 hàng. Kiểm tra bắt buộc trước khi làm tiếp: `npm run build` thành công; bản dựng chạy được trên trình duyệt (một trang thử gọi `xlsx.ts` với `tests/fixtures/quiz-mau.xlsx`, kiểm trong e2e ở phase 6); đo kích thước gói tải thêm khi mở trang nhập (ghi vào notes). **Nếu không bundle/chạy được, hoặc phình quá mức hợp lý cho một trang ít dùng, dừng và quay lại `hs-brainstorm`** để bỏ `.xlsx` (giữ CSV và dán văn bản); không tự đổi sang thư viện khác. `npm audit --omit=dev` phải vẫn 0 lỗ hổng.
- [x] **5.2 Bộ đọc CSV.** `parseCsv(text)`: RFC 4180 (ngoặc kép, `""`, xuống dòng trong ô), bỏ BOM, nhận cả `\r\n` và `\n`, tự dò dấu phân cách `,` / `;` / tab theo hàng tiêu đề (Excel tiếng Việt thường lưu `;`), trả `string[][]`. Phát hiện chữ lỗi mã hoá (ký tự `�`) và trả cảnh báo "Hãy lưu file ở dạng CSV UTF-8 hoặc dùng .xlsx". Giới hạn 1 MB và 500 hàng. Kiểm tra: `csv.test.ts` gồm tiếng Việt có dấu (dựng sẵn và tổ hợp, chuẩn hoá NFC), ô có dấu phẩy/ngoặc kép/xuống dòng, dấu `;`, BOM, hàng trống cuối, tệp lớn quá cỡ, mã hoá hỏng.
- [x] **5.3 Ánh xạ hàng thành câu hỏi.** `rowsToQuestions(rows)` nhận hàng-ô (từ CSV hoặc xlsx), đọc **hàng tiêu đề** (không phân biệt hoa thường/dấu, có tên đồng nghĩa): `Loại`, `Câu hỏi`, `Lựa chọn A..F` (hoặc `A..F`), `Đáp án đúng`, `Thời gian`, `Đáp án chấp nhận`, `Bỏ dấu`. Quy tắc: loại để trống thì suy ra (có đáp án chấp nhận → điền từ; hai lựa chọn "Đúng"/"Sai" → đúng/sai; nhiều đáp án đúng → nhiều đáp án; còn lại → một đáp án); `Đáp án đúng` nhận chữ cái (`B`, `A,C`), số (`1,3`) hoặc nguyên văn lựa chọn; `Thời gian` thuộc `TIME_LIMITS` (giá trị khác → cảnh báo và dùng mặc định 20); `Đáp án chấp nhận` ngăn bằng `|`; `Bỏ dấu` nhận `có/không/1/0/x`. Mỗi câu kèm số dòng gốc. Lỗi **chặn** (thiếu câu hỏi, sai số lựa chọn, không có đáp án đúng, quá giới hạn độ dài trong `limits.ts`, trùng lựa chọn, quá `MAX_QUESTIONS_PER_QUIZ`) và **cảnh báo** (thời gian bị thay) được tách bạch và dùng chung `questionProblems`/`checkDraft` của `validate.ts` để luật giống hệt trình soạn. Làm sạch chuỗi: bỏ ký tự điều khiển, chuẩn hoá NFC, cắt khoảng trắng. Kiểm tra: `rows.test.ts` cho cả bốn dạng câu, mọi cách ghi đáp án đúng, các lỗi theo dòng, giới hạn.
- [x] **5.4 Bộ đọc văn bản dán.** `parseQuizText(text)` theo cú pháp: các câu cách nhau bằng dòng trống; dòng đầu là câu hỏi (tiền tố `Câu 1:`/`1.` bị bỏ); lựa chọn là các dòng bắt đầu `A.` `A)` `a.`; đáp án đúng đánh dấu bằng `*` trước lựa chọn hoặc dòng `Đáp án: B` / `Đáp án: A, C`; không có lựa chọn mà có `Đáp án: mèo | con mèo` là câu điền từ; hai lựa chọn "Đúng"/"Sai" là câu đúng/sai; thời gian tuỳ chọn ở cuối dòng câu hỏi dạng `[30s]`. Cùng định dạng kết quả và báo lỗi như 5.3 (số dòng trong văn bản). Kiểm tra: `text.test.ts`, và một bài kiểm "tương đương": cùng một bộ câu ở dạng CSV, xlsx và dán văn bản cho ra `QuestionInput[]` giống nhau.
- [x] **5.5 Tệp mẫu và ví dụ cú pháp.** `buildTemplateCsv()` trả CSV UTF-8 có BOM với tiêu đề và đủ 4 dạng câu làm ví dụ; `TEXT_SYNTAX_EXAMPLE` là chuỗi ví dụ cú pháp dán. `tests/fixtures/make-quiz-xlsx.mjs` dựng `quiz-mau.xlsx` bằng `fflate` (đã là phụ thuộc gián tiếp) từ cùng dữ liệu rồi lưu tệp nhị phân vào repo. Kiểm tra: `template.test.ts` đọc lại chính mẫu và khớp bộ câu kỳ vọng; `xlsx.test.ts` (chạy trong Node bằng `read-excel-file/node`) đọc `quiz-mau.xlsx` ra cùng bộ câu như `quiz-mau.csv`.

## Acceptance criteria

- Tệp mẫu CSV, tệp mẫu `.xlsx` và văn bản dán ví dụ cho ra cùng bộ câu hỏi, đủ 4 dạng.
- Lỗi chặn báo đúng dòng và lý do bằng tiếng Việt; vượt 50 câu bị từ chối; mã hoá hỏng được phát hiện và hướng dẫn cách sửa.
- Luật kiểm hợp lệ giống trình soạn (cùng hàm).
- Cổng 5.1 đạt (build và kích thước ghi lại) hoặc đã quay lại brainstorm; `npm audit` sạch.

## Risks

- API `read-excel-file` đổi giữa các bản chính: ghim đúng 9.3.12 và có test đọc tệp mẫu để bắt khi nâng cấp.
- Phân tích XML đồng bộ có thể làm đứng trang với tệp lớn: giới hạn 1 MB/500 hàng chặn trước khi đọc.
- Cách người dùng soạn tệp rất đa dạng (ô gộp, nhiều sheet, dòng tiêu đề lệch): chỉ hỗ trợ mẫu đã công bố và báo lỗi rõ khi không nhận ra cột; không đoán.
