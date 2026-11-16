import "server-only";
import { Document, Footer, PageNumber, Paragraph, Packer, TextRun, AlignmentType } from "docx";
import type { PrintLine } from "./print-model";
export async function renderDocx(lines: PrintLine[], footer = true) {
  const doc = new Document({ creator: "SmartTeach", styles: { default: { document: { run: { font: "Be Vietnam Pro", size: 24 }, paragraph: { spacing: { after: 120 } } } } }, sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } },
    ...(footer ? { footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) } } : {}),
    children: lines.map(line => new Paragraph({ keepNext: line.keepNext, spacing: { before: line.role === "section" ? 200 : 0, after: 120 }, children: [new TextRun({ text: line.text, bold: ["title", "section", "question"].includes(line.role), size: line.role === "title" ? 34 : 24 })] })),
  }] });
  const bytes = await Packer.toBuffer(doc);
  if (bytes.length > 4 * 1024 * 1024) throw new Error("Tệp xuất vượt giới hạn 4 MiB.");
  return bytes;
}
