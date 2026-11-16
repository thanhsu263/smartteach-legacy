import { beforeAll, afterAll, it, expect, vi } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import cases from "../fixtures/rag/evaluation-cases.json";
import {
  signUp,
  cleanupUsers,
  admin,
  buildQuiz,
  simpleQuestion,
  config,
  type TestUser,
} from "./helpers";
import { localSql, seedAdmin } from "./admin-fixtures";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({
  vectors: new Map<string, number[]>(),
  calls: 0,
}));
vi.mock("@/lib/ai/gemini", () => ({
  embedTexts: async (texts: string[]) =>
    texts.map((t) => gateway.vectors.get(t)!),
  runtime: async () => ({
    settings: { chat_model: "gemini-2.5-flash-lite", output_tokens: 1500 },
  }),
  withGemini: async (
    _model: string,
    _tokens: number,
    call: (ai: GoogleGenAI, signal: AbortSignal) => Promise<unknown>,
  ) => {
    gateway.calls++;
    return call(
      {
        models: {
          generateContent: async ({ contents }: { contents: string }) => {
            const payload = JSON.parse(contents),
              source = payload.SOURCES[0];
            return {
              text: JSON.stringify({
                outcome: "answer",
                text: source.text,
                citationIds: [source.id],
              }),
            };
          },
        },
      } as unknown as GoogleGenAI,
      new AbortController().signal,
    );
  },
}));
import { answerChat, type ChatMessage } from "@/lib/chat/service";
let root: TestUser,
  teacher: TestUser,
  other: TestUser,
  thread: string,
  site: Record<string, unknown>,
  ai: Record<string, unknown>;
const credential = crypto.randomUUID(),
  sources: string[] = [],
  expected = new Map<string, string>();
const logical = [
  ...new Set(cases.flatMap((c) => (c.source ? [c.source] : []))),
];
const metadata: Record<string, { subject: string; grade: string }> = {
  "approved-math-6": { subject: "toan", grade: "6" },
  "approved-english-7": { subject: "tieng-anh", grade: "7" },
  "approved-science-6": { subject: "khoa-hoc-tu-nhien", grade: "6" },
  "approved-literature-9": { subject: "ngu-van", grade: "9" },
  "approved-computing-8": { subject: "tin-hoc", grade: "8" },
};
const axis = (i: number) =>
  Array.from({ length: 768 }, (_, n) => (n === i ? 1 : 0));
beforeAll(async () => {
  root = await signUp("evaluation-admin");
  teacher = await signUp("evaluation-teacher");
  other = await signUp("evaluation-private");
  seedAdmin(root);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", config.url);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", config.serviceRoleKey);
  await buildQuiz(other.client, "CANARY_EVALUATION_PRIVATE_QUIZ", [
    simpleQuestion("CANARY_PRIVATE_STUDENT_CONTENT"),
  ]);
  site = (await admin.from("site_settings").select("data").single()).data!.data;
  ai = (await root.client.rpc("admin_ai_config")).data.settings;
  for (const [index, key] of logical.entries()) {
    const source = crypto.randomUUID(),
      version = crypto.randomUUID(),
      chunk = crypto.randomUUID(),
      publication = crypto.randomUUID();
    sources.push(source);
    expected.set(key, chunk);
    const library = key !== "guide",
      body =
        key === "guide"
          ? "Hướng dẫn SmartTeach: mở Quiz của tôi, tạo quiz và dùng PIN."
          : "Học liệu được duyệt " + key;
    const meta = metadata[key];
    if (library) {
      const result = await admin
        .from("quiz_publications")
        .insert({
          id: publication,
          owner_id: root.id,
          title: key,
          subject: meta.subject,
          grades: [meta.grade],
          status: "approved",
          quiz_snapshot: {
            questions: [
              {
                kind: "single",
                prompt: body,
                options: [{ label: "Lựa chọn 1" }, { label: "Lựa chọn 2" }],
              },
            ],
          },
        });
      expect(result.error).toBeNull();
    }
    localSql(
      "insert into private.rag_sources(id,kind,publication_id,title) values('" +
        source +
        "','" +
        (library ? "library" : "document") +
        "'," +
        (library ? "'" + publication + "'" : "null") +
        ",'" +
        key +
        "');insert into private.rag_versions(id,source_id,generation,format,status,chunk_count) values('" +
        version +
        "','" +
        source +
        "',1,'" +
        (library ? "library" : "pdf") +
        "','ready',1);insert into private.rag_chunks(id,version_id,position,body,locator,embedding) values('" +
        chunk +
        "','" +
        version +
        "',0,'" +
        body +
        "','{\"paragraph\":1}','" +
        JSON.stringify(axis(index)) +
        "'::extensions.vector);update private.rag_sources set active_version='" +
        version +
        "' where id='" +
        source +
        "';",
    );
  }
  for (const [index, key] of logical.entries()) {
    const meta = metadata[key];
    if (meta)
      localSql(
        "update private.rag_sources set subject='" +
          meta.subject +
          "',grades=array['" +
          meta.grade +
          "'] where id='" +
          sources[index] +
          "';",
      );
  }
  for (const c of cases)
    gateway.vectors.set(
      c.question,
      axis(c.source ? logical.indexOf(c.source) : 767),
    );
  expect(
    (
      await root.client.rpc("admin_save_ai_credential", {
        p_id: credential,
        p_label: "Evaluation fixture",
        p_project: "evaluation-fixture",
        p_ciphertext: { v: "fixture", iv: "x", tag: "x", data: "x" },
        p_last4: "0000",
        p_free_verified: true,
        p_expected_version: 0,
      })
    ).error,
  ).toBeNull();
  await admin.rpc("ai_record_result", {
    p_credential: credential,
    p_model: "gemini-2.5-flash-lite",
    p_result: "healthy",
    p_cooldown_seconds: 0,
  });
  const current = (await root.client.rpc("admin_ai_config")).data.settings;
  const data = { ...current, model: "gemini-2.5-flash-lite", userDailyCap: 20 };
  delete data.version;
  expect(
    (
      await root.client.rpc("admin_save_ai_settings", {
        p_data: data,
        p_expected_version: current.version,
      })
    ).error,
  ).toBeNull();
  const s = (await admin.from("site_settings").select("version").single())
    .data!;
  expect(
    (
      await root.client.rpc("admin_save_settings", {
        p_data: { ...site, chatbotEnabled: true },
        p_expected_version: s.version,
      })
    ).error,
  ).toBeNull();
  thread = (await teacher.client.rpc("chat_create_thread")).data;
}, 15000);
afterAll(async () => {
  await root.client.rpc("admin_control_ai_credential", {
    p_id: credential,
    p_operation: "delete",
    p_expected_version: 1,
  });
  await admin.from("site_settings").update({ data: site }).eq("id", true);
  const data = { ...ai };
  delete data.version;
  const current = (await root.client.rpc("admin_ai_config")).data.settings
    .version;
  await root.client.rpc("admin_save_ai_settings", {
    p_data: data,
    p_expected_version: current,
  });
  if (sources.length)
    localSql(
      "delete from private.rag_sources where id in (" +
        sources.map((id) => "'" + id + "'").join(",") +
        ");",
    );
  await cleanupUsers();
  vi.unstubAllEnvs();
});
it.each(cases)(
  "$expectedOutcome — $question (fake embeddings/generation, real DB eligibility)",
  async (c) => {
    const events: { event: string; data: unknown }[] = [],
      request = crypto.randomUUID(),
      callsBefore = gateway.calls;
    await answerChat(
      teacher.client,
      teacher.id,
      thread,
      request,
      c.question,
      "library",
      (event, data) => events.push({ event, data }),
      new AbortController().signal,
    );
    const answer = events.find((e) => e.event === "answer")
      ?.data as ChatMessage;
    expect(answer).toBeTruthy();
    expect(answer.outcome).toBe(c.expectedOutcome);
    expect(answer.citations.map((x) => x.id)).toEqual(
      c.source ? [expected.get(c.source)] : [],
    );
    expect(JSON.stringify(events)).not.toContain("CANARY_PRIVATE");
    if (!c.source) expect(gateway.calls).toBe(callsBefore);
  },
);
