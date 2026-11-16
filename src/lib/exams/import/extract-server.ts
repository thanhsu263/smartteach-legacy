import "server-only";
import { createHash } from "node:crypto";
import { unzipSync, Unzip, UnzipInflate } from "fflate";
import mammoth from "mammoth";
import readXlsxFile from "read-excel-file/node";
import { MAX_EXAM_FILE_BYTES, type SourceText } from "./types";
export function examHash(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
export function validateExamBytes(bytes: Uint8Array) { if (bytes.byteLength < 1 || bytes.byteLength > MAX_EXAM_FILE_BYTES) throw new Error("Tệp cần nhỏ hơn hoặc bằng 2 MiB."); }
function guardedZip(bytes: Uint8Array) {
  validateExamBytes(bytes);
  let entries = 0, declared = 0, expanded = 0;
  unzipSync(bytes, { filter: f => { entries++; declared += f.originalSize; if (entries > 2000 || declared > 30 * 1024 * 1024 || f.originalSize > 30 * 1024 * 1024) throw new Error("Tệp giải nén quá lớn."); return false; } });
  const stream = new Unzip(f => { f.ondata = (error, chunk) => { if (error) throw new Error("Tệp ZIP không hợp lệ."); expanded += chunk.length; if (expanded > 30 * 1024 * 1024) { f.terminate(); throw new Error("Tệp giải nén quá lớn."); } }; f.start(); });
  stream.register(UnzipInflate);
  for (let i = 0; i < bytes.length; i += 16384) stream.push(bytes.subarray(i, i + 16384), i + 16384 >= bytes.length);
  return unzipSync(bytes);
}
export async function examDocxText(bytes: Uint8Array): Promise<SourceText[]> {
  const zip = guardedZip(bytes);
  if (!zip["word/document.xml"] || !zip["[Content_Types].xml"]) throw new Error("Không phải DOCX hợp lệ.");
  const xml = new TextDecoder().decode(zip["word/document.xml"]);
  if (/<(?:w:drawing|w:pict|w:object|m:oMath)\b/.test(xml)) throw new Error("Tệp có hình ảnh hoặc công thức. Bản đầu chỉ hỗ trợ nội dung có chữ.");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  if (result.value.length > 100000 || !result.value.trim()) throw new Error("Tệp không có chữ hoặc vượt 100.000 ký tự.");
  return result.value.split(/\n\s*\n/).filter(s => s.trim()).map((text, i) => ({ text, locator: { paragraph: i + 1 } }));
}
export async function examXlsxRows(bytes: Uint8Array) {
  const zip = guardedZip(bytes);
  if (!zip["xl/workbook.xml"]) throw new Error("Không phải XLSX hợp lệ.");
  for (const [name, content] of Object.entries(zip)) {
    if (name.includes("/media/") || /vbaProject/i.test(name) || (/^xl\/worksheets\/.*\.xml$/.test(name) && /<f(?:\s|>)/.test(new TextDecoder().decode(content)))) throw new Error("Mẫu nhập không hỗ trợ hình ảnh, macro hoặc ô công thức.");
  }
  const sheets = await readXlsxFile(Buffer.from(bytes));
  const nonempty = sheets.filter(s => s.data.some(row => row.some(cell => cell !== null && String(cell).trim())));
  if (nonempty.length !== 1) throw new Error("Giữ một sheet có nội dung trong tệp mẫu trước khi nhập.");
  if (nonempty[0].data.length > 501) throw new Error("Tệp vượt 500 hàng dữ liệu.");
  const rows = nonempty[0].data.map(row => row.map(cell => cell === null ? "" : String(cell)));
  if (JSON.stringify(rows).length > 100000) throw new Error("Nội dung tệp vượt 100.000 ký tự.");
  return rows;
}
export async function examPdfBatch(bytes: Uint8Array, start: number) {
  validateExamBytes(bytes);
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" || !Number.isInteger(start) || start < 0 || start >= 30) throw new Error("PDF hoặc vị trí trang không hợp lệ.");
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), verbosity: 0, useSystemFonts: true, disableFontFace: true });
  const timer = setTimeout(() => { void task.destroy().catch(() => {}); }, 15000);
  try {
    const doc = await task.promise;
    if (doc.numPages > 30 || start >= doc.numPages) throw new Error("PDF tối đa 30 trang.");
    const end = Math.min(start + 5, doc.numPages), sections: SourceText[] = [];
    for (let i = start; i < end; i++) {
      const page = await doc.getPage(i + 1);
      const ops = await page.getOperatorList();
      if (ops.fnArray.some(n => [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat].includes(n))) throw new Error(`Trang ${i + 1} có hình/ảnh scan. Chỉ nhận PDF có chữ.`);
      const content = await page.getTextContent();
      const text = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
      if (text.length > 100000) throw new Error("Trang vượt giới hạn nội dung.");
      sections.push({ text, locator: { page: i + 1 } }); page.cleanup();
    }
    return { hash: examHash(bytes), sections, cursor: end, totalPages: doc.numPages, done: end === doc.numPages };
  } finally { clearTimeout(timer); await task.destroy(); }
}
