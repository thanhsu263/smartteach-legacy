import { AppError, failure, json, requireUser } from "@/lib/admin/http";
import { examDocxText, examPdfBatch, examXlsxRows } from "@/lib/exams/import/extract-server";
import { readExamCsv } from "@/lib/exams/import/csv";
import { rowsToExam } from "@/lib/exams/import/rows";
import { textToExam } from "@/lib/exams/import/text";
import { MAX_EXAM_FILE_BYTES } from "@/lib/exams/import/types";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    await requireUser();
    if (!process.env.APP_BASE_URL || request.headers.get("origin") !== new URL(process.env.APP_BASE_URL).origin) throw new AppError(403, "origin_invalid", "Yêu cầu chưa hợp lệ.");
    if (Number(request.headers.get("content-length")) > MAX_EXAM_FILE_BYTES) throw new AppError(413, "file_too_large", "Tệp tối đa 2 MiB.");
    const reader = request.body?.getReader(); if (!reader) throw new AppError(400, "file_missing", "Chưa có tệp.");
    let size = 0; const chunks: Uint8Array[] = [];
    try { while (true) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > MAX_EXAM_FILE_BYTES) { await reader.cancel(); throw new AppError(413, "file_too_large", "Tệp tối đa 2 MiB."); } chunks.push(r.value); } } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let at = 0; for (const c of chunks) { bytes.set(c, at); at += c.length; }
    const format = request.headers.get("x-exam-format");
    try {
      if (format === "pdf") return json(await examPdfBatch(bytes, Number(new URL(request.url).searchParams.get("cursor") ?? 0)));
      if (format === "docx") return json({ done: true, preview: textToExam(await examDocxText(bytes)) });
      if (format === "xlsx") return json({ done: true, preview: rowsToExam(await examXlsxRows(bytes)) });
      if (format === "csv") return json({ done: true, preview: rowsToExam(readExamCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes))) });
      throw new Error("Chỉ nhận .docx, .pdf có chữ, .xlsx và .csv UTF-8.");
    } catch(e) { throw new AppError(400, "parse_failed", e instanceof Error && e.message.length < 180 ? e.message : "Không đọc được tệp. Kiểm tra định dạng hoặc dùng tệp mẫu."); }
  } catch(e) { return failure(e); }
}
