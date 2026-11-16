import "server-only";
import { unzipSync, Unzip, UnzipInflate } from "fflate";
import mammoth from "mammoth";
import type { TextSection } from "./chunking";
export const MAX_BYTES = 10 * 1024 * 1024;
export function validateFile(bytes: Uint8Array, format: string) {
  if (bytes.length < 8 || bytes.length > MAX_BYTES)
    throw new Error("file_size_invalid");
  if (format === "pdf") {
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
      throw new Error("file_type_invalid");
  } else if (format === "docx") {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
      throw new Error("file_type_invalid");
    let entries = 0,
      total = 0;
    // Inspect central-directory declared expansion sizes before Mammoth allocates buffers.
    unzipSync(bytes, {
      filter: (file) => {
        entries++;
        total += file.originalSize;
        if (
          entries > 2000 ||
          total > 50 * 1024 * 1024 ||
          file.originalSize > 50 * 1024 * 1024
        )
          throw new Error("docx_expansion_limit");
        return false;
      },
    });
    let expanded = 0;
    const stream = new Unzip((file) => {
      file.ondata = (error, chunk) => {
        if (error) throw new Error("docx_invalid");
        expanded += chunk.length;
        if (expanded > 50 * 1024 * 1024) {
          file.terminate();
          throw new Error("docx_expansion_limit");
        }
      };
      file.start();
    });
    stream.register(UnzipInflate);
    for (let offset = 0; offset < bytes.length; offset += 16_384)
      stream.push(
        bytes.subarray(offset, offset + 16_384),
        offset + 16_384 >= bytes.length,
      );
  } else throw new Error("file_type_invalid");
}
export async function extractDocx(bytes: Uint8Array): Promise<TextSection[]> {
  validateFile(bytes, "docx");
  const entries = unzipSync(bytes, {
    filter: (file) =>
      file.name === "word/document.xml" || file.name === "[Content_Types].xml",
  });
  if (!entries["word/document.xml"] || !entries["[Content_Types].xml"])
    throw new Error("docx_invalid");
  // extractRawText uses only the buffer; it never converts document HTML or loads images/URLs.
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  if (result.value.length > 1_000_000) throw new Error("text_limit");
  const sections = result.value
    .split(/\n\s*\n/)
    .map((text, i) => ({ text, locator: { paragraph: i + 1 } }))
    .filter((s) => s.text.trim());
  if (!sections.length) throw new Error("no_text");
  return sections;
}
export async function extractPdfBatch(bytes: Uint8Array, start: number) {
  validateFile(bytes, "pdf");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes.slice(),
    verbosity: 0,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const deadline = setTimeout(() => {
    void task.destroy().catch(() => {});
  }, 15000);
  try {
    const doc = await task.promise;
    if (doc.numPages > 200) throw new Error("pdf_page_limit");
    const end = Math.min(start + 10, doc.numPages),
      sections: TextSection[] = [];
    for (let i = start; i < end; i++) {
      const page = await doc.getPage(i + 1),
        content = await page.getTextContent();
      const text = content.items
        .map((item) =>
          "str" in item
            ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
            : "",
        )
        .join("");
      sections.push({ text, locator: { page: i + 1 } });
      page.cleanup();
    }
    return { sections, cursor: end, done: end === doc.numPages };
  } finally {
    clearTimeout(deadline);
    await task.destroy();
  }
}
