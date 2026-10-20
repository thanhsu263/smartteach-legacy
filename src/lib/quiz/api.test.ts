import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { importQuiz, toQuestion, validateTitle } from "@/lib/quiz/api";
import { MAX_TITLE_LENGTH } from "@/lib/quiz/limits";

describe("validateTitle", () => {
  it("chấp nhận tên hợp lệ và tính độ dài sau khi cắt khoảng trắng", () => {
    expect(validateTitle("Ôn tập chương 1")).toBeNull();
    expect(validateTitle(`  ${"x".repeat(MAX_TITLE_LENGTH)}  `)).toBeNull();
  });

  it("từ chối tên rỗng hoặc quá dài", () => {
    expect(validateTitle("   ")).toContain("nhập tên");
    expect(validateTitle("x".repeat(MAX_TITLE_LENGTH + 1))).toContain(String(MAX_TITLE_LENGTH));
  });
});

describe("toQuestion", () => {
  it("sắp lựa chọn theo vị trí và bỏ trường vị trí", () => {
    const question = toQuestion({
      id: "q1",
      position: 2,
      kind: "single",
      prompt: "1 + 1?",
      time_limit_seconds: 30,
      accepted_answers: null,
      ignore_diacritics: false,
      options: [
        { label: "C", is_correct: false, position: 2 },
        { label: "A", is_correct: true, position: 0 },
        { label: "B", is_correct: false, position: 1 },
      ],
    });
    expect(question.options).toEqual([
      { label: "A", is_correct: true },
      { label: "B", is_correct: false },
      { label: "C", is_correct: false },
    ]);
    expect(question.accepted_answers).toEqual([]);
    expect(question.time_limit_seconds).toBe(30);
    expect(question.position).toBe(2);
  });

  it("dạng không nhận ra rơi về trắc nghiệm một đáp án thay vì làm hỏng giao diện", () => {
    expect(toQuestion({ id: "q", position: 0, kind: "essay", prompt: "x", time_limit_seconds: 20, accepted_answers: [], ignore_diacritics: false }).kind).toBe("single");
  });
});

describe("importQuiz", () => {
  const question = {
    kind: "single" as const,
    prompt: "1 + 1?",
    time_limit_seconds: 20 as const,
    accepted_answers: [],
    ignore_diacritics: false,
    options: [{ label: "2", is_correct: true }, { label: "3", is_correct: false }],
  };
  const client = (rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>) =>
    ({ rpc: vi.fn(rpc) }) as unknown as SupabaseClient;

  it("gọi import_quiz với tên đã cắt khoảng trắng và bộ câu hỏi, trả id quiz mới", async () => {
    const supabase = client(async () => ({ data: "11111111-1111-4111-8111-111111111111", error: null }));
    expect(await importQuiz(supabase, "  Quiz nhập  ", [question])).toEqual({ ok: true, id: "11111111-1111-4111-8111-111111111111" });
    expect(supabase.rpc).toHaveBeenCalledWith("import_quiz", { p_title: "Quiz nhập", p_questions: [question] });
  });

  it("tên sai hoặc không có câu nào thì không gọi máy chủ", async () => {
    const supabase = client(async () => ({ data: null, error: null }));
    expect(await importQuiz(supabase, "   ", [question])).toMatchObject({ ok: false });
    expect(await importQuiz(supabase, "Quiz", [])).toMatchObject({ ok: false, message: expect.stringContaining("Chưa có câu hỏi nào") });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("lỗi từ máy chủ thành lời nhắn tiếng Việt (giới hạn quiz, giới hạn câu), không lộ thông báo kỹ thuật", async () => {
    const quizCap = client(async () => ({ data: null, error: { message: "quiz_limit_exceeded", code: "23514" } }));
    const result = await importQuiz(quizCap, "Quiz", [question]);
    expect(result.ok === false && result.message).toContain("50 quiz");
    const technical = client(async () => ({ data: null, error: { message: 'insert or update on table "x" violates', code: "XX000" } }));
    const generic = await importQuiz(technical, "Quiz", [question]);
    expect(generic.ok === false && generic.message).not.toContain("violates");
  });
});
