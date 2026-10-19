import { describe, expect, it } from "vitest";
import { MAX_OPTIONS_PER_QUESTION } from "@/lib/quiz/limits";
import { ANSWER_STYLES, answerStyle } from "./answer-styles";

describe("ô đáp án A-F", () => {
  it("đủ cho số lựa chọn tối đa của một câu", () => {
    expect(ANSWER_STYLES.length).toBeGreaterThanOrEqual(MAX_OPTIONS_PER_QUESTION);
  });

  it("mỗi lựa chọn có chữ cái, hình và màu khác nhau (không phân biệt chỉ bằng màu)", () => {
    for (const key of ["letter", "shape", "shapeName", "colorVar"] as const) {
      expect(new Set(ANSWER_STYLES.map((style) => style[key])).size, key).toBe(ANSWER_STYLES.length);
    }
    expect(ANSWER_STYLES.map((s) => s.letter).join("")).toBe("ABCDEF");
  });

  it("không dùng bộ hình của Kahoot (tam giác, thoi, tròn, vuông)", () => {
    const kahoot = new Set(["triangle", "diamond", "circle", "square"]);
    for (const style of ANSWER_STYLES) expect(kahoot.has(style.shape), style.shape).toBe(false);
  });

  it("answerStyle quay vòng và chịu chỉ số âm", () => {
    expect(answerStyle(0).letter).toBe("A");
    expect(answerStyle(5).letter).toBe("F");
    expect(answerStyle(6).letter).toBe("A");
    expect(answerStyle(-1).letter).toBe("F");
  });
});
