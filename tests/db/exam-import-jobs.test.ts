import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { admin, anon, cleanupUsers, grantPremiumForTest, signUp, type TestUser } from "./helpers";
import { localSql, seedAdmin } from "./admin-fixtures";
import { emptyExam, emptyQuestion } from "../../src/lib/exams/types";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => admin }));
import { runExamImportStep } from "../../src/lib/exams/import/jobs";
import { dbError } from "../../src/lib/admin/http";
import { parseAiExtraction } from "../../src/lib/exams/import/ai-extraction";
let teacher: TestUser, other: TestUser, free: TestUser, root: TestUser, stalled: TestUser;
const credentialId = crypto.randomUUID(), secretIds: string[] = [];
let originalModel = "";
beforeAll(async () => {
  teacher = await signUp("import-owner"); other = await signUp("import-other"); free = await signUp("import-free"); root = await signUp("import-admin"); stalled = await signUp("import-stalled"); await grantPremiumForTest(teacher); await grantPremiumForTest(other); await grantPremiumForTest(stalled); seedAdmin(root);
  originalModel = localSql("select coalesce(chat_model,'') from private.ai_settings where id").trim();
  if (!originalModel) localSql("update private.ai_settings set chat_model='gemini-3.5-flash-lite' where id");
  localSql(`insert into private.ai_credentials(id,label,project_ref,ciphertext,last4,state,free_verified_at) values('${credentialId}','test-exam-job','test-exam-job','{}','TEST','healthy',now())`);
  for (const [name, value] of [["smartteach_exam_worker_url", "http://host.docker.internal:1/api/internal/exams/jobs/run"], ["smartteach_exam_worker_secret", "test-exam-worker-secret-000000000000000000000000"]]) {
    const existing = localSql(`select id from vault.secrets where name='${name}'`).trim();
    if (!existing) secretIds.push(localSql(`select vault.create_secret('${value}','${name}')`).trim());
  }
  expect((await admin.rpc("exam_import_claim")).error).toBeNull();
});
afterAll(async () => {
  const owned = localSql(`select coalesce(string_agg(path,E'\n'),'') from private.exam_import_jobs where owner_id in('${teacher.id}','${other.id}','${stalled.id}') and path is not null`).trim().split("\n").filter(Boolean);
  if (owned.length) await admin.storage.from("exam-imports").remove(owned);
  localSql(`delete from private.exam_import_jobs where owner_id in('${teacher.id}','${other.id}','${stalled.id}'); delete from private.ai_credentials where id='${credentialId}';`);
  if (!originalModel) localSql("update private.ai_settings set chat_model=null where id");
  for (const id of secretIds) { if (/^[0-9a-f-]{36}$/.test(id)) localSql(`delete from vault.secrets where id='${id}'`); }
  await cleanupUsers();
});
async function reserve(user = teacher, request = crypto.randomUUID()) {
  return user.client.rpc("reserve_exam_import", { p_request: request, p_title: "Đề thử hàng chờ", p_format: "csv", p_bytes: 20, p_consent: true });
}
async function upload(job: { id: string; path: string }, user = teacher) {
  const stored = await admin.storage.from("exam-imports").upload(job.path, new Uint8Array(20).fill(65), { contentType: "text/csv" }); expect(stored.error).toBeNull();
  const completed = await user.client.rpc("complete_exam_import", { p_id: job.id, p_hash: "a".repeat(64) }); expect(completed.error).toBeNull();
}
describe("private AI import jobs", () => {
  it("Premium only, owner-only DTO, request dedupe and1active", async () => {
    expect((await reserve(free)).error?.code).toBe("PT402"); expect((await anon.rpc("exam_import_list")).error).not.toBeNull();
    const request = crypto.randomUUID(), first = await reserve(teacher, request); expect(first.error).toBeNull();
    expect((await reserve(teacher, request)).data.id).toBe(first.data.id);
    expect((await reserve()).error?.code).toBe("PT409");
    expect((await other.client.rpc("exam_import_owned", { p_id: first.data.id })).error?.code).toBe("PT404");
    expect((await root.client.rpc("exam_import_owned", { p_id: first.data.id })).error?.code).toBe("PT404");
    expect(JSON.stringify((await teacher.client.rpc("exam_import_list")).data)).not.toContain("lease_token");
    expect((await teacher.client.rpc("exam_import_claim")).error?.code).toBe("42501");
    await teacher.client.rpc("control_exam_import", { p_id: first.data.id, p_action: "cancel" });
    const cleanup = await admin.rpc("exam_import_claim"); expect(cleanup.data.task).toBe("cleanup");
    await admin.rpc("exam_import_checkpoint", { p_id: first.data.id, p_lease: cleanup.data.job.lease_token, p_action: "cleaned" });
  });
  it("durable budget, lease fencing, atomic apply and source cleanup", async () => {
    const r = await reserve(); expect(r.error).toBeNull(); await upload(r.data);
    expect((await root.client.storage.from("exam-imports").download(r.data.path)).error).not.toBeNull();
    expect((await other.client.storage.from("exam-imports").download(r.data.path)).error).not.toBeNull();
    const claim = await admin.rpc("exam_import_claim"); expect(claim.error).toBeNull(); const lease = claim.data.job.lease_token;
    expect((await admin.rpc("exam_import_checkpoint", { p_id: r.data.id, p_lease: lease, p_action: "extracted", p_cursor: 1, p_data: [{ text: "Nội dung có chữ", locator: { row: 1 } }] })).error).toBeNull();
    const generate = await admin.rpc("exam_import_claim"); const token = generate.data.job.lease_token;
    expect((await admin.rpc("exam_import_reserve_attempt", { p_id: r.data.id, p_lease: lease })).error?.code).toBe("PT409");
    expect((await admin.rpc("exam_import_reserve_attempt", { p_id: r.data.id, p_lease: token })).error).toBeNull();
    expect((await admin.rpc("exam_import_reserve_attempt", { p_id: r.data.id, p_lease: token })).error).toBeNull();
    expect((await admin.rpc("exam_import_reserve_attempt", { p_id: r.data.id, p_lease: token })).error?.code).toBe("PT409");
    const form = emptyExam(); form.title = "Đề sau xem lại"; const q = emptyQuestion("short_text"); q.prompt = "Điền từ"; q.accepted_answers = ["từ"]; form.document.sections = [{ id: crypto.randomUUID(), title: "I", questions: [q] }];
    expect((await admin.rpc("exam_import_checkpoint", { p_id: r.data.id, p_lease: token, p_action: "review", p_data: { form, provenance: [], warnings: [] } })).error).toBeNull();
    expect((await teacher.client.rpc("apply_exam_import", { p_id: r.data.id, p_form: form, p_reviewed: false })).error?.code).toBe("PT409");
    const results = await Promise.all(Array.from({ length: 2 }, () => teacher.client.rpc("apply_exam_import", { p_id: r.data.id, p_form: form, p_reviewed: true })));
    expect(results[0].error).toBeNull(); expect(results[1].error).toBeNull(); expect(results[0].data.id).toBe(results[1].data.id);
    const cleanup = await admin.rpc("exam_import_claim"); expect(cleanup.data.task).toBe("cleanup");
    await admin.storage.from("exam-imports").remove([r.data.path]);
    expect((await admin.rpc("exam_import_checkpoint", { p_id: r.data.id, p_lease: cleanup.data.job.lease_token, p_action: "cleaned" })).error).toBeNull();
    expect((await teacher.client.rpc("exam_import_owned", { p_id: r.data.id })).data.preview).toBeNull();
    expect((await teacher.client.rpc("exam_detail", { p_exam: results[0].data.id })).error).toBeNull();
    expect((await admin.rpc("exam_import_checkpoint", { p_id: r.data.id, p_lease: token, p_action: "review", p_data: { form } })).error?.code).toBe("PT409");
  });
  it("cancelled stale worker không hồi sinh kết quả, quota không reset", async () => {
    const r = await reserve(); expect(r.error).toBeNull(); await upload(r.data);
    const claim = await admin.rpc("exam_import_claim"); const lease = claim.data.job.lease_token;
    expect((await teacher.client.rpc("control_exam_import", { p_id: r.data.id, p_action: "cancel" })).error).toBeNull();
    expect((await admin.rpc("exam_import_checkpoint", { p_id: r.data.id, p_lease: lease, p_action: "extracted", p_cursor: 1, p_data: [] })).error?.code).toBe("PT409");
    expect((await reserve()).error?.code).toBe("PT429");
  });
  it("expiry ẩn nguồn ngay cả khi worker dọn tệp chưa chạy", async () => {
    const r = await reserve(other); expect(r.error).toBeNull(); await upload(r.data, other);
    localSql(`update private.exam_import_jobs set expires_at=clock_timestamp()-interval '1 second' where id='${r.data.id}'`);
    const owned = await other.client.rpc("exam_import_owned", { p_id: r.data.id }); expect(owned.data.status).toBe("expired"); expect(owned.data.preview).toBeNull();
    // One cancelled job may precede this one in cleanup; drain only our queue until expiry is claimed.
    for(let i = 0; i < 3; i++) {
      const claimed = await admin.rpc("exam_import_claim"); if(!claimed.data) break;
      expect(claimed.data.task).toBe("cleanup");
      await admin.storage.from("exam-imports").remove([claimed.data.job.path]);
      await admin.rpc("exam_import_checkpoint", { p_id: claimed.data.job.id, p_lease: claimed.data.job.lease_token, p_action: "cleaned" });
    }
    expect(localSql(`select path is null and result is null from private.exam_import_jobs where id='${r.data.id}'`).trim()).toBe("t");
  });
  it("worker thật đọc private Storage → checkpoint → review → apply → xóa nguồn (provider giả)", async () => {
    const bytes = Buffer.from("2+2? A.4 B.5 Key:A");
    const r = await other.client.rpc("reserve_exam_import", { p_request: crypto.randomUUID(), p_title: "Worker integration", p_format: "csv", p_bytes: bytes.length, p_consent: true }); expect(r.error).toBeNull();
    expect((await admin.storage.from("exam-imports").upload(r.data.path, bytes, { contentType: "text/csv" })).error).toBeNull();
    expect((await other.client.rpc("complete_exam_import", { p_id: r.data.id, p_hash: createHash("sha256").update(bytes).digest("hex") })).error).toBeNull();
    expect(await runExamImportStep()).toMatchObject({ state: "queued", id: r.data.id });
    const result = await runExamImportStep(async job => {
      expect(job.sections[0].text).toBe(bytes.toString());
      expect((await admin.rpc("exam_import_reserve_attempt", { p_id: job.id, p_lease: job.lease_token })).error).toBeNull();
      return parseAiExtraction({ questions: [{ section: "I", kind: "single", prompt: "2+2?", options: [{ label: "4", is_correct: true }, { label: "5", is_correct: false }], accepted_answers: [], ignore_diacritics: false, points: 1, excerpt: bytes.toString(), answerExcerpt: "Key:A", locatorIndex: 0 }], unparsed: [] }, job.sections, job.title);
    });
    expect(result).toMatchObject({ state: "needs_review", id: r.data.id });
    const preview = (await other.client.rpc("exam_import_owned", { p_id: r.data.id })).data.preview;
    const applied = await other.client.rpc("apply_exam_import", { p_id: r.data.id, p_form: preview.form, p_reviewed: true }); expect(applied.error).toBeNull();
    expect(await runExamImportStep()).toMatchObject({ state: "cleaned", id: r.data.id });
    expect((await admin.storage.from("exam-imports").download(r.data.path)).error).not.toBeNull();
    expect((await other.client.rpc("exam_detail", { p_exam: applied.data.id })).data.document.sections[0].questions[0].options[0].is_correct).toBe(true);
  });
  it("trích xuất treo tại cùng cursor chỉ được claim lại 3 lần rồi chuyển failed", async () => {
    const bytes = Buffer.from("Câu treo? A.1 B.2 Key:A");
    const r = await stalled.client.rpc("reserve_exam_import", { p_request: crypto.randomUUID(), p_title: "Trích xuất treo", p_format: "csv", p_bytes: bytes.length, p_consent: true }); expect(r.error).toBeNull();
    expect((await admin.storage.from("exam-imports").upload(r.data.path, bytes, { contentType: "text/csv" })).error).toBeNull();
    expect((await stalled.client.rpc("complete_exam_import", { p_id: r.data.id, p_hash: createHash("sha256").update(bytes).digest("hex") })).error).toBeNull();
    // Worker dies mid-extraction: no checkpoint, the lease simply runs out.
    for (let i = 1; i <= 3; i++) {
      const claim = await admin.rpc("exam_import_claim"); expect(claim.error).toBeNull();
      expect(claim.data).toMatchObject({ task: "extract", job: { id: r.data.id, extract_claims: i } });
      localSql(`update private.exam_import_jobs set lease_until=clock_timestamp()-interval '1 second' where id='${r.data.id}'`);
    }
    const stop = await admin.rpc("exam_import_claim");
    expect(stop.data).toMatchObject({ task: "cleanup", job: { id: r.data.id, status: "failed", error_code: "unsupported_file" } });
    expect((await stalled.client.rpc("exam_import_owned", { p_id: r.data.id })).data).toMatchObject({ status: "failed", errorCode: "unsupported_file" });
    await admin.storage.from("exam-imports").remove([r.data.path]);
    expect((await admin.rpc("exam_import_checkpoint", { p_id: r.data.id, p_lease: stop.data.job.lease_token, p_action: "cleaned" })).error).toBeNull();
  });
  it("hết lượt AI do race giữ đúng mã attempt_budget_exhausted", async () => {
    const bytes = Buffer.from("Câu race? A.1 B.2 Key:A");
    const r = await stalled.client.rpc("reserve_exam_import", { p_request: crypto.randomUUID(), p_title: "Race lượt AI", p_format: "csv", p_bytes: bytes.length, p_consent: true }); expect(r.error).toBeNull();
    expect((await admin.storage.from("exam-imports").upload(r.data.path, bytes, { contentType: "text/csv" })).error).toBeNull();
    expect((await stalled.client.rpc("complete_exam_import", { p_id: r.data.id, p_hash: createHash("sha256").update(bytes).digest("hex") })).error).toBeNull();
    expect(await runExamImportStep()).toMatchObject({ state: "queued", id: r.data.id });
    const result = await runExamImportStep(async job => {
      // Another worker spent the budget between claim and this attempt.
      localSql(`update private.exam_import_jobs set attempts=2 where id='${job.id}'`);
      dbError((await admin.rpc("exam_import_reserve_attempt", { p_id: job.id, p_lease: job.lease_token })).error);
      throw new Error("unreachable");
    });
    expect(result).toMatchObject({ state: "failed", id: r.data.id, code: "attempt_budget_exhausted" });
    expect((await stalled.client.rpc("exam_import_owned", { p_id: r.data.id })).data.errorCode).toBe("attempt_budget_exhausted");
  });
});
