import { beforeEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({
  embed: vi.fn(),
  provider: vi.fn(),
  db: vi.fn(),
  begin: "started",
  withdrawn: false,
  output: "",
  history: [] as unknown[],
  saved: false,
}));
vi.mock("@/lib/admin/http", () => {
  class AppError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    AppError,
    dbError: (error: { code: string; message: string } | null) => {
      if (error) throw new AppError(409, error.message, error.message);
    },
  };
});
vi.mock("@/lib/ai/gemini", () => ({
  embedTexts: mock.embed,
  runtime: async () => ({
    settings: { chat_model: "gemini-2.5-flash-lite", output_tokens: 1500 },
  }),
  withGemini: mock.provider,
}));
vi.mock("@/lib/rag/jobs", () => ({ ragDb: () => ({ rpc: mock.db }) }));
import { answerChat } from "./service";
import { NO_SOURCE } from "./answer";
import type { SupabaseClient } from "@supabase/supabase-js";
const chunk = {
  id: "chunk",
  versionId: "version",
  sourceId: "doc",
  title: "Guide",
  body: "Mở Quiz của tôi.",
  locator: { page: 1 },
  kind: "document",
  publicationId: null,
};
const message = () => ({
  id: "answer",
  requestId: "request",
  role: "assistant",
  body: "Mở Quiz của tôi.",
  citations: [{ id: "chunk", versionId: "version" }],
  sourcesAvailable: !mock.withdrawn,
});
let sources: unknown[] = [chunk];
const client = {
  rpc: async (name: string) => {
    if (name === "chat_begin")
      return { data: { state: mock.begin, lease: "lease" }, error: null };
    if (name === "rag_retrieve") return { data: sources, error: null };
    return {
      data: {
        items:
          mock.saved || mock.begin === "completed" ? [message()] : mock.history,
      },
      error: null,
    };
  },
} as unknown as SupabaseClient;
beforeEach(() => {
  mock.begin = "started";
  mock.withdrawn = false;
  mock.saved = false;
  mock.history = [];
  sources = [chunk];
  mock.output = JSON.stringify({
    outcome: "answer",
    text: "Mở Quiz của tôi.",
    citationIds: ["chunk"],
  });
  mock.embed.mockReset().mockResolvedValue([[1, 0]]);
  mock.provider
    .mockReset()
    .mockImplementation(async (_model, _tokens, call) =>
      call(
        { models: { generateContent: async () => ({ text: mock.output }) } },
        new AbortController().signal,
      ),
    );
  mock.db.mockReset().mockImplementation(async (_name, args) => {
    if (mock.withdrawn && !args.p_error)
      return { error: { code: "PT409", message: "source_changed" } };
    if (!args.p_error) mock.saved = true;
    return { error: null };
  });
});
function run(emit: (event: string, data: unknown) => void) {
  return answerChat(
    client,
    "owner",
    "thread",
    "request",
    "Hướng dẫn tạo quiz",
    "quizzes",
    emit,
    new AbortController().signal,
  );
}
it("no evidence skips generation and returns a fixed grounded fallback", async () => {
  sources = [];
  const events = vi.fn();
  await run(events);
  expect(mock.provider).not.toHaveBeenCalled();
  expect(mock.db.mock.calls[0][1]).toMatchObject({
    p_body: NO_SOURCE,
    p_citations: [],
    p_outcome: "no_source",
  });
  expect(events.mock.calls.some(([event]) => event === "answer")).toBe(true);
});
it("invalid citations or source withdrawal never emit an answer", async () => {
  mock.output = JSON.stringify({
    outcome: "answer",
    text: "Bịa nguồn",
    citationIds: ["private"],
  });
  const emit = vi.fn();
  await expect(run(emit)).rejects.toMatchObject({ code: "answer_unavailable" });
  expect(emit.mock.calls.some(([event]) => event === "answer")).toBe(false);
  mock.output = JSON.stringify({
    outcome: "answer",
    text: "Mở quiz",
    citationIds: ["chunk"],
  });
  mock.withdrawn = true;
  await expect(run(emit)).rejects.toMatchObject({ code: "source_changed" });
  expect(emit.mock.calls.some(([event]) => event === "answer")).toBe(false);
});
it("revoked-source assistant history is excluded from the prompt", async () => {
  mock.history = [
    {
      requestId: "old",
      role: "assistant",
      body: "CANARY_REVOKED_CONTENT",
      sourcesAvailable: false,
    },
  ];
  let prompt = "";
  mock.provider.mockImplementation(async (_m, _t, call) =>
    call(
      {
        models: {
          generateContent: async ({ contents }: { contents: string }) => {
            prompt = contents;
            return { text: mock.output };
          },
        },
      },
      new AbortController().signal,
    ),
  );
  await run(vi.fn());
  expect(prompt).toContain("SOURCES");
  expect(prompt).not.toContain("CANARY_REVOKED_CONTENT");
});
it("completed retry never invokes provider and refuses revoked sources", async () => {
  mock.begin = "completed";
  mock.withdrawn = true;
  const emit = vi.fn();
  await expect(run(emit)).rejects.toMatchObject({ code: "source_changed" });
  expect(mock.embed).not.toHaveBeenCalled();
  expect(mock.provider).not.toHaveBeenCalled();
  expect(emit).not.toHaveBeenCalled();
});
