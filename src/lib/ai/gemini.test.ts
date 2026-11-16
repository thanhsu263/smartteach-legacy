import { beforeEach, afterEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/admin/http", () => ({
  AppError: class extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
  dbError: (error: unknown) => {
    if (error) throw Error("db_error");
  },
}));
import { withGemini, normalizeEmbedding } from "./gemini";
import { encryptCredential } from "./crypto";
import { PROVIDER_TIMEOUT_MS } from "./models";
const ids = ["one", "two", "three"];
function configure(projects: string[]) {
  const credentials = projects.map((project_ref, i) => ({
    id: ids[i],
    project_ref,
    ciphertext: encryptCredential(
      "CANARY_FAKE_API_KEY_0123456789",
      ids[i],
      project_ref,
    ),
  }));
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "ai_runtime")
      return { data: { settings: {}, credentials }, error: null };
    if (name === "ai_reserve_quota") return { data: true, error: null };
    return { data: null, error: null };
  });
}
beforeEach(() => {
  vi.stubEnv(
    "AI_KEYRING_JSON",
    JSON.stringify({
      activeVersion: "test",
      keys: { test: Buffer.alloc(32, 7).toString("base64") },
    }),
  );
  mocks.rpc.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
it("429 skips other keys in the same project, total failover budget stays at two", async () => {
  configure(["project-a", "project-a", "project-b"]);
  let calls = 0;
  await expect(
    withGemini("gemini-2.5-flash-lite", 100, async () => {
      calls++;
      if (calls === 1) throw { status: 429 };
      return "OK";
    }),
  ).resolves.toBe("OK");
  expect(calls).toBe(2);
  expect(
    mocks.rpc.mock.calls
      .filter(([name]) => name === "ai_reserve_quota")
      .map(([, args]) => args.p_credential),
  ).toEqual(["one", "three"]);
});
it("all keys in an exhausted project stop, permission errors do not revoke or loop", async () => {
  configure(["project-a", "project-a"]);
  let calls = 0;
  await expect(
    withGemini("gemini-2.5-flash-lite", 100, async () => {
      calls++;
      throw { status: 429 };
    }),
  ).rejects.toMatchObject({ code: "ai_unavailable" });
  expect(calls).toBe(1);
  configure(["project-a", "project-b"]);
  calls = 0;
  await expect(
    withGemini("gemini-2.5-flash-lite", 100, async () => {
      calls++;
      throw { status: 403 };
    }),
  ).rejects.toMatchObject({ code: "ai_unavailable" });
  expect(calls).toBe(1);
  expect(
    mocks.rpc.mock.calls
      .filter(([name]) => name === "ai_record_result")
      .at(-1)?.[1].p_result,
  ).toBe("permission");
});
it("paid/unknown model never invokes provider; embedding validates dimension/finite/norm", async () => {
  const provider = vi.fn();
  await expect(withGemini("paid-model", 100, provider)).rejects.toMatchObject({
    code: "model_invalid",
  });
  expect(provider).not.toHaveBeenCalled();
  expect(() => normalizeEmbedding([1, 2])).toThrow();
  expect(() => normalizeEmbedding(Array(768).fill(NaN))).toThrow();
  const values = normalizeEmbedding(Array(768).fill(3));
  expect(Math.hypot(...values)).toBeCloseTo(1, 10);
});

it("current Free Tier model passes the allowlist and records successful connection tests", async () => {
  configure(["project-a"]);
  const provider = vi.fn().mockResolvedValue("OK");
  await expect(withGemini("gemini-3.5-flash-lite", 200, provider, "one")).resolves.toBe("OK");
  expect(provider).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith("ai_record_result", expect.objectContaining({ p_result: "healthy" }));
});

it("provider deadline meets Gemini minimum without exceeding the two-attempt worker budget", () => {
  expect(PROVIDER_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  expect(PROVIDER_TIMEOUT_MS * 2 + 150).toBeLessThan(30_000);
});

it("connection tests report an unavailable model and never expose raw provider errors", async () => {
  configure(["project-a"]);
  const provider = vi.fn().mockRejectedValue({ status: 404, message: "CANARY_PRIVATE_PROVIDER_MESSAGE" });
  const error = await withGemini("gemini-2.5-flash-lite", 200, provider, "one").catch((issue) => issue);
  if (!(error instanceof Error)) throw new Error("Expected an admin connection error");
  expect(error).toMatchObject({ code: "ai_model_unavailable", status: 503 });
  expect(error.message).not.toContain("CANARY_PRIVATE_PROVIDER_MESSAGE");
  expect(provider).toHaveBeenCalledTimes(1);
});
it("background callers distinguish request/config errors from exhausted quota without leaking provider content", async () => {
  configure(["project-a"]);
  for (const [status, reason, diagnosticCode] of [[400, "permission", "ai_request_invalid"], [429, "quota", "ai_provider_quota"]] as const) {
    const error = await withGemini("gemini-3.5-flash-lite", 100, async () => { throw { status, message: "CANARY_PROVIDER_CONTENT" }; }, undefined, { remaining: 1 }).catch(e => e);
    expect(error).toMatchObject({ code: "ai_unavailable", reason, diagnosticCode });
    expect(error.message).not.toContain("CANARY_PROVIDER_CONTENT");
  }
});
