import "server-only";
import { createHash } from "node:crypto";
import { AppError, dbError } from "@/lib/admin/http";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { embedTexts } from "@/lib/ai/gemini";
import { chunkSections, type TextSection } from "./chunking";
import { extractDocx, extractPdfBatch, validateFile } from "./extract";
export type RagVersion = {
  id: string;
  source_id: string;
  generation: number;
  path: string | null;
  bytes: number;
  format: "pdf" | "docx" | "library";
  status: string;
  hash: string | null;
  text_chars: number;
  chunk_count: number;
};
type Job = {
  id: string;
  version_id: string;
  kind: "extract" | "embed" | "cleanup";
  cursor: number;
  lease_token: string;
};
export function ragDb() {
  const client = getAdminSupabase();
  if (!client)
    throw new AppError(503, "rag_unavailable", "Kho kiến thức chưa sẵn sàng.");
  return client;
}
export async function downloadVersion(v: RagVersion) {
  if (!v.path) throw new Error("file_missing");
  const response = await ragDb().storage.from("rag-documents").download(v.path);
  if (response.error || !response.data) throw new Error("file_missing");
  if (response.data.size !== v.bytes) throw new Error("file_size_invalid");
  const bytes = new Uint8Array(await response.data.arrayBuffer());
  validateFile(bytes, v.format);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (v.hash && v.hash !== hash) throw new Error("file_hash_changed");
  return { bytes, hash };
}
/** One awaited step, one embedding batch, no work survives the HTTP response. */
export async function runRagStep(embed = embedTexts) {
  const db = ragDb(),
    claim = await db.rpc("rag_claim_job");
  dbError(claim.error);
  if (!claim.data) return { state: "idle" };
  const { job: j, version: v } = claim.data as {
    job: Job;
    version: RagVersion;
  };
  try {
    if (j.kind === "cleanup") {
      if (v.path) {
        const result = await db.storage.from("rag-documents").remove([v.path]);
        if (result.error) throw new Error("storage_cleanup_failed");
      }
      dbError(
        (
          await db.rpc("rag_job_result", {
            p_job: j.id,
            p_lease: j.lease_token,
            p_result: "cleaned",
          })
        ).error,
      );
      return { state: "cleaned" };
    }
    if (j.kind === "extract") {
      let sections: TextSection[], cursor: number, done: boolean;
      if (v.format === "library") {
        const result = await db.rpc("rag_library_sections", {
          p_version: v.id,
        });
        dbError(result.error);
        sections = result.data;
        cursor = 1;
        done = true;
      } else {
        const { bytes } = await downloadVersion(v);
        if (v.format === "docx") {
          sections = await extractDocx(bytes);
          cursor = 1;
          done = true;
        } else {
          const batch = await extractPdfBatch(bytes, j.cursor);
          sections = batch.sections;
          cursor = batch.cursor;
          done = batch.done;
        }
      }
      const chars = sections.reduce((sum, s) => sum + s.text.length, 0),
        chunks = chunkSections(sections);
      if (done && v.text_chars + chars === 0) throw new Error("no_text");
      const result = await db.rpc("rag_checkpoint", {
        p_job: j.id,
        p_lease: j.lease_token,
        p_chunks: chunks,
        p_cursor: cursor,
        p_done: done,
        p_chars: chars,
      });
      dbError(result.error);
      return { state: "extracted", chunks: chunks.length };
    }
    const pending = await db.rpc("rag_pending_chunks", {
      p_version: v.id,
      p_limit: 8,
    });
    dbError(pending.error);
    const chunks = pending.data as { id: string; body: string }[];
    if (!chunks.length) throw new Error("no_text");
    const vectors = await embed(chunks.map((c) => c.body));
    const result = await db.rpc("rag_checkpoint", {
      p_job: j.id,
      p_lease: j.lease_token,
      p_chunks: chunks.map((c, i) => ({
        id: c.id,
        embedding: JSON.stringify(vectors[i]),
      })),
      p_cursor: j.cursor + chunks.length,
      p_done: j.cursor + chunks.length >= v.chunk_count,
      p_chars: 0,
    });
    dbError(result.error);
    return { state: "embedded", chunks: chunks.length };
  } catch (error) {
    const waiting =
      error instanceof AppError && error.code === "ai_unavailable";
    const allowed = new Set([
      "file_missing",
      "file_size_invalid",
      "file_type_invalid",
      "file_hash_changed",
      "docx_expansion_limit",
      "docx_invalid",
      "text_limit",
      "too_many_chunks",
      "no_text",
      "pdf_page_limit",
      "storage_cleanup_failed",
    ]);
    const code = waiting
      ? "waiting_quota"
      : error instanceof AppError &&
          ["capacity_exceeded", "source_changed", "lease_lost"].includes(
            error.code,
          )
        ? error.code
        : error instanceof Error && allowed.has(error.message)
          ? error.message
          : "processing_failed";
    const result = await db.rpc("rag_job_result", {
      p_job: j.id,
      p_lease: j.lease_token,
      p_result: waiting ? "waiting_quota" : "failed",
      p_code: code,
    });
    // A fenced-out worker is expected after delete/reclaim; it must not overwrite the new job.
    if (result.error && result.error.code !== "PT409") dbError(result.error);
    return { state: waiting ? "waiting_quota" : "failed", code };
  }
}
