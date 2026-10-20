import { afterAll, describe, expect, it } from "vitest";
import { anon, cleanupUsers, signUp, type QuestionInput } from "./helpers";
import { psql, rpcStatus } from "./live-helpers";

/**
 * Hàm `import_quiz` (phase 6 của giai đoạn 2.5): tạo quiz cùng mọi câu trong một giao dịch. Cần `npm run supabase:start`.
 * Đọc tệp diễn ra ở trình duyệt; ở đây chỉ kiểm phần máy chủ: nguyên tử, giới hạn, quyền.
 */

afterAll(async () => {
  await cleanupUsers();
});

const single = (prompt: string): QuestionInput => ({
  kind: "single",
  prompt,
  time_limit_seconds: 20,
  accepted_answers: [],
  ignore_diacritics: false,
  options: [{ label: "A", is_correct: true }, { label: "B" }],
});

const fourKinds: QuestionInput[] = [
  { ...single("Một đáp án"), options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế" }, { label: "Đà Nẵng" }] },
  { kind: "true_false", prompt: "Đúng hay sai?", time_limit_seconds: 10, accepted_answers: [], ignore_diacritics: false, options: [{ label: "Đúng" }, { label: "Sai", is_correct: true }] },
  { kind: "multi", prompt: "Số chẵn?", time_limit_seconds: 30, accepted_answers: [], ignore_diacritics: false, options: [{ label: "2", is_correct: true }, { label: "3" }, { label: "4", is_correct: true }] },
  { kind: "short_text", prompt: "Con vật kêu meo?", time_limit_seconds: 20, accepted_answers: ["con mèo", "mèo"], ignore_diacritics: true, options: [] },
];

describe("import_quiz", () => {
  it("tạo quiz đủ câu theo thứ tự, đủ bốn dạng, và chơi được ngay (không có lỗi chặn)", async () => {
    const t = await signUp("imp-ok");
    const created = await t.client.rpc("import_quiz", { p_title: "  Quiz nhập từ tệp  ", p_questions: fourKinds });
    expect(created.error).toBeNull();
    const quizId = created.data as string;

    const quiz = await t.client.from("quizzes").select("title, questions(position, kind, prompt, time_limit_seconds, accepted_answers, ignore_diacritics, options(position, label, is_correct))").eq("id", quizId).single();
    expect(quiz.error).toBeNull();
    const data = quiz.data as unknown as {
      title: string;
      questions: { position: number; kind: string; prompt: string; time_limit_seconds: number; accepted_answers: string[]; ignore_diacritics: boolean; options: { position: number; label: string; is_correct: boolean }[] }[];
    };
    expect(data.title).toBe("Quiz nhập từ tệp"); // đã cắt khoảng trắng
    const questions = [...data.questions].sort((a, b) => a.position - b.position);
    expect(questions.map((q) => [q.position, q.kind, q.prompt])).toEqual([
      [0, "single", "Một đáp án"],
      [1, "true_false", "Đúng hay sai?"],
      [2, "multi", "Số chẵn?"],
      [3, "short_text", "Con vật kêu meo?"],
    ]);
    expect(questions[2].options.sort((a, b) => a.position - b.position).map((o) => [o.label, o.is_correct])).toEqual([["2", true], ["3", false], ["4", true]]);
    expect(questions[3]).toMatchObject({ accepted_answers: ["con mèo", "mèo"], ignore_diacritics: true, time_limit_seconds: 20 });
    expect(questions[1].time_limit_seconds).toBe(10);

    const problems = await t.client.rpc("quiz_problems", { p_quiz_id: quizId });
    expect(problems.data).toEqual([]);
  }, 60_000);

  it("một câu sai ở giữa thì KHÔNG quiz nào được tạo (không để lại quiz dở)", async () => {
    const t = await signUp("imp-atomic");
    const before = await t.client.from("quizzes").select("id");
    const bad = { ...single("Câu thứ ba quá dài"), prompt: "x".repeat(501) };
    const result = await t.client.rpc("import_quiz", { p_title: "Quiz hỏng giữa chừng", p_questions: [single("Câu 1"), single("Câu 2"), bad, single("Câu 4")] });
    expect(result.error).not.toBeNull();
    const after = await t.client.from("quizzes").select("id, title");
    expect(after.data).toEqual(before.data);
    expect(after.data!.some((q: { title: string }) => q.title === "Quiz hỏng giữa chừng")).toBe(false);
  }, 60_000);

  it("phần tử không phải câu hỏi hợp lệ cũng huỷ cả lời gọi", async () => {
    const t = await signUp("imp-shape");
    const result = await t.client.rpc("import_quiz", { p_title: "Hình dạng sai", p_questions: [single("Câu 1"), 42, "chuỗi"] });
    expect(result.error).not.toBeNull();
    expect(((await t.client.from("quizzes").select("id")).data ?? []).length).toBe(0);
  }, 60_000);

  it("rỗng hoặc không phải mảng bị từ chối (HTTP 400); quá 50 câu bị từ chối với lời nhắn giới hạn câu", async () => {
    const t = await signUp("imp-limits");
    for (const questions of [[], {}, "x", null]) {
      const res = await rpcStatus("import_quiz", { p_title: "Rỗng", p_questions: questions }, t);
      expect(res.status, JSON.stringify(questions)).toBe(400);
      expect(res.message).toContain("empty_import");
    }
    const many = Array.from({ length: 51 }, (_, i) => single(`Câu ${i + 1}`));
    const over = await t.client.rpc("import_quiz", { p_title: "Quá 50 câu", p_questions: many });
    expect(over.error?.message).toContain("question_limit_exceeded");
    // Đúng 50 câu thì được.
    const exactly = await t.client.rpc("import_quiz", { p_title: "Đúng 50 câu", p_questions: many.slice(0, 50) });
    expect(exactly.error).toBeNull();
    const count = await t.client.from("questions").select("id", { count: "exact", head: true }).eq("quiz_id", exactly.data as string);
    expect(count.count).toBe(50);
    expect(((await t.client.from("quizzes").select("id")).data ?? []).length).toBe(1); // chỉ quiz 50 câu
  }, 120_000);

  it("tên quiz sai (rỗng, quá 100 ký tự) bị từ chối và không tạo gì", async () => {
    const t = await signUp("imp-title");
    for (const title of ["", "   ", "t".repeat(101)]) {
      const result = await t.client.rpc("import_quiz", { p_title: title, p_questions: [single("Câu 1")] });
      expect(result.error, JSON.stringify(title)).not.toBeNull();
    }
    expect(((await t.client.from("quizzes").select("id")).data ?? []).length).toBe(0);
  }, 60_000);

  it("đạt giới hạn 50 quiz thì từ chối và không tạo quiz thứ 51", async () => {
    const t = await signUp("imp-quizcap");
    for (let i = 0; i < 50; i += 1) {
      const ok = await t.client.rpc("import_quiz", { p_title: `Quiz ${i + 1}`, p_questions: [single("Câu 1")] });
      expect(ok.error, `quiz ${i + 1}`).toBeNull();
    }
    const over = await t.client.rpc("import_quiz", { p_title: "Quiz thứ 51", p_questions: [single("Câu 1")] });
    expect(over.error?.message).toContain("quiz_limit_exceeded");
    expect(((await t.client.from("quizzes").select("id")).data ?? []).length).toBe(50);
  }, 240_000);

  it("chạy dưới quyền người gọi (security invoker) nên luôn bị RLS và trigger giới hạn của chính họ ràng buộc", () => {
    expect(psql("select prosecdef from pg_proc where proname = 'import_quiz' and pronamespace = 'public'::regnamespace;")).toBe("f");
    // Không ai ngoài người đăng nhập có quyền gọi.
    expect(psql("select has_function_privilege('anon', 'public.import_quiz(text, jsonb)', 'execute');")).toBe("f");
    expect(psql("select has_function_privilege('authenticated', 'public.import_quiz(text, jsonb)', 'execute');")).toBe("t");
  });

  it("khách không gọi được; quiz nhập là của đúng người gọi và giáo viên khác không thấy", async () => {
    const owner = await signUp("imp-owner");
    const other = await signUp("imp-other");
    const guest = await anon.rpc("import_quiz", { p_title: "Của khách", p_questions: [single("Câu 1")] });
    expect(guest.error).not.toBeNull();

    const created = await owner.client.rpc("import_quiz", { p_title: "Của chủ", p_questions: [single("Câu 1")] });
    const quizId = created.data as string;
    expect((await other.client.from("quizzes").select("id").eq("id", quizId)).data).toEqual([]);
    expect((await other.client.from("questions").select("id").eq("quiz_id", quizId)).data).toEqual([]);
    expect((await owner.client.from("quizzes").select("owner_id").eq("id", quizId).single()).data).toEqual({ owner_id: owner.id });
    // Người khác không thêm được câu vào quiz của chủ thông qua import (import luôn tạo quiz mới).
    const second = await other.client.rpc("import_quiz", { p_title: "Của người khác", p_questions: [single("Câu X")] });
    expect(second.error).toBeNull();
    expect(second.data).not.toBe(quizId);
  }, 120_000);
});
