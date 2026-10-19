import { describe, expect, it } from "vitest";
import { toQuestion, validateTitle } from "@/lib/quiz/api";
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
