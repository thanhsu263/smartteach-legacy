import "server-only";
import { AppError, dbError } from "@/lib/admin/http";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { AiUnavailableError, withGemini } from "@/lib/ai/gemini";
import { examDocxText, examHash, examPdfBatch, examXlsxRows } from "./extract-server";
import { readExamCsv } from "./csv";
import type { SourceText } from "./types";
import { parseAiExtraction, EXAM_EXTRACTION_INSTRUCTION, EXTRACTION_SCHEMA, InvalidExtractError, type AiPreview } from "./ai-extraction";
type Job = { id: string; owner_id: string; title: string; format: string; path: string | null; hash: string; bytes: number; cursor: number; sections: SourceText[]; text_chars: number; model: string; lease_token: string };
export function examImportDb() { const db = getAdminSupabase(); if (!db) throw new AppError(503, "exam_worker_not_ready", "Chưa cấu hình dịch vụ nhập đề."); return db; }
async function extract(job: Job) {
  if (!job.path) throw new Error("source_changed");
  const file = await examImportDb().storage.from("exam-imports").download(job.path);
  if (file.error || !file.data || file.data.size !== job.bytes) throw new Error("source_changed");
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  if (examHash(bytes) !== job.hash) throw new Error("source_changed");
  if (job.format === "pdf") return examPdfBatch(bytes, job.cursor);
  let sections: SourceText[];
  if (job.format === "docx") sections = await examDocxText(bytes);
  else {
    const rows = job.format === "xlsx" ? await examXlsxRows(bytes) : readExamCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    sections = rows.map((row, index) => ({ text: row.join(" | "), locator: { row: index + 1 } }));
  }
  if (!sections.length || !sections.some(s => s.text.trim())) throw new Error("no_text");
  return { sections, cursor: 1, done: true };
}
export async function generateExamPreview(job: Job): Promise<AiPreview> {
  const payload = JSON.stringify(job.sections.map((source, locatorIndex) => ({ locatorIndex, ...source })));
  if (!job.text_chars || job.text_chars > 12000 || payload.length > 22000) throw new Error("input_too_long");
  const r = await withGemini(job.model, payload.length + EXAM_EXTRACTION_INSTRUCTION.length + 8192, (ai, signal) => ai.models.generateContent({ model: job.model, contents: payload, config: { systemInstruction: EXAM_EXTRACTION_INSTRUCTION, maxOutputTokens: 8192, responseMimeType: "application/json", responseJsonSchema: EXTRACTION_SCHEMA, temperature: 0, abortSignal: signal } }), undefined, { remaining: 1 }, async () => {
    dbError((await examImportDb().rpc("exam_import_reserve_attempt", { p_id: job.id, p_lease: job.lease_token })).error);
  });
  const finish = r.candidates?.[0]?.finishReason;
  if (finish !== "STOP") throw new InvalidExtractError(`finish_${String(finish ?? "missing").toLowerCase()}`);
  if (!r.text) throw new InvalidExtractError("empty_text");
  let raw: unknown; try { raw = JSON.parse(r.text); } catch { throw new InvalidExtractError("json"); }
  return parseAiExtraction(raw, job.sections, job.title);
}
export async function runExamImportStep(generate = generateExamPreview) {
  const db = examImportDb(); const claimed = await db.rpc("exam_import_claim"); dbError(claimed.error);
  if (!claimed.data) return { state: "idle" };
  const { task, job } = claimed.data as { task: "extract" | "generate" | "cleanup"; job: Job };
  const checkpoint = async (action: string, data: unknown = null, cursor = 0, code: string | null = null) => { dbError((await db.rpc("exam_import_checkpoint", { p_id: job.id, p_lease: job.lease_token, p_action: action, p_data: data, p_cursor: cursor, p_code: code })).error); };
  try {
    if (task === "cleanup") {
      if (job.path) { const removed = await db.storage.from("exam-imports").remove([job.path]); if(removed.error) throw new Error("cleanup_failed"); }
      await checkpoint("cleaned"); return { state: "cleaned", id: job.id };
    }
    if (task === "extract") {
      const result = await extract(job); await checkpoint(result.done ? "extracted" : "extracting", result.sections, result.cursor);
      return { state: result.done ? "queued" : "extracting", id: job.id };
    }
    const result = await generate(job); await checkpoint("review", result); return { state: "needs_review", id: job.id };
  } catch(e) {
    if (task === "cleanup") return { state: "cleanup_pending", id: job.id }; // lease expiry retries deletion; no terminal success is invented.
    if (e instanceof AppError && e.code === "lease_lost") return { state: "lease_lost", id: job.id };
    // Content-free reason so a failed extraction can be diagnosed from runtime logs without storing model output.
    if (e instanceof InvalidExtractError) console.warn("exam_import_invalid_extract", { job: job.id, reason: e.reason });
    // RPC failures arrive as AppError with the DB code in `code`; local failures carry it in `message`.
    const known = e instanceof AppError ? e.code : e instanceof Error ? e.message : "";
    const quota = e instanceof AiUnavailableError && ["quota", "transient"].includes(e.reason);
    const code = e instanceof AiUnavailableError || (e instanceof AppError && e.code === "ai_unavailable") ? "provider_unavailable" : e instanceof AppError && e.status === 403 ? "owner_unavailable" : ["invalid_extract", "input_too_long", "no_text", "source_changed", "attempt_budget_exhausted"].includes(known) ? known : "unsupported_file";
    try { await checkpoint(quota ? "waiting_quota" : "failed", null, 0, quota ? "waiting_quota" : code); }
    catch(error) { if (!(error instanceof AppError && error.status === 409)) throw error; }
    return { state: quota ? "waiting_quota" : "failed", id: job.id, code: quota ? "waiting_quota" : code, ...(e instanceof AiUnavailableError ? { diagnostic: e.diagnosticCode } : {}) };
  }
}
