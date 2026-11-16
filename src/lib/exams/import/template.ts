import { zipSync, strToU8 } from "fflate";
import { makeCsv } from "@/lib/export/csv";
import { TEMPLATE_COLUMNS } from "./types";
export const EXAM_SAMPLE_ROWS = [
  ["Phần I", "single", "Số nào sau đây là số nguyên tố?", "12", "17", "21", "27", "", "", "B", "[]", "false", "1.25"],
  ["Phần I", "true_false", "Trái Đất quay quanh Mặt Trời.", "Đúng", "Sai", "", "", "", "", "A", "[]", "false", "0.75"],
  ["Phần II", "multi", "Chọn các số chẵn.", "2", "3", "4", "5", "6", "7", "A|C|E", "[]", "false", "2.5"],
  ["Phần II", "short_text", "Con vật nào kêu meo meo?", "", "", "", "", "", "", "", '["mèo","con mèo"]', "true", "1.5"],
];
export function examTemplateCsv() { return makeCsv(TEMPLATE_COLUMNS, EXAM_SAMPLE_ROWS); }
export function examTemplateText() {
  const out = ["SMARTTEACH-EXAM:1"]; let section = "";
  const keys: Record<string, string> = { kind: "LOẠI", points: "ĐIỂM", prompt: "NỘI DUNG", correct: "ĐÁP ÁN", accepted_answers: "CHẤP NHẬN", ignore_diacritics: "BỎ DẤU" };
  EXAM_SAMPLE_ROWS.forEach((row, index) => {
    const get = (name: string) => row[TEMPLATE_COLUMNS.indexOf(name)];
    if (section !== row[0]) { section = row[0]; out.push(`PHẦN: ${section}`); }
    out.push(`CÂU: ${index + 1}`);
    for (const key of ["kind", "points", "prompt"]) out.push(`${keys[key]}: ${get(key)}`);
    for (let i = 0; i < 6; i++) if (get(`option_${String.fromCharCode(97 + i)}`)) out.push(`${String.fromCharCode(65 + i)}: ${get(`option_${String.fromCharCode(97 + i)}`)}`);
    if (get("correct")) out.push(`ĐÁP ÁN: ${get("correct")}`);
    out.push(`CHẤP NHẬN: ${get("accepted_answers")}`, `BỎ DẤU: ${get("ignore_diacritics")}`);
  });
  return out.join("\n");
}
const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export function examTemplateXlsx() {
  const rows = [TEMPLATE_COLUMNS, ...EXAM_SAMPLE_ROWS];
  const sheet = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows.map((row, r) => `<row r="${r + 1}">` + row.map((cell, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join("") + '</row>').join("") + '</sheetData></worksheet>';
  return zipSync({
    "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    "_rels/.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    "xl/workbook.xml": strToU8('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="De mau" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    "xl/_rels/workbook.xml.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  });
}
export const EXAM_TEMPLATE_GUIDE = `MẪU NHẬP ĐỀ SMARTTEACH V1
Free: nhập theo mẫu; Premium có thêm AI đọc bố cục tự do. Không OCR, ảnh hoặc công thức.
Tệp tối đa 2 MiB; PDF có chữ tối đa 30 trang; tối đa50 câu,10 phần. Không tệp macro/mật khẩu.
Excel/CSV: giữ nguyên tên tất cả cột. Mỗi câu một hàng; chỉ một sheet có nội dung.
kind: single, true_false, multi, short_text. Lựa chọn A–F liên tiếp, không để ô rỗng ở giữa.
correct: A hoặc A|C|E. Đúng/Sai: option_a=Đúng, option_b=Sai. Không dùng correct cho short_text.
accepted_answers: mảng JSON chuỗi, ví dụ ["mèo","con mèo"]. Chỉ dùng cho short_text; các loại khác là [].
points: 0.01–100, tối đa2 chữ số thập phân. ignore_diacritics: true/false.
Word/PDF: giữ dòng SMARTTEACH-EXAM:1, PHẦN:, CÂU:, tên trường như mẫu. Mỗi trường một dòng; nội dung tiếp dòng bắt đầu bằng | và dấu cách. Không thêm hướng dẫn này vào tệp đề.
Không dùng bảng nhiều cột hoặc textbox. PDF nên xuất trực tiếp từ văn bản một cột.
Sau khi đọc phải xem lại câu hỏi/đáp án/điểm. Thiếu đáp án cần bổ sung, hệ thống không tự suy đáp án.
Tên đề và thời lượng được chỉnh ở màn xem trước. Tệp gốc không được đưa vào kho RAG.
`;
