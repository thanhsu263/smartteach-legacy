import { afterAll, beforeAll, describe, expect, it } from "vitest";
import cases from "../fixtures/quiz-validation-cases.json";
import {
  admin,
  anon,
  buildQuiz,
  cleanupUsers,
  createQuiz,
  saveQuestion,
  signUp,
  simpleQuestion,
  type QuestionInput,
  type TestUser,
} from "./helpers";

/**
 * Kiểm thử bảng quiz, RLS, giới hạn và các hàm của phase 1 giai đoạn 2, đi qua đúng đường
 * mà ứng dụng dùng (PostgREST với JWT của từng người). Cần `npm run supabase:start`.
 */

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await signUp("quiz-a");
  b = await signUp("quiz-b");
}, 60_000);

afterAll(cleanupUsers);

async function problemsOf(user: TestUser, quizId: string) {
  const { data, error } = await user.client.rpc("quiz_problems", { p_quiz_id: quizId });
  expect(error).toBeNull();
  return (data as { question_position: number; code: string }[])
    .map((row) => [row.question_position, row.code] as [number, string])
    .sort((x, y) => x[0] - y[0] || x[1].localeCompare(y[1]));
}

describe("1.1 quyền truy cập và RLS", () => {
  it("khách chưa đăng nhập không đọc hay ghi được bảng nào", async () => {
    for (const table of ["quizzes", "questions", "options"] as const) {
      expect((await anon.from(table).select("*")).error?.code, `đọc ${table}`).toBe("42501");
    }
    expect((await anon.from("quizzes").insert({ title: "x" })).error?.code).toBe("42501");
  });

  it("chủ quiz tạo được quiz, owner_id là chính mình, và đọc lại được", async () => {
    const id = await createQuiz(a.client, "Quiz của A");
    const { data } = await a.client.from("quizzes").select("owner_id, title, share_token").eq("id", id).single();
    expect(data).toEqual({ owner_id: a.id, title: "Quiz của A", share_token: null });
  });

  it("giáo viên B không đọc, sửa, xoá được quiz, câu hỏi, lựa chọn của A", async () => {
    const quizId = await buildQuiz(a.client, "Riêng của A", [simpleQuestion("Câu của A")]);
    const question = await a.client.from("questions").select("id").eq("quiz_id", quizId).single();
    const questionId = (question.data as { id: string }).id;
    const option = await a.client.from("options").select("id").eq("question_id", questionId).limit(1).single();
    const optionId = (option.data as { id: string }).id;

    expect((await b.client.from("quizzes").select("id").eq("id", quizId)).data).toEqual([]);
    expect((await b.client.from("questions").select("id").eq("id", questionId)).data).toEqual([]);
    expect((await b.client.from("options").select("id").eq("id", optionId)).data).toEqual([]);

    expect((await b.client.from("quizzes").update({ title: "bị chiếm" }).eq("id", quizId).select()).data).toEqual([]);
    expect((await b.client.from("questions").update({ prompt: "bị chiếm" }).eq("id", questionId).select()).data).toEqual([]);
    expect((await b.client.from("options").update({ label: "bị chiếm" }).eq("id", optionId).select()).data).toEqual([]);
    expect((await b.client.from("quizzes").delete().eq("id", quizId).select()).data).toEqual([]);
    expect((await b.client.from("questions").delete().eq("id", questionId).select()).data).toEqual([]);
    expect((await b.client.from("options").delete().eq("id", optionId).select()).data).toEqual([]);

    const intact = await a.client.from("quizzes").select("title").eq("id", quizId).single();
    expect(intact.data?.title).toBe("Riêng của A");
  });

  it("B không chèn được câu hỏi hay lựa chọn vào quiz của A, và không tạo quiz mang tên A", async () => {
    const quizId = await createQuiz(a.client, "Quiz bị nhòm ngó");
    const questionId = (
      await a.client.from("questions").insert({ quiz_id: quizId, kind: "single", prompt: "q" }).select("id").single()
    ).data as { id: string };

    expect((await b.client.from("questions").insert({ quiz_id: quizId, kind: "single", prompt: "kẻ lạ" })).error?.code).toBe("42501");
    expect((await b.client.from("options").insert({ question_id: questionId.id, label: "kẻ lạ" })).error?.code).toBe("42501");
    expect((await b.client.from("quizzes").insert({ title: "giả mạo", owner_id: a.id })).error?.code).toBe("42501");
  });

  it("owner_id, quiz_id, question_id không đổi được sau khi tạo", async () => {
    const quizA = await createQuiz(a.client, "Quiz của A để thử chuyển");
    const quizA2 = await createQuiz(a.client, "Quiz thứ hai của A");
    const quizB = await createQuiz(b.client, "Quiz của B");
    const q = (await a.client.from("questions").insert({ quiz_id: quizA, kind: "single", prompt: "q" }).select("id").single()).data as { id: string };
    const o = (await a.client.from("options").insert({ question_id: q.id, label: "o" }).select("id").single()).data as { id: string };

    expect((await a.client.from("quizzes").update({ owner_id: b.id }).eq("id", quizA)).error).not.toBeNull();
    expect((await a.client.from("questions").update({ quiz_id: quizB }).eq("id", q.id)).error).not.toBeNull();
    expect((await a.client.from("questions").update({ quiz_id: quizA2 }).eq("id", q.id)).error?.message).toContain("quiz_change_forbidden");
    const other = (await a.client.from("questions").insert({ quiz_id: quizA2, kind: "single", prompt: "q2" }).select("id").single()).data as { id: string };
    expect((await a.client.from("options").update({ question_id: other.id }).eq("id", o.id)).error?.message).toContain("question_change_forbidden");
  });

  it("xoá quiz kéo theo xoá câu hỏi và lựa chọn", async () => {
    const quizId = await buildQuiz(a.client, "Sẽ xoá", [simpleQuestion()]);
    const q = (await admin.from("questions").select("id").eq("quiz_id", quizId)).data as { id: string }[];
    expect(q).toHaveLength(1);
    expect((await a.client.from("quizzes").delete().eq("id", quizId).select()).data).toHaveLength(1);
    expect((await admin.from("questions").select("id").eq("quiz_id", quizId)).data).toEqual([]);
    expect((await admin.from("options").select("id").eq("question_id", q[0].id)).data).toEqual([]);
  });

  it("từ chối dữ liệu sai dạng, rỗng hoặc quá dài", async () => {
    const quizId = await createQuiz(a.client, "Quiz kiểm ràng buộc");
    const bad = async (row: Record<string, unknown>) =>
      (await a.client.from("questions").insert({ quiz_id: quizId, kind: "single", prompt: "q", ...row })).error?.code;

    expect((await a.client.from("quizzes").insert({ title: "  " })).error?.code).toBe("23514");
    expect((await a.client.from("quizzes").insert({ title: "x".repeat(101) })).error?.code).toBe("23514");
    expect(await bad({ prompt: "" })).toBe("23514");
    expect(await bad({ prompt: "p".repeat(501) })).toBe("23514");
    expect(await bad({ kind: "essay" })).toBe("23514");
    expect(await bad({ time_limit_seconds: 15 })).toBe("23514");
    expect(await bad({ time_limit_seconds: 0 })).toBe("23514");
    expect(await bad({ accepted_answers: Array.from({ length: 11 }, (_, i) => `đ${i}`) })).toBe("23514");
    expect(await bad({ accepted_answers: ["hợp lệ", "   "] })).toBe("23514");
    expect(await bad({ accepted_answers: ["x".repeat(101)] })).toBe("23514");
    for (const seconds of [10, 20, 30, 60, 90]) expect(await bad({ time_limit_seconds: seconds })).toBeUndefined();

    const question = (await a.client.from("questions").select("id").eq("quiz_id", quizId).limit(1).single()).data as { id: string };
    expect((await a.client.from("options").insert({ question_id: question.id, label: "" })).error?.code).toBe("23514");
    expect((await a.client.from("options").insert({ question_id: question.id, label: "y".repeat(151) })).error?.code).toBe("23514");
  });
});

describe("1.1 giới hạn số lượng", () => {
  it("tối đa 50 quiz mỗi giáo viên, kể cả khi tạo song song", async () => {
    const user = await signUp("quiz-limit");
    const attempts = await Promise.all(
      Array.from({ length: 55 }, (_, i) => user.client.from("quizzes").insert({ title: `Quiz ${i}` })),
    );
    expect(attempts.filter((r) => !r.error)).toHaveLength(50);
    expect(attempts.filter((r) => r.error?.message.includes("quiz_limit_exceeded"))).toHaveLength(5);
  }, 60_000);

  it("tối đa 50 câu mỗi quiz, 6 lựa chọn mỗi câu", async () => {
    const quizId = await createQuiz(a.client, "Quiz đầy câu");
    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ quiz_id: quizId, kind: "single", prompt: `Câu ${i}`, position: i }));
    expect((await a.client.from("questions").insert(rows(50))).error).toBeNull();
    const over = await a.client.from("questions").insert({ quiz_id: quizId, kind: "single", prompt: "Câu 51" });
    expect(over.error?.message).toContain("question_limit_exceeded");
    const bulk = await a.client.from("questions").insert(rows(3).map((r) => ({ ...r, quiz_id: quizId })));
    expect(bulk.error?.message).toContain("question_limit_exceeded");

    const question = (await a.client.from("questions").select("id").eq("quiz_id", quizId).limit(1).single()).data as { id: string };
    const optionRows = (n: number) => Array.from({ length: n }, (_, i) => ({ question_id: question.id, label: `Lựa chọn ${i}`, position: i }));
    expect((await a.client.from("options").insert(optionRows(6))).error).toBeNull();
    expect((await a.client.from("options").insert({ question_id: question.id, label: "Thứ 7" })).error?.message).toContain("option_limit_exceeded");
  }, 60_000);
});

describe("1.2 quiz_problems", () => {
  for (const testCase of cases as { name: string; questions: QuestionInput[]; expect: [number, string][] }[]) {
    it(testCase.name, async () => {
      const quizId = await buildQuiz(a.client, `Ca: ${testCase.name}`.slice(0, 100), testCase.questions);
      const expected = [...testCase.expect].sort((x, y) => x[0] - y[0] || x[1].localeCompare(y[1]));
      expect(await problemsOf(a, quizId)).toEqual(expected);
    });
  }

  it("quiz không tồn tại hoặc của người khác báo không tìm thấy, không báo là hợp lệ", async () => {
    const quizId = await buildQuiz(a.client, "Quiz của A", [simpleQuestion()]);
    expect((await b.client.rpc("quiz_problems", { p_quiz_id: quizId })).error?.message).toContain("quiz_not_found");
    expect(
      (await a.client.rpc("quiz_problems", { p_quiz_id: "00000000-0000-4000-8000-000000000000" })).error?.message,
    ).toContain("quiz_not_found");
    expect((await anon.rpc("quiz_problems", { p_quiz_id: quizId })).error?.code).toBe("42501");
  });
});

describe("1.3 save_question, reorder_questions, delete_question", () => {
  it("tạo câu cùng lựa chọn theo đúng thứ tự, rồi sửa thì thay hết lựa chọn", async () => {
    const quizId = await createQuiz(a.client, "Quiz soạn");
    const created = await saveQuestion(a.client, quizId, {
      kind: "single",
      prompt: "Ban đầu",
      time_limit_seconds: 30,
      options: [{ label: "A", is_correct: true }, { label: "B" }, { label: "C" }],
    });
    expect(created.error).toBeNull();
    const questionId = created.data as string;

    let options: unknown = (await a.client.from("options").select("label, is_correct, position").eq("question_id", questionId).order("position")).data;
    expect(options).toEqual([
      { label: "A", is_correct: true, position: 0 },
      { label: "B", is_correct: false, position: 1 },
      { label: "C", is_correct: false, position: 2 },
    ]);

    const updated = await saveQuestion(a.client, quizId, {
      id: questionId,
      kind: "multi",
      prompt: "Sau khi sửa",
      options: [{ label: "X", is_correct: true }, { label: "Y", is_correct: true }],
    } as QuestionInput & { id: string });
    expect(updated.error).toBeNull();
    expect(updated.data).toBe(questionId);
    options = (await a.client.from("options").select("label, position").eq("question_id", questionId).order("position")).data;
    expect(options).toEqual([{ label: "X", position: 0 }, { label: "Y", position: 1 }]);
    const row = (await a.client.from("questions").select("kind, prompt, time_limit_seconds").eq("id", questionId).single()).data;
    expect(row).toEqual({ kind: "multi", prompt: "Sau khi sửa", time_limit_seconds: 20 });
  });

  it("câu điền từ lưu danh sách đáp án chấp nhận và bỏ qua lựa chọn gửi kèm", async () => {
    const quizId = await createQuiz(a.client, "Quiz điền từ");
    const { data, error } = await saveQuestion(a.client, quizId, {
      kind: "short_text",
      prompt: "Thủ đô?",
      accepted_answers: ["Hà Nội", "Hanoi"],
      ignore_diacritics: true,
      options: [{ label: "bị bỏ qua" }],
    });
    expect(error).toBeNull();
    const row = (await a.client.from("questions").select("accepted_answers, ignore_diacritics").eq("id", data as string).single()).data;
    expect(row).toEqual({ accepted_answers: ["Hà Nội", "Hanoi"], ignore_diacritics: true });
    expect((await a.client.from("options").select("id").eq("question_id", data as string)).data).toEqual([]);
  });

  it("lỗi ở lựa chọn thì không để lại câu nửa vời (nguyên tử)", async () => {
    const quizId = await createQuiz(a.client, "Quiz nguyên tử");
    const tooMany = await saveQuestion(a.client, quizId, {
      kind: "single",
      prompt: "Quá nhiều lựa chọn",
      options: Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, is_correct: i === 0 })),
    });
    expect(tooMany.error?.message).toContain("option_limit_exceeded");
    const tooLong = await saveQuestion(a.client, quizId, {
      kind: "single",
      prompt: "Lựa chọn quá dài",
      options: [{ label: "x".repeat(151), is_correct: true }, { label: "B" }],
    });
    expect(tooLong.error?.code).toBe("23514");
    expect((await a.client.from("questions").select("id").eq("quiz_id", quizId)).data).toEqual([]);

    // Sửa một câu có sẵn mà lỗi giữa chừng thì câu cũ còn nguyên.
    const ok = await saveQuestion(a.client, quizId, simpleQuestion("Còn nguyên"));
    const failed = await saveQuestion(a.client, quizId, {
      id: ok.data as string,
      kind: "single",
      prompt: "Không được đổi",
      options: Array.from({ length: 7 }, (_, i) => ({ label: `L${i}` })),
    } as QuestionInput & { id: string });
    expect(failed.error).not.toBeNull();
    const kept = (await a.client.from("questions").select("prompt").eq("id", ok.data as string).single()).data;
    expect(kept?.prompt).toBe("Còn nguyên");
    expect((await a.client.from("options").select("id").eq("question_id", ok.data as string)).data).toHaveLength(2);
  });

  it("B không lưu, đổi thứ tự hay xoá được câu của quiz A", async () => {
    const quizId = await buildQuiz(a.client, "Quiz của A", [simpleQuestion("Câu 1"), simpleQuestion("Câu 2")]);
    const ids = ((await a.client.from("questions").select("id").eq("quiz_id", quizId).order("position")).data as { id: string }[]).map((r) => r.id);

    expect((await saveQuestion(b.client, quizId, simpleQuestion("kẻ lạ"))).error?.message).toContain("quiz_not_found");
    expect((await b.client.rpc("reorder_questions", { p_quiz_id: quizId, p_ids: [...ids].reverse() })).error?.message).toContain("quiz_not_found");
    expect((await b.client.rpc("delete_question", { p_question_id: ids[0] })).error?.message).toContain("question_not_found");
    expect((await a.client.from("questions").select("id").eq("quiz_id", quizId)).data).toHaveLength(2);
    expect((await anon.rpc("save_question", { p_quiz_id: quizId, p_question: simpleQuestion() })).error?.code).toBe("42501");
  });

  it("đổi thứ tự không làm mất câu và từ chối danh sách không khớp", async () => {
    const quizId = await buildQuiz(a.client, "Quiz đổi thứ tự", [simpleQuestion("Một"), simpleQuestion("Hai"), simpleQuestion("Ba")]);
    const ordered = async () =>
      ((await a.client.from("questions").select("prompt, position").eq("quiz_id", quizId).order("position")).data as { prompt: string; position: number }[]);
    const ids = ((await a.client.from("questions").select("id, prompt").eq("quiz_id", quizId).order("position")).data as { id: string; prompt: string }[]);
    expect((await ordered()).map((r) => r.prompt)).toEqual(["Một", "Hai", "Ba"]);

    const reordered = await a.client.rpc("reorder_questions", { p_quiz_id: quizId, p_ids: [ids[2].id, ids[0].id, ids[1].id] });
    expect(reordered.error).toBeNull();
    expect(await ordered()).toEqual([
      { prompt: "Ba", position: 0 },
      { prompt: "Một", position: 1 },
      { prompt: "Hai", position: 2 },
    ]);

    for (const p_ids of [[ids[0].id, ids[1].id], [ids[0].id, ids[1].id, ids[2].id, ids[2].id], [ids[0].id, ids[1].id, "00000000-0000-4000-8000-000000000000"]]) {
      expect((await a.client.rpc("reorder_questions", { p_quiz_id: quizId, p_ids })).error?.message).toContain("reorder_mismatch");
    }
    expect((await ordered()).map((r) => r.prompt)).toEqual(["Ba", "Một", "Hai"]);
  });

  it("xoá câu thì các câu còn lại dồn vị trí liền nhau", async () => {
    const quizId = await buildQuiz(a.client, "Quiz xoá câu", [simpleQuestion("Một"), simpleQuestion("Hai"), simpleQuestion("Ba")]);
    const ids = ((await a.client.from("questions").select("id").eq("quiz_id", quizId).order("position")).data as { id: string }[]).map((r) => r.id);
    expect((await a.client.rpc("delete_question", { p_question_id: ids[1] })).error).toBeNull();
    const rest = (await a.client.from("questions").select("prompt, position").eq("quiz_id", quizId).order("position")).data;
    expect(rest).toEqual([{ prompt: "Một", position: 0 }, { prompt: "Ba", position: 1 }]);
    expect((await a.client.rpc("delete_question", { p_question_id: ids[1] })).error?.message).toContain("question_not_found");
  });
});

describe("1.4 chia sẻ, nhân bản và nhân đôi", () => {
  async function sharedQuiz() {
    const quizId = await buildQuiz(a.client, "Quiz chia sẻ", [
      { kind: "single", prompt: "1 + 1?", time_limit_seconds: 30, options: [{ label: "2", is_correct: true }, { label: "3" }] },
      { kind: "short_text", prompt: "Thủ đô?", accepted_answers: ["Hà Nội"], ignore_diacritics: true },
    ]);
    const { data, error } = await a.client.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: true });
    expect(error).toBeNull();
    return { quizId, token: data as string };
  }

  it("bật chia sẻ cấp mã ngẫu nhiên, chỉ chủ đổi được", async () => {
    const quizId = await buildQuiz(a.client, "Quiz bật chia sẻ", [simpleQuestion()]);
    const first = (await a.client.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: true })).data as string;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    const stored = (await a.client.from("quizzes").select("share_token").eq("id", quizId).single()).data;
    expect(stored?.share_token).toBe(first);

    expect((await b.client.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: true })).error?.message).toContain("quiz_not_found");
    expect((await anon.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: true })).error?.code).toBe("42501");
    expect((await a.client.from("quizzes").select("share_token").eq("id", quizId).single()).data?.share_token).toBe(first);
  });

  it("người đã đăng nhập xem được quiz kèm đáp án; khách và mã sai thì không", async () => {
    const { token } = await sharedQuiz();
    const { data, error } = await b.client.rpc("get_shared_quiz", { p_token: token });
    expect(error).toBeNull();
    const quiz = data as { title: string; questions: { prompt: string; kind: string; options: { label: string; is_correct: boolean }[]; accepted_answers: string[] }[] };
    expect(quiz.title).toBe("Quiz chia sẻ");
    expect(quiz.questions.map((q) => q.prompt)).toEqual(["1 + 1?", "Thủ đô?"]);
    expect(quiz.questions[0].options).toEqual([{ label: "2", is_correct: true }, { label: "3", is_correct: false }]);
    expect(quiz.questions[1].accepted_answers).toEqual(["Hà Nội"]);

    // Phải bị chặn ngay ở quyền EXECUTE (không chờ tới kiểm tra bên trong hàm).
    const guest = await anon.rpc("get_shared_quiz", { p_token: token });
    expect(guest.error?.code).toBe("42501");
    expect(guest.error?.message).toContain("permission denied");
    const guestClone = await anon.rpc("clone_shared_quiz", { p_token: token });
    expect(guestClone.error?.message).toContain("permission denied");
    expect((await b.client.rpc("get_shared_quiz", { p_token: "00000000-0000-4000-8000-000000000000" })).error?.message).toContain("shared_quiz_not_found");
  });

  it("tắt chia sẻ hoặc bật lại (đổi mã) thì mã cũ hết hiệu lực", async () => {
    const { quizId, token } = await sharedQuiz();
    const renewed = (await a.client.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: true })).data as string;
    expect(renewed).not.toBe(token);
    expect((await b.client.rpc("get_shared_quiz", { p_token: token })).error?.message).toContain("shared_quiz_not_found");
    expect((await b.client.rpc("get_shared_quiz", { p_token: renewed })).error).toBeNull();

    const off = await a.client.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: false });
    expect(off.error).toBeNull();
    expect(off.data).toBeNull();
    expect((await b.client.rpc("get_shared_quiz", { p_token: renewed })).error?.message).toContain("shared_quiz_not_found");
    expect((await b.client.rpc("clone_shared_quiz", { p_token: renewed })).error?.message).toContain("shared_quiz_not_found");
  });

  it("nhân bản về tài khoản người nhận, độc lập với bản gốc", async () => {
    const { quizId, token } = await sharedQuiz();
    const cloned = await b.client.rpc("clone_shared_quiz", { p_token: token });
    expect(cloned.error).toBeNull();
    const cloneId = cloned.data as string;

    const copy = (await b.client.from("quizzes").select("owner_id, title, share_token").eq("id", cloneId).single()).data;
    expect(copy).toEqual({ owner_id: b.id, title: "Quiz chia sẻ (bản sao)", share_token: null });
    const questions = (await b.client.from("questions").select("prompt, kind, time_limit_seconds, accepted_answers, ignore_diacritics, position").eq("quiz_id", cloneId).order("position")).data;
    expect(questions).toEqual([
      { prompt: "1 + 1?", kind: "single", time_limit_seconds: 30, accepted_answers: [], ignore_diacritics: false, position: 0 },
      { prompt: "Thủ đô?", kind: "short_text", time_limit_seconds: 20, accepted_answers: ["Hà Nội"], ignore_diacritics: true, position: 1 },
    ]);
    expect(await problemsOf(b, cloneId)).toEqual([]);

    // Sửa bản gốc không đổi bản sao; A không thấy bản sao của B.
    const firstId = (await a.client.from("questions").select("id").eq("quiz_id", quizId).eq("position", 0).single()).data as { id: string };
    await saveQuestion(a.client, quizId, { id: firstId.id, kind: "single", prompt: "Đã sửa", options: [{ label: "x", is_correct: true }, { label: "y" }] } as QuestionInput & { id: string });
    const stillOld = (await b.client.from("questions").select("prompt").eq("quiz_id", cloneId).eq("position", 0).single()).data;
    expect(stillOld?.prompt).toBe("1 + 1?");
    expect((await a.client.from("quizzes").select("id").eq("id", cloneId)).data).toEqual([]);
  });

  it("nhân bản vẫn bị giới hạn 50 quiz và không lộ quiz khác của người chia sẻ", async () => {
    const { token } = await sharedQuiz();
    const full = await signUp("quiz-clone-full");
    const inserts = await Promise.all(Array.from({ length: 50 }, (_, i) => full.client.from("quizzes").insert({ title: `Có sẵn ${i}` })));
    expect(inserts.every((r) => !r.error)).toBe(true);
    expect((await full.client.rpc("clone_shared_quiz", { p_token: token })).error?.message).toContain("quiz_limit_exceeded");
    expect((await full.client.from("quizzes").select("id", { count: "exact", head: true })).count).toBe(50);
  }, 60_000);

  it("nhân đôi quiz của mình; người khác và khách không nhân đôi được", async () => {
    const quizId = await buildQuiz(a.client, "Quiz gốc", [simpleQuestion("Một"), simpleQuestion("Hai")]);
    const duplicated = await a.client.rpc("duplicate_quiz", { p_quiz_id: quizId });
    expect(duplicated.error).toBeNull();
    const copy = (await a.client.from("quizzes").select("owner_id, title").eq("id", duplicated.data as string).single()).data;
    expect(copy).toEqual({ owner_id: a.id, title: "Quiz gốc (bản sao)" });
    expect((await a.client.from("questions").select("id").eq("quiz_id", duplicated.data as string)).data).toHaveLength(2);

    expect((await b.client.rpc("duplicate_quiz", { p_quiz_id: quizId })).error?.message).toContain("quiz_not_found");
    expect((await anon.rpc("duplicate_quiz", { p_quiz_id: quizId })).error?.code).toBe("42501");
  });

  it("tên bản sao không vượt 100 ký tự và nhân đôi quiz lớn (50 câu, 6 lựa chọn) đủ nhanh", async () => {
    const longTitle = "T".repeat(100);
    const quizId = await createQuiz(a.client, longTitle);
    const questionRows = Array.from({ length: 50 }, (_, i) => ({ quiz_id: quizId, kind: "multi", prompt: `Câu ${i}`, position: i }));
    const inserted = (await a.client.from("questions").insert(questionRows).select("id")).data as { id: string }[];
    const optionRows = inserted.flatMap((q) => Array.from({ length: 6 }, (_, i) => ({ question_id: q.id, label: `Lựa chọn ${i}`, position: i, is_correct: i < 2 })));
    expect((await a.client.from("options").insert(optionRows)).error).toBeNull();

    const started = Date.now();
    const duplicated = await a.client.rpc("duplicate_quiz", { p_quiz_id: quizId });
    const elapsed = Date.now() - started;
    expect(duplicated.error).toBeNull();
    expect(elapsed).toBeLessThan(3000);
    const copy = (await a.client.from("quizzes").select("title").eq("id", duplicated.data as string).single()).data;
    expect((copy?.title as string).length).toBeLessThanOrEqual(100);
    expect(copy?.title).toMatch(/\(bản sao\)$/);
    expect((await a.client.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", duplicated.data as string)).count).toBe(50);
  }, 60_000);
});
