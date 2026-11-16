import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, grantPremiumForTest, signUp, type TestUser } from "./helpers";
import { localSql } from "./admin-fixtures";
import { emptyExam, emptyQuestion } from "../../src/lib/exams/types";
let teacher: TestUser, free: TestUser, classId = "", studentId = "", credential = "", examId = "";
beforeAll(async () => {
  teacher = await signUp("online-exam-teacher"); free = await signUp("online-exam-free"); await grantPremiumForTest(teacher);
  const klass = await teacher.client.rpc("create_class_with_students", { class_name: "Lớp kiểm tra", student_names: ["An"] }); expect(klass.error).toBeNull(); classId = klass.data;
  studentId = (await teacher.client.from("students").select("id").eq("class_id", classId)).data![0].id;
  credential = (await teacher.client.rpc("issue_student_credential", { p_student: studentId })).data.credential;
  const form = emptyExam(); form.title = "Đề có trọng số"; form.document.durationMinutes = 1;
  const first = emptyQuestion("single"); first.prompt = "2+2=?"; first.options = [{ label: "4", is_correct: true }, { label: "5", is_correct: false }]; first.pointUnits = 25;
  const second = emptyQuestion("short_text"); second.prompt = "Con vật kêu meo meo?"; second.accepted_answers = ["con mèo"]; second.ignore_diacritics = true; second.pointUnits = 175;
  form.document.sections = [{ id: crypto.randomUUID(), title: "Phần I", questions: [first, second] }];
  const saved = await teacher.client.rpc("save_exam", { p_exam: null, p_revision: null, p_request: crypto.randomUUID(), p_title: form.title, p_description: "", p_document: form.document }); expect(saved.error).toBeNull(); examId = saved.data.id;
}, 30000);
afterAll(cleanupUsers);
async function launch(reveal = "immediate") {
  const request = crypto.randomUUID();
  const args = { p_exam: examId, p_revision: 1, p_class: classId, p_title: "Bài kiểm tra", p_request: request, p_reveal_policy: reveal };
  const r = await teacher.client.rpc("create_exam_assignment", args); expect(r.error).toBeNull();
  expect((await teacher.client.rpc("create_exam_assignment", args)).data).toBe(r.data);
  expect((await teacher.client.rpc("publish_assignment", { p_assignment: r.data })).error).toBeNull();
  const detail = await teacher.client.rpc("assignment_detail", { p_assignment: r.data });
  const exchange = await anon.rpc("exchange_assignment_access", { p_code: detail.data.public_code, p_credential: credential }); expect(exchange.error).toBeNull();
  return { id: r.data as string, code: detail.data.public_code as string, token: exchange.data.token as string, attempt: exchange.data.attempt_id as string };
}
describe("online exam deadline and weighted scoring", () => {
  it("Premium create; state no key; weighted points and idempotent submit", async () => {
    expect((await free.client.rpc("create_exam_assignment", { p_exam: examId, p_revision: 1, p_class: classId, p_title: "Không có quyền", p_request: crypto.randomUUID() })).error?.code).toBe("PT402");
    const r = await launch();
    const state = await anon.rpc("assignment_student_state", { p_token: r.token }); expect(state.error).toBeNull();
    expect(JSON.stringify(state.data)).not.toContain("accepted_answers"); expect(JSON.stringify(state.data)).not.toContain("is_correct"); expect(state.data.deadline_at).toBeTruthy();
    expect((await anon.rpc("save_assignment_answer", { p_token: r.token, p_position: 0, p_answer: 0 })).data.saved).toBe(true);
    expect((await anon.rpc("save_assignment_answer", { p_token: r.token, p_position: 1, p_answer: "CON MEO" })).error).toBeNull();
    const submitted = await anon.rpc("submit_assignment", { p_token: r.token }); expect(submitted.error).toBeNull(); expect(submitted.data.score_points).toBe(2);
    expect((await anon.rpc("submit_assignment", { p_token: r.token })).data).toEqual(submitted.data);
    const roster = await teacher.client.rpc("assignment_roster_results", { p_assignment: r.id }); expect(roster.data[0]).toMatchObject({ correct: 2, total: 2, score_points: 2, max_points: 2 });
  });
  it("renewal không tăng giờ; quá hạn chốt mà không nhận câu trả lời mới", async () => {
    const r = await launch("after_close");
    const before = await anon.rpc("assignment_student_state", { p_token: r.token });
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: r.code, p_credential: credential }); expect(exchange.error).toBeNull();
    const token = exchange.data.token;
    expect((await anon.rpc("assignment_student_state", { p_token: token })).data.deadline_at).toBe(before.data.deadline_at);
    await anon.rpc("save_assignment_answer", { p_token: token, p_position: 0, p_answer: 0 });
    localSql(`update public.assignment_attempts set deadline_at=clock_timestamp()-interval '1 second' where id='${r.attempt}'`);
    const late = await anon.rpc("save_assignment_answer", { p_token: token, p_position: 1, p_answer: "con mèo" }); expect(late.error).toBeNull(); expect(late.data.saved).toBe(false);
    const state = await anon.rpc("assignment_student_state", { p_token: token }); expect(state.data.phase).toBe("submitted"); expect(state.data.result).toBeNull();
    await admin.from("membership_entitlements").update({ premium_until: new Date(Date.now() - 1000).toISOString() }).eq("user_id", teacher.id);
    expect((await teacher.client.rpc("close_assignment", { p_assignment: r.id })).error).toBeNull();
    expect((await anon.rpc("assignment_student_state", { p_token: token })).data.result).toMatchObject({ score_points: 0.25, max_points: 2, correct: 1 });
    await grantPremiumForTest(teacher);
  });
  it("Cron finalize không cần HTTP, private legacy RPC không thành bypass", async () => {
    const r = await launch();
    localSql(`update public.assignment_attempts set deadline_at=clock_timestamp()-interval '1 second' where id='${r.attempt}'; select private.finalize_due_exam_attempts();`);
    expect((await anon.rpc("assignment_student_state", { p_token: r.token })).data.phase).toBe("submitted");
    expect((await anon.schema("private").rpc("legacy_save_assignment_answer", { p_token: r.token, p_position: 0, p_answer: 0 })).error).not.toBeNull();
  });
});
