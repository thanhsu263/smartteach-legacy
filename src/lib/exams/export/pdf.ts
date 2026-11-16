import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { PrintLine } from "./print-model";
export function renderPdf(lines: PrintLine[], footer = true): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, autoFirstPage: false });
    const parts: Buffer[] = []; let size = 0;
    doc.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 4 * 1024 * 1024) doc.destroy(new Error("Tệp xuất vượt 4 MiB.")); else parts.push(chunk); });
    doc.on("error", reject); doc.on("end", () => resolve(Buffer.concat(parts)));
    try {
      doc.registerFont("Vietnam", path.join(process.cwd(), "src/assets/fonts/be-vietnam-pro-regular.ttf"));
      doc.registerFont("VietnamBold", path.join(process.cwd(), "src/assets/fonts/be-vietnam-pro-bold.ttf"));
      doc.addPage();
      for (const line of lines) {
        const bold = ["title", "section", "question"].includes(line.role);
        doc.font(bold ? "VietnamBold" : "Vietnam").fontSize(line.role === "title" ? 18 : 11);
        const width = doc.page.width - 96;
        const height = doc.heightOfString(line.text, { width }) + 10;
        if (doc.y + height + (line.keepNext ? 25 : 0) > doc.page.height - 60) doc.addPage();
        if (doc.bufferedPageRange().count > 60) throw new Error("Tệp xuất vượt 60 trang.");
        doc.text(line.text, { width, lineGap: 3 }); doc.moveDown(0.5);
      }
      if (footer) {
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i); const margin = doc.page.margins.bottom; doc.page.margins.bottom = 0;
          doc.font("Vietnam").fontSize(9).text(`Trang ${i + 1} / ${range.count}`, 48, doc.page.height - 32, { width: doc.page.width - 96, align: "center", lineBreak: false });
          doc.page.margins.bottom = margin;
        }
      }
      doc.end();
    } catch(e) { doc.destroy(); reject(e); }
  });
}
