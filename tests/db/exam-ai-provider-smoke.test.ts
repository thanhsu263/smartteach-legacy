import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { admin, cleanupUsers, grantPremiumForTest, signUp, type TestUser } from "./helpers";
import { localSql } from "./admin-fixtures";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => admin }));
import { runExamImportStep } from "../../src/lib/exams/import/jobs";
const enabled = process.env.SMARTTEACH_LIVE_AI_SMOKE === "1";
let teacher: TestUser | undefined;
const secretIds: string[] = [];
beforeAll(async () => {
  if (!enabled) return;
  teacher = await signUp("ai-provider-smoke"); await grantPremiumForTest(teacher);
  for (const [name, value] of [["smartteach_exam_worker_url", "http://host.docker.internal:1/api/internal/exams/jobs/run"], ["smartteach_exam_worker_secret", "smoke-exam-worker-local-only-00000000000000000000"]]) {
    if (!localSql(`select id from vault.secrets where name='${name}'`).trim()) secretIds.push(localSql(`select vault.create_secret('${value}','${name}')`).trim());
  }
  expect((await admin.rpc("exam_import_claim")).error).toBeNull();
});
afterAll(async () => {
  if (!teacher) return;
  const paths = localSql(`select path from private.exam_import_jobs where owner_id='${teacher.id}' and path is not null`).trim().split("\n").filter(Boolean);
  if (paths.length) await admin.storage.from("exam-imports").remove(paths);
  localSql(`delete from private.exam_import_jobs where owner_id='${teacher.id}';`);
  for (const id of secretIds) if (/^[a-f0-9-]{36}$/.test(id)) localSql(`delete from vault.secrets where id='${id}'`);
  await cleanupUsers();
});
// Opt in only: one real model request, synthetic source, no automatic retry.
it.skipIf(!enabled)("Gemini thật trích một câu tiếng Việt, giữ đáp án có nguồn", async () => {
  const bytes = Buffer.from('"Phần I. Câu 1 (1 điểm): Thủ đô của Việt Nam là gì? A. Hà Nội B. Huế. Đáp án câu 1: A (Hà Nội)."');
  const reserved = await teacher!.client.rpc("reserve_exam_import", { p_request: crypto.randomUUID(), p_title: "Đề smoke tổng hợp", p_format: "csv", p_bytes: bytes.length, p_consent: true }); expect(reserved.error?.message).toBeUndefined();
  const job = reserved.data;
  expect((await admin.storage.from("exam-imports").upload(job.path, bytes, { contentType: "text/csv" })).error).toBeNull();
  expect((await teacher!.client.rpc("complete_exam_import", { p_id: job.id, p_hash: createHash("sha256").update(bytes).digest("hex") })).error).toBeNull();
  expect(await runExamImportStep()).toMatchObject({ state: "queued", id: job.id });
  const result = await runExamImportStep();
  expect(result, JSON.stringify(result)).toMatchObject({ state: "needs_review", id: job.id });
  const owned = await teacher!.client.rpc("exam_import_owned", { p_id: job.id }); expect(owned.error).toBeNull();
  const questions = owned.data.preview.form.document.sections.flatMap((s: { questions: { kind: string; pointUnits: number; options: { label: string; is_correct: boolean }[] }[] }) => s.questions);
  expect(questions).toHaveLength(1);
  // Sentence-final punctuation in a prose source is ambiguous; content/order/key must still match.
  expect({ ...questions[0], options: questions[0].options.map((o: { label: string; is_correct: boolean }) => ({ ...o, label: o.label.replace(/\.$/, "") })) }).toMatchObject({ kind: "single", pointUnits: 100, options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế", is_correct: false }] });
  expect(owned.data.preview.provenance[0].answerExcerpt).toContain("Hà Nội");
  expect(localSql(`select attempts from private.exam_import_jobs where id='${job.id}'`).trim()).toBe("1");
}, 30000);
