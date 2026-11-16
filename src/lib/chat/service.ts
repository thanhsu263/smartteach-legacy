import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, dbError } from "@/lib/admin/http";
import { embedTexts, runtime, withGemini } from "@/lib/ai/gemini";
import { ragDb } from "@/lib/rag/jobs";
import {
  CLARIFY,
  NO_SOURCE,
  SYSTEM_PROMPT,
  parseAnswer,
  type RetrievedChunk,
} from "./answer";
import { retrievalFilters } from "./retrieval-filters";
export type ChatMessage = {
  id: string;
  requestId: string;
  role: "user" | "assistant";
  body: string;
  outcome: string;
  createdAt: string;
  expiresAt: string;
  citations: Pick<
    RetrievedChunk,
    "id" | "versionId" | "title" | "locator" | "kind" | "publicationId"
  >[];
  sourcesAvailable: boolean;
};
type Emit = (event: string, data: unknown) => void;
export async function answerChat(
  client: SupabaseClient,
  owner: string,
  thread: string,
  requestId: string,
  text: string,
  contextPage: string,
  emit: Emit,
  signal: AbortSignal,
) {
  const begin = await client.rpc("chat_begin", {
    p_thread: thread,
    p_request: requestId,
    p_text: text,
    p_hash: createHash("sha256").update(text).digest("hex"),
  });
  dbError(begin.error);
  if (begin.data.state !== "started") {
    if (begin.data.state === "completed") {
      const history = await client.rpc("chat_thread_messages", {
        p_id: thread,
      });
      dbError(history.error);
      const answer = (history.data.items as ChatMessage[]).find(
        (m) => m.requestId === requestId && m.role === "assistant",
      );
      if (answer && !answer.sourcesAvailable)
        throw new AppError(
          409,
          "source_changed",
          "Nguồn của câu trả lời không còn được công bố.",
        );
      if (answer) emit("answer", answer);
      else throw new AppError(409, "answer_expired", "Câu trả lời đã hết hạn.");
      return;
    }
    throw new AppError(
      409,
      begin.data.state === "processing"
        ? "request_processing"
        : "request_failed",
      "Lượt hỏi này đang xử lý hoặc đã kết thúc. Hãy tải lại hội thoại.",
    );
  }
  const lease = begin.data.lease,
    db = ragDb(),
    budget = { remaining: 2 };
  try {
    emit("state", { state: "retrieving" });
    if (signal.aborted) throw new Error("aborted");
    const vector = (await embedTexts([text], true, budget))[0];
    const filters = retrievalFilters(text);
    const result = await client.rpc("rag_retrieve", {
      p_embedding: JSON.stringify(vector),
      p_subject: filters.subject,
      p_grade: filters.grade,
    });
    dbError(result.error);
    const chunks = result.data as RetrievedChunk[];
    let answer: {
      outcome: "answer" | "no_source" | "clarify";
      text: string;
      citations: RetrievedChunk[];
    } = { outcome: "no_source", text: NO_SOURCE, citations: [] };
    if (chunks.length) {
      emit("state", { state: "generating" });
      const config = await runtime(),
        model = config.settings.chat_model;
      if (!model)
        throw new AppError(503, "ai_unavailable", "AI chưa được cấu hình.");
      const history = await client.rpc("chat_thread_messages", {
        p_id: thread,
      });
      dbError(history.error);
      // Revoked-source assistant messages never re-enter the provider context.
      const context = (history.data.items as ChatMessage[])
        .filter(
          (m) =>
            m.requestId !== requestId &&
            (m.role === "user" || m.sourcesAvailable),
        )
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.body.slice(0, 1000) }));
      const payload = JSON.stringify({
        page: contextPage,
        history: context,
        question: text,
        SOURCES: chunks.map((c) => ({
          id: c.id,
          title: c.title,
          subject: c.subject ?? null,
          grades: c.grades ?? [],
          locator: c.locator,
          text: c.body,
        })),
      });
      const response = await withGemini(
        model,
        payload.length + SYSTEM_PROMPT.length + config.settings.output_tokens,
        (ai, timeoutSignal) =>
          ai.models.generateContent({
            model,
            contents: payload,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              maxOutputTokens: config.settings.output_tokens,
              responseMimeType: "application/json",
              temperature: 0.2,
              abortSignal: AbortSignal.any([timeoutSignal, signal]),
            },
          }),
        undefined,
        budget,
      );
      answer = parseAnswer(response.text ?? "", chunks);
    } else if (text.trim().length <= 8)
      answer = { outcome: "clarify", text: CLARIFY, citations: [] };
    if (signal.aborted) throw new Error("aborted");
    const citations = answer.citations.map((c) => ({
      id: c.id,
      versionId: c.versionId,
      title: c.title,
      locator: c.locator,
      kind: c.kind,
      publicationId: c.publicationId,
    }));
    // Transaction revalidates every citation and the thread generation before storing any output.
    const saved = await db.rpc("chat_finish", {
      p_owner: owner,
      p_request: requestId,
      p_lease: lease,
      p_body: answer.text,
      p_citations: citations,
      p_outcome: answer.outcome,
    });
    dbError(saved.error);
    const history = await client.rpc("chat_thread_messages", { p_id: thread });
    dbError(history.error);
    const message = (history.data.items as ChatMessage[]).find(
      (m) => m.requestId === requestId && m.role === "assistant",
    );
    if (!message || !message.sourcesAvailable)
      throw new AppError(
        409,
        "source_changed",
        "Nguồn đã thay đổi. Vui lòng hỏi lại.",
      );
    emit("answer", message);
  } catch (error) {
    const code =
      error instanceof AppError
        ? error.code
        : signal.aborted
          ? "aborted"
          : "answer_unavailable";
    await db.rpc("chat_finish", {
      p_owner: owner,
      p_request: requestId,
      p_lease: lease,
      p_body: "",
      p_citations: [],
      p_outcome: "no_source",
      p_error: code,
    });
    throw error instanceof AppError
      ? error
      : new AppError(
          503,
          "answer_unavailable",
          "Chưa thể trả lời từ nguồn đã duyệt. Vui lòng thử lại.",
        );
  }
}
