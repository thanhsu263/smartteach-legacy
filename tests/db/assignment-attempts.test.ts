import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, buildQuiz, cleanupUsers, signUp, simpleQuestion, type TestUser } from "./helpers";
import { psql } from "./live-helpers";

let teacher: TestUser;
let assignmentId = "";
let studentId = "";
let credential = "";
let classId = "";
let quizId = "";
let submittedAttemptId = "";

beforeAll(async () => {
  teacher = await signUp("attempt-teacher");
  const klass = await teacher.client.rpc("create_class_with_students", { class_name: "Lớp attempt", student_names: ["An", "Bình"] });
  expect(klass.error).toBeNull();
  classId = klass.data as string;
  const students = await teacher.client.from("students").select("id").eq("class_id", classId).order("position");
  studentId = (students.data as { id: string }[])[0].id;
  quizId = await buildQuiz(teacher.client, "Quiz attempt", [simpleQuestion("Một"), simpleQuestion("Hai")]);
  const created = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài attempt", p_description: "", p_reveal_policy: "immediate" });
  expect(created.error).toBeNull(); assignmentId = created.data as string;
  expect((await teacher.client.rpc("publish_assignment", { p_assignment: assignmentId })).error).toBeNull();
  const issued = await teacher.client.rpc("issue_student_credential", { p_student: studentId });
  expect(issued.error).toBeNull(); credential = (issued.data as { credential: string }).credential;
}, 60_000);

afterAll(cleanupUsers);

describe("assignment attempt boundary", () => {
  it("không grant bảng riêng; exchange sai luôn generic", async () => {
    for (const table of ["student_access_credentials", "assignment_attempts", "assignment_answers"] as const) {
      expect((await anon.from(table).select("*")).error?.code).toBe("42501");
    }
    const invalid = await anon.rpc("exchange_assignment_access", { p_code: "NOPE", p_credential: "NOPE" });
    expect(invalid.data).toEqual({ result: "invalid" });
  });

  it("exchange, save và submit idempotent không lộ answer key", async () => {
    const assignment = await teacher.client.rpc("assignment_detail", { p_assignment: assignmentId });
    const code = (assignment.data as { public_code: string }).public_code;
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    expect(exchange.error).toBeNull();
    const token = (exchange.data as { token: string }).token;
    submittedAttemptId = (exchange.data as { attempt_id: string }).attempt_id;
    const state = await anon.rpc("assignment_student_state", { p_token: token });
    expect(JSON.stringify(state.data)).not.toContain("is_correct");
    expect((await anon.rpc("save_assignment_answer", { p_token: token, p_position: 0, p_answer: 0 })).error).toBeNull();
    expect((await anon.rpc("save_assignment_answer", { p_token: token, p_position: 1, p_answer: 0 })).error).toBeNull();
    const first = await anon.rpc("submit_assignment", { p_token: token });
    const retry = await anon.rpc("submit_assignment", { p_token: token });
    expect(first.error).toBeNull(); expect(retry.data).toEqual(first.data);
    const count = await teacher.client.from("assignment_attempts").select("id", { count: "exact", head: true }).eq("assignment_id", assignmentId);
    expect(count.data).toBeNull();
    expect(count.count).toBeNull();

    const afterSubmitExchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    expect((afterSubmitExchange.data as { attempt_id: string }).attempt_id).toBe(submittedAttemptId);
  });

  it("analytics và chi tiết lượt làm chỉ thuộc về giáo viên sở hữu bài", async () => {
    const analytics = await teacher.client.rpc("assignment_question_analytics", { p_assignment: assignmentId });
    expect(analytics.error).toBeNull();
    expect(analytics.data).toMatchObject([
      { position: 0, answered: 1, correct: 1, unanswered: 1 },
      { position: 1, answered: 1, correct: 1, unanswered: 1 },
    ]);
    const detail = await teacher.client.rpc("assignment_attempt_detail", { p_assignment: assignmentId, p_student: studentId });
    expect(detail.error).toBeNull();
    expect(detail.data).toMatchObject({ student_id: studentId, status: "submitted", score: 2 });
    expect((detail.data as { answers: unknown[] }).answers).toMatchObject([
      { position: 0, answer: 0, is_correct: true },
      { position: 1, answer: 0, is_correct: true },
    ]);
    expect((await anon.rpc("assignment_question_analytics", { p_assignment: assignmentId })).error?.code).toBe("42501");
    const other = await signUp("analytics-other");
    expect((await other.client.rpc("assignment_attempt_detail", { p_assignment: assignmentId, p_student: studentId })).error?.code).toBe("PT404");
  });

  it("rotate credential vô hiệu token in-progress nhưng không làm hỏng bài đã nộp", async () => {
    const issued = await teacher.client.rpc("issue_student_credential", { p_student: studentId });
    const fresh = (issued.data as { credential: string }).credential;
    credential = fresh;
    const code = ((await teacher.client.rpc("assignment_detail", { p_assignment: assignmentId })).data as { public_code: string }).public_code;
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: fresh });
    expect((exchange.data as { result: string }).result).toBe("ok");
    expect((exchange.data as { attempt_id: string }).attempt_id).toBe(submittedAttemptId);
  });

  it("due, reset và submit đồng thời giữ đúng lifecycle", async () => {
    const created = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài race", p_description: "", p_reveal_policy: "after_close" });
    const raceAssignment = created.data as string;
    expect((await teacher.client.rpc("publish_assignment", { p_assignment: raceAssignment })).error).toBeNull();
    const code = ((await teacher.client.rpc("assignment_detail", { p_assignment: raceAssignment })).data as { public_code: string }).public_code;
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    const token = (exchange.data as { token: string }).token;
    await anon.rpc("save_assignment_answer", { p_token: token, p_position: 0, p_answer: 0 });
    const submitted = await Promise.all([anon.rpc("submit_assignment", { p_token: token }), anon.rpc("submit_assignment", { p_token: token })]);
    expect(submitted.map((result) => result.error)).toEqual([null, null]);
    expect(submitted[0].data).toEqual(submitted[1].data);
    expect((await teacher.client.rpc("reset_assignment_attempt", { p_assignment: raceAssignment, p_student: studentId })).error).toBeNull();
    const fresh = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    expect((fresh.data as { attempt_id: string }).attempt_id).not.toBe((exchange.data as { attempt_id: string }).attempt_id);
  });

  it("reveal after_close, due và token expiry chỉ mở/đóng đúng thời điểm", async () => {
    const created = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài policy", p_description: "", p_reveal_policy: "after_close" });
    const policyAssignment = created.data as string;
    await teacher.client.rpc("publish_assignment", { p_assignment: policyAssignment });
    const code = ((await teacher.client.rpc("assignment_detail", { p_assignment: policyAssignment })).data as { public_code: string }).public_code;
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    const token = (exchange.data as { token: string }).token;
    await anon.rpc("save_assignment_answer", { p_token: token, p_position: 0, p_answer: 0 });
    await anon.rpc("submit_assignment", { p_token: token });
    expect((await anon.rpc("assignment_student_state", { p_token: token })).data).toMatchObject({ phase: "submitted", result: null });
    await teacher.client.rpc("close_assignment", { p_assignment: policyAssignment });
    expect((await anon.rpc("assignment_student_state", { p_token: token })).data).toMatchObject({ phase: "submitted", result: { total: 2 } });

    const due = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài due", p_description: "", p_reveal_policy: "immediate" });
    const dueId = due.data as string;
    await teacher.client.rpc("publish_assignment", { p_assignment: dueId });
    const dueCode = ((await teacher.client.rpc("assignment_detail", { p_assignment: dueId })).data as { public_code: string }).public_code;
    expect((await teacher.client.from("assignments").select("id").eq("id", dueId)).data).toBeNull();
    // service-role chỉ dùng để tạo ranh giới thời gian trong DB test.
    await admin.from("assignments").update({ due_at: "2020-01-01T00:00:00Z" }).eq("id", dueId);
    expect((await anon.rpc("exchange_assignment_access", { p_code: dueCode, p_credential: credential })).data).toEqual({ result: "invalid" });
  });

  it("token hết hạn hoặc credential bị revoke không tiếp tục làm bài; progress theo roster đúng", async () => {
    const created = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài access", p_description: "", p_reveal_policy: "immediate" });
    const accessId = created.data as string;
    await teacher.client.rpc("publish_assignment", { p_assignment: accessId });
    const code = ((await teacher.client.rpc("assignment_detail", { p_assignment: accessId })).data as { public_code: string }).public_code;
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    const token = (exchange.data as { token: string }).token;
    expect((await teacher.client.rpc("assignment_progress", { p_assignment: accessId })).data).toEqual({ not_started: 1, in_progress: 1, submitted: 0 });
    await admin.from("assignment_attempts").update({ token_expires_at: "2020-01-01T00:00:00Z" }).eq("id", (exchange.data as { attempt_id: string }).attempt_id);
    expect((await anon.rpc("assignment_student_state", { p_token: token })).error?.message).toContain("attempt_not_found");

    const fresh = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential });
    const freshToken = (fresh.data as { token: string }).token;
    expect((await teacher.client.rpc("revoke_student_credential", { p_student: studentId })).error).toBeNull();
    expect((await anon.rpc("assignment_student_state", { p_token: freshToken })).data).toMatchObject({ phase: "invalidated" });
    expect((await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: credential })).data).toEqual({ result: "invalid" });
  });

  it("purge private giữ ranh giới 364/366 ngày, có giới hạn mẻ và kéo attempt/answer theo cascade", async () => {
    const old = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài retention cũ", p_description: "", p_reveal_policy: "immediate" });
    const older = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài retention cũ hơn", p_description: "", p_reveal_policy: "immediate" });
    const recent = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài retention mới", p_description: "", p_reveal_policy: "immediate" });
    for (const id of [old.data, older.data, recent.data]) { await teacher.client.rpc("publish_assignment", { p_assignment: id }); }
    const issued = await teacher.client.rpc("issue_student_credential", { p_student: studentId });
    const code = ((await teacher.client.rpc("assignment_detail", { p_assignment: old.data as string })).data as { public_code: string }).public_code;
    const exchange = await anon.rpc("exchange_assignment_access", { p_code: code, p_credential: (issued.data as { credential: string }).credential });
    const attemptId = (exchange.data as { attempt_id: string; token: string }).attempt_id;
    expect((await anon.rpc("save_assignment_answer", { p_token: (exchange.data as { token: string }).token, p_position: 0, p_answer: 0 })).error).toBeNull();
    for (const id of [old.data, older.data, recent.data]) { await teacher.client.rpc("close_assignment", { p_assignment: id }); }
    const now = Date.now();
    await admin.from("assignments").update({ closed_at: new Date(now - 366 * 86_400_000).toISOString() }).eq("id", old.data as string);
    await admin.from("assignments").update({ closed_at: new Date(now - 367 * 86_400_000).toISOString() }).eq("id", older.data as string);
    await admin.from("assignments").update({ closed_at: new Date(now - 364 * 86_400_000).toISOString() }).eq("id", recent.data as string);
    expect(Number(psql(`select private.purge_old_assignments(365, '${teacher.id}'::uuid, 1);`))).toBe(1);
    const oldIdsAfterFirstBatch = (await admin.from("assignments").select("id").in("id", [old.data as string, older.data as string])).data ?? [];
    expect(oldIdsAfterFirstBatch).toHaveLength(1);
    expect(Number(psql(`select private.purge_old_assignments(365, '${teacher.id}'::uuid, 1);`))).toBe(1);
    expect((await admin.from("assignments").select("id").eq("id", old.data as string)).data).toEqual([]);
    expect((await admin.from("assignments").select("id").eq("id", older.data as string)).data).toEqual([]);
    expect((await admin.from("assignments").select("id").eq("id", recent.data as string)).data).toHaveLength(1);
    expect((await admin.from("assignment_attempts").select("id").eq("id", attemptId)).data).toEqual([]);
    expect((await admin.from("assignment_answers").select("attempt_id").eq("attempt_id", attemptId)).data).toEqual([]);
    expect(() => psql("select private.purge_old_assignments(0);")).toThrow();
    expect(() => psql("select private.purge_old_assignments(-1);")).toThrow();
  });

  it("API không gọi được private purge và migration lịch chịu được pg_cron vắng hoặc lỗi", async () => {
    for (const client of [anon, teacher.client]) {
      expect((await client.rpc("purge_old_assignments", {})).error).not.toBeNull();
    }
    expect(psql("select has_function_privilege('anon', 'private.purge_old_assignments(integer,uuid,integer)', 'execute'), has_function_privilege('authenticated', 'private.purge_old_assignments(integer,uuid,integer)', 'execute');")).toBe("f|f");
    const file = readFileSync(joinPath(process.cwd(), "supabase/migrations/20261112110000_assignment_retention_schedule.sql"), "utf8").replace(/\r\n/g, "\n");
    const block = /do \$cron\$[\s\S]*?\$cron\$;/.exec(file)?.[0];
    expect(block, "không tìm thấy khối lập lịch assignment").toBeTruthy();
    expect(() => psql(block!)).not.toThrow();
    expect(() => psql(block!.replace("name = 'pg_cron'", "name = 'pg_cron_khong_co'"))).not.toThrow();
    expect(() => psql(block!.replace("cron.schedule(", "cron.khong_co_ham("))).not.toThrow();
    expect(["0", "1"]).toContain(psql("select count(*) from cron.job where jobname = 'smartteach-purge-old-assignments';"));
  });

  it("xoá lớp kéo credential, assignment, attempt và answer, không để orphan", async () => {
    const assignment = await teacher.client.rpc("create_assignment", { p_class_id: classId, p_quiz_id: quizId, p_title: "Bài cascade lớp", p_description: "", p_reveal_policy: "immediate" });
    expect(assignment.error).toBeNull();
    expect((await teacher.client.from("classes").delete().eq("id", classId)).error).toBeNull();
    expect((await admin.from("classes").select("id").eq("id", classId)).data).toEqual([]);
    expect((await admin.from("students").select("id").eq("id", studentId)).data).toEqual([]);
    expect((await admin.from("student_access_credentials").select("id").eq("student_id", studentId)).data).toEqual([]);
    expect((await admin.from("assignments").select("id").eq("class_id", classId)).data).toEqual([]);
    expect((await admin.from("assignment_attempts").select("id").eq("id", submittedAttemptId)).data).toEqual([]);
    expect((await admin.from("assignment_answers").select("attempt_id").eq("attempt_id", submittedAttemptId)).data).toEqual([]);
  });
});
