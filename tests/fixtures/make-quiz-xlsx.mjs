// Sinh tệp mẫu để thử nhập quiz: quiz-mau.csv (bản mẫu giáo viên tải) và quiz-mau.xlsx (cùng nội dung, cột "Thời gian" là số).
// Chạy lại khi đổi bộ câu mẫu: `node tests/fixtures/make-quiz-xlsx.mjs`. Cần Node 22.18+ (đọc trực tiếp tệp .ts của mẫu).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import { buildTemplateCsv, TEMPLATE_HEADER, TEMPLATE_ROWS } from "../../src/lib/quiz/import/template.ts";

const here = dirname(fileURLToPath(import.meta.url));

const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const column = (index) => String.fromCharCode(65 + index);

const strings = [];
const stringIndex = (value) => {
  let at = strings.indexOf(value);
  if (at < 0) at = strings.push(value) - 1;
  return at;
};

// Hàng tiêu đề và các hàng dữ liệu; ô trống bỏ qua; cột thứ 10 (Thời gian) ghi dạng SỐ như Excel thường lưu.
const grid = [[...TEMPLATE_HEADER], ...TEMPLATE_ROWS];
const rows = grid
  .map((row, rowIndex) => {
    const cells = row
      .map((value, colIndex) => {
        if (value === "") return "";
        const ref = `${column(colIndex)}${rowIndex + 1}`;
        if (rowIndex > 0 && colIndex === 9 && /^\d+$/.test(value)) return `<c r="${ref}"><v>${value}</v></c>`;
        return `<c r="${ref}" t="s"><v>${stringIndex(value)}</v></c>`;
      })
      .join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  })
  .join("");

const xml = (body) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`;
const files = {
  "[Content_Types].xml": xml(
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
      "</Types>",
  ),
  "_rels/.rels": xml(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      "</Relationships>",
  ),
  "xl/workbook.xml": xml(
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Quiz" sheetId="1" r:id="rId1"/></sheets></workbook>',
  ),
  "xl/_rels/workbook.xml.rels": xml(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
      "</Relationships>",
  ),
  "xl/worksheets/sheet1.xml": xml(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`),
};
files["xl/sharedStrings.xml"] = xml(
  `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">` +
    strings.map((value) => `<si><t xml:space="preserve">${escapeXml(value)}</t></si>`).join("") +
    "</sst>",
);

const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)])));
writeFileSync(join(here, "quiz-mau.xlsx"), zip);
writeFileSync(join(here, "quiz-mau.csv"), buildTemplateCsv());
console.log(`Đã ghi quiz-mau.xlsx (${zip.length} byte) và quiz-mau.csv`);
