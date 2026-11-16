import { it, expect, vi } from "vitest";
import { strToU8 } from "fflate";
import {
  samplePdf as pdf,
  sampleDocx,
} from "../../../tests/fixtures/rag/sample-documents";
vi.mock("server-only", () => ({}));
import { extractDocx, extractPdfBatch, validateFile } from "./extract";
import { chunkSections } from "./chunking";
import { readFileSync } from "node:fs";
it("embedded Unicode PDF preserves Vietnamese diacritics", async () => {
  const bytes = new Uint8Array(
    readFileSync("tests/fixtures/rag/smartteach-vietnamese.pdf"),
  );
  const result = await extractPdfBatch(bytes, 0);
  expect(result.sections[0].text).toContain("Hướng dẫn SmartTeach");
  expect(result.sections[0].text).toContain("Học sinh tham gia");
});
it("real PDF parser checkpoints pages and rejects more than 200 pages", async () => {
  const first = await extractPdfBatch(pdf(12), 0);
  expect(first.cursor).toBe(10);
  expect(first.done).toBe(false);
  expect(first.sections[0].text).toContain("SmartTeach teacher guide");
  expect(first.sections[0].locator).toEqual({ page: 1 });
  expect((await extractPdfBatch(pdf(12), 10)).done).toBe(true);
  await expect(extractPdfBatch(pdf(201), 0)).rejects.toThrow("pdf_page_limit");
});
it("DOCX extracts Vietnamese plain text with paragraph locators and no HTML", async () => {
  const data = sampleDocx();
  const sections = await extractDocx(data);
  expect(sections.map((s) => s.text).join(" ")).toContain("Hướng dẫn tạo quiz");
  expect(sections[1].locator).toEqual({ paragraph: 2 });
  expect(() => validateFile(new Uint8Array(11 * 1024 * 1024), "pdf")).toThrow(
    "file_size_invalid",
  );
  await expect(extractDocx(strToU8("not a zip"))).rejects.toThrow();
});
it("chunks retain Unicode and locator with bounded overlap", () => {
  const text = "Giáo viên 😀 tạo câu hỏi tiếng Việt. ".repeat(120);
  const chunks = chunkSections([{ text, locator: { page: 2 } }]);
  expect(chunks.length).toBeGreaterThan(1);
  expect(
    chunks.every((c) => c.body.length <= 1200 && c.locator.page === 2),
  ).toBe(true);
  expect(chunks.some((c) => c.body.includes("😀"))).toBe(true);
  expect(chunkSections([{ text: " \n ", locator: { paragraph: 1 } }])).toEqual(
    [],
  );
});
