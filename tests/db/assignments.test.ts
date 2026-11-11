import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, buildQuiz, cleanupUsers, createQuiz, saveQuestion, signUp, simpleQuestion, type TestUser } from "./helpers";

let a: TestUser;
let b: TestUser;
let classA = "";
let quizA = "";

async function createClass(user: TestUser, name = "Lớp assignment") {
  const { data, error } = await user.client.rpc("create_class_with_students", { class_name: name, student_names: ["An", "Bình"] });
  expect(error, "tạo lớp").toBeNull();
  return data as string;
}

async function createAssignment(user: TestUser, overrides: Record<string, unknown> = {}) {
  const { data, error } = await user.client.rpc("create_assignment", {
    p_class_id: classA,
    p_quiz_id: quizA,
    p_title: "Bài assignment",
    p_description: "Ôn tập chương 1",
    p_reveal_policy: "after_close",
    ...overrides,
  });
  expect(error, "tạo assignment").toBeNull();
  return data as string;
}

beforeAll(async () => {
  a = await signUp("assignment-a");
  b = await signUp("assignment-b");
  classA = await createClass(a, "Lớp 7A assignment");
  quizA = await buildQuiz(a.client, "Quiz assignment", [simpleQuestion("Câu snapshot")]);
}, 60_000);

afterAll(cleanupUsers);

describe("assignment core: quyền và tạo snapshot", () => {
  it("anon không đọc bảng hay gọi teacher RPC; giáo viên khác không dùng được class/quiz của A", async () => {
    expect((await anon.from("assignments").select("*")).error?.code).toBe("42501");
    expect((await a.client.from("assignments").select("*")).error?.code).toBe("42501");
    expect((await anon.rpc("assignment_list")).error?.code).toBe("42501");
    const foreign = await b.client.rpc("create_assignment", {
      p_class_id: classA,
      p_quiz_id: quizA,
      p_title: "Bị chiếm",
      p_description: "",
      p_reveal_policy: "after_close",
    });
    expect(foreign.error?.message).toContain("class_not_found");
  });

  it("chỉ tạo từ class/quiz cùng chủ và quiz playable; lỗi không để lại assignment dở dang", async () => {
    const incompleteQuiz = await createQuiz(a.client, "Quiz chưa hoàn chỉnh");
    const before = await a.client.rpc("assignment_list", { p_limit: 100 });
    const bad = await a.client.rpc("create_assignment", {
      p_class_id: classA,
      p_quiz_id: incompleteQuiz,
      p_title: "Không được tạo",
      p_description: "",
      p_reveal_policy: "after_close",
    });
    expect(bad.error?.message).toContain("quiz_not_playable");
    const after = await a.client.rpc("assignment_list", { p_limit: 100 });
    expect(after.data).toEqual(before.data);

    const invalidSchedule = await a.client.rpc("create_assignment", {
      p_class_id: classA,
      p_quiz_id: quizA,
      p_title: "Lịch sai",
      p_opens_at: "2026-01-02T08:00:00Z",
      p_due_at: "2026-01-01T08:00:00Z",
      p_description: "",
      p_reveal_policy: "after_close",
    });
    expect(invalidSchedule.error?.message).toContain("assignment_schedule_invalid");
  });

  it("snapshot giữ nguyên sau khi quiz nguồn sửa rồi xoá", async () => {
    const assignmentId = await createAssignment(a, { p_title: "Bài giữ snapshot" });
    const question = await a.client.from("questions").select("id").eq("quiz_id", quizA).single();
    const changed = await saveQuestion(a.client, quizA, {
      id: (question.data as { id: string }).id,
      kind: "single",
      prompt: "Câu nguồn đã sửa",
      time_limit_seconds: 20,
      accepted_answers: [],
      ignore_diacritics: false,
      options: [{ label: "Mới", is_correct: true }, { label: "Sai" }],
    });
    expect(changed.error).toBeNull();

    const beforeDelete = await a.client.rpc("assignment_detail", { p_assignment: assignmentId });
    expect((beforeDelete.data as { snapshot: { questions: { prompt: string }[] } }).snapshot.questions[0].prompt).toBe("Câu snapshot");
    expect((await a.client.from("quizzes").delete().eq("id", quizA)).error).toBeNull();
    const afterDelete = await a.client.rpc("assignment_detail", { p_assignment: assignmentId });
    expect((afterDelete.data as { quiz_id: string | null }).quiz_id).toBeNull();
    expect((afterDelete.data as { snapshot: { questions: { prompt: string }[] } }).snapshot.questions[0].prompt).toBe("Câu snapshot");

    // Dựng lại nguồn dùng cho các ca sau; assignment cũ vẫn không phụ thuộc nguồn mới.
    quizA = await buildQuiz(a.client, "Quiz assignment mới", [simpleQuestion("Câu mới")]);
  });
});

describe("assignment core: lifecycle, list và retention", () => {
  it("không cho vượt 100 assignment kể cả khi tạo đồng thời", async () => {
    const limited = await signUp("assignment-limit");
    const limitedClass = await createClass(limited, "Lớp giới hạn assignment");
    const limitedQuiz = await buildQuiz(limited.client, "Quiz giới hạn assignment", [simpleQuestion("Câu giới hạn")]);
    const attempts = await Promise.all(
      Array.from({ length: 105 }, (_, index) => limited.client.rpc("create_assignment", {
        p_class_id: limitedClass,
        p_quiz_id: limitedQuiz,
        p_title: `Bài giới hạn ${index}`,
        p_description: "",
        p_reveal_policy: "after_close",
      })),
    );
    expect(attempts.filter((result) => !result.error)).toHaveLength(100);
    expect(attempts.filter((result) => result.error?.message.includes("assignment_limit_exceeded"))).toHaveLength(5);
  }, 60_000);

  it("draft sửa được, publish khóa draft, closed không mở lại và delete là explicit", async () => {
    const assignmentId = await createAssignment(a, { p_title: "Bài lifecycle" });
    expect((await a.client.rpc("update_assignment_draft", {
      p_assignment: assignmentId,
      p_title: "Bài lifecycle đã sửa",
      p_description: "Mô tả mới",
      p_reveal_policy: "immediate",
    })).error).toBeNull();
    expect((await a.client.rpc("publish_assignment", { p_assignment: assignmentId })).error).toBeNull();
    expect((await a.client.rpc("update_assignment_draft", {
      p_assignment: assignmentId,
      p_title: "Không được sửa",
      p_description: "",
      p_reveal_policy: "immediate",
    })).error?.message).toContain("assignment_not_editable");
    expect((await a.client.rpc("close_assignment", { p_assignment: assignmentId })).error).toBeNull();
    expect((await a.client.rpc("publish_assignment", { p_assignment: assignmentId })).error?.message).toContain("assignment_not_publishable");
    expect((await a.client.rpc("close_assignment", { p_assignment: assignmentId })).error?.message).toContain("assignment_not_closable");
    expect((await a.client.rpc("delete_assignment", { p_assignment: assignmentId })).error).toBeNull();
    const removed = await a.client.rpc("assignment_detail", { p_assignment: assignmentId });
    expect(removed.data).toBeNull();
  });

  it("list bounded, ổn định và không lộ assignment của A cho B", async () => {
    const first = await createAssignment(a, { p_title: "Bài list một" });
    const second = await createAssignment(a, { p_title: "Bài list hai" });
    const listed = await a.client.rpc("assignment_list", { p_limit: 1, p_offset: 0 });
    expect(listed.error).toBeNull();
    expect(listed.data).toHaveLength(1);
    const next = await a.client.rpc("assignment_list", { p_limit: 1, p_offset: 1 });
    expect((listed.data as { id: string }[])[0].id).not.toBe((next.data as { id: string }[])[0].id);
    expect([first, second]).toContain((listed.data as { id: string }[])[0].id);
    expect((await b.client.rpc("assignment_list", { p_limit: 100 })).data).toEqual([]);
    expect((await b.client.rpc("assignment_detail", { p_assignment: first })).data).toBeNull();
  });

  it("tạo bài mới dọn bài closed quá 365 ngày của chính giáo viên", async () => {
    const old = await createAssignment(a, { p_title: "Bài quá hạn lưu trữ" });
    expect((await a.client.rpc("publish_assignment", { p_assignment: old })).error).toBeNull();
    expect((await a.client.rpc("close_assignment", { p_assignment: old })).error).toBeNull();
    expect((await admin.from("assignments").update({ closed_at: "2025-01-01T00:00:00Z" }).eq("id", old)).error).toBeNull();
    await createAssignment(a, { p_title: "Bài kích hoạt purge" });
    expect((await admin.from("assignments").select("id").eq("id", old)).data).toEqual([]);
  });
});
