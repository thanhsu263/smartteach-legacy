import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AppError, dbError } from "@/lib/admin/http";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { decryptCredential, type Ciphertext } from "./crypto";
import { classifyProviderError, credentialTestFailure, type ProviderFailure } from "./errors";
import { CHAT_MODELS, EMBEDDING_MODEL, PROVIDER_TIMEOUT_MS } from "./models";
export type AiSettings = {
  chat_model: string | null;
  output_tokens: number;
  user_daily_cap: number;
  rpm: number;
  tpm: number;
  rpd: number;
  version: number;
};
type Credential = { id: string; project_ref: string; ciphertext: Ciphertext };
export type AiRuntime = { settings: AiSettings; credentials: Credential[] };
/** Fixed diagnostic codes only; never retain provider messages or request content. */
export class AiUnavailableError extends AppError {
  constructor(public reason: ProviderFailure["kind"] | "not_configured", public diagnosticCode: string) {
    super(503, "ai_unavailable", "AI tạm chưa sẵn sàng hoặc đã chạm hạn mức. Vui lòng thử lại sau.");
  }
}
export async function runtime(): Promise<AiRuntime> {
  const db = getAdminSupabase();
  if (!db) throw new AppError(503, "ai_unavailable", "AI chưa được cấu hình.");
  const result = await db.rpc("ai_runtime");
  dbError(result.error);
  return result.data as AiRuntime;
}
/** SDK retries disabled; the two-call budget includes failover, shared by project/model. */
export async function withGemini<T>(
  model: string,
  tokens: number,
  call: (ai: GoogleGenAI, signal: AbortSignal) => Promise<T>,
  credentialId?: string,
  budget = { remaining: 2 },
  beforeAttempt?: () => Promise<void>,
): Promise<T> {
  if (model !== EMBEDDING_MODEL && !CHAT_MODELS.some((m) => m.id === model))
    throw new AppError(
      400,
      "model_invalid",
      "Model không thuộc danh sách hỗ trợ Free Tier.",
    );
  const db = getAdminSupabase();
  if (!db) throw new AppError(503, "ai_unavailable", "AI chưa được cấu hình.");
  const config = await runtime(),
    skipProjects = new Set<string>();
  let calls = 0;
  let unavailable: { reason: ProviderFailure["kind"] | "not_configured"; code: string } = { reason: "not_configured", code: "ai_not_configured" };
  for (const c of config.credentials) {
    if (calls >= 2 || budget.remaining <= 0) break;
    if (
      (credentialId && c.id !== credentialId) ||
      skipProjects.has(c.project_ref)
    )
      continue;
    const reserved = await db.rpc("ai_reserve_quota", {
      p_credential: c.id,
      p_model: model,
      p_tokens: tokens,
    });
    dbError(reserved.error);
    if (!reserved.data) {
      unavailable = { reason: "quota", code: "ai_quota_wait" };
      skipProjects.add(c.project_ref);
      continue;
    }
    if (beforeAttempt) await beforeAttempt();
    calls++;
    budget.remaining--;
    try {
      const key = decryptCredential(c.ciphertext, c.id, c.project_ref);
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          timeout: PROVIDER_TIMEOUT_MS,
          retryOptions: { attempts: 1 },
        },
      });
      const result = await call(ai, AbortSignal.timeout(PROVIDER_TIMEOUT_MS));
      dbError(
        (
          await db.rpc("ai_record_result", {
            p_credential: c.id,
            p_model: model,
            p_result: "healthy",
            p_cooldown_seconds: 0,
          })
        ).error,
      );
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const failure = classifyProviderError(error);
      unavailable = { reason: failure.kind, code: credentialTestFailure(error).code };
      dbError(
        (
          await db.rpc("ai_record_result", {
            p_credential: c.id,
            p_model: model,
            p_result: failure.kind,
            p_cooldown_seconds: failure.cooldownSeconds,
          })
        ).error,
      );
      if (credentialId) {
        const diagnostic = credentialTestFailure(error);
        throw new AppError(diagnostic.status, diagnostic.code, diagnostic.message);
      }
      if (failure.kind === "quota") skipProjects.add(c.project_ref);
      if (!failure.retry || credentialId) break;
      if (failure.kind === "transient" && budget.remaining > 0)
        await new Promise((resolve) =>
          setTimeout(resolve, 150 + Math.floor(Math.random() * 150)),
        );
    }
  }
  throw new AiUnavailableError(unavailable.reason, unavailable.code);
}
export function normalizeEmbedding(values: number[]) {
  if (values.length !== 768 || values.some((x) => !Number.isFinite(x)))
    throw new Error("embedding_invalid");
  const norm = Math.hypot(...values);
  if (norm < 1e-9) throw new Error("embedding_invalid");
  return values.map((x) => x / norm);
}
export async function embedTexts(
  texts: string[],
  query = false,
  budget = { remaining: 2 },
) {
  if (
    !texts.length ||
    texts.length > 8 ||
    texts.some((x) => !x || x.length > 1400)
  )
    throw new Error("embedding_input_invalid");
  const response = await withGemini(
    EMBEDDING_MODEL,
    texts.reduce((n, t) => n + t.length, 0),
    (ai, signal) =>
      ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: texts,
        config: {
          taskType: query ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
          outputDimensionality: 768,
          abortSignal: signal,
        },
      }),
    undefined,
    budget,
  );
  if (response.embeddings?.length !== texts.length)
    throw new Error("embedding_invalid");
  return response.embeddings.map((x) => normalizeEmbedding(x.values ?? []));
}
