import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeProblem, describeQuizError } from "@/lib/quiz/errors";
import {
  MAX_ACCEPTED_ANSWERS,
  MAX_ANSWER_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_PROMPT_LENGTH,
  MAX_QUESTIONS_PER_QUIZ,
  MAX_QUIZZES,
  MAX_TITLE_LENGTH,
  TIME_LIMITS,
} from "@/lib/quiz/limits";
import type { ProblemCode } from "@/lib/quiz/types";

describe("describeQuizError", () => {
  it("báo từng giới hạn bằng đúng con số", () => {
    expect(describeQuizError({ message: "quiz_limit_exceeded", code: "23514" })).toContain(String(MAX_QUIZZES));
    expect(describeQuizError({ message: "question_limit_exceeded", code: "23514" })).toContain(String(MAX_QUESTIONS_PER_QUIZ));
    expect(describeQuizError({ message: "option_limit_exceeded", code: "23514" })).toContain(String(MAX_OPTIONS_PER_QUESTION));
  });

  it("phân biệt không tìm thấy quiz, link chia sẻ và danh sách đã đổi", () => {
    expect(describeQuizError({ message: "shared_quiz_not_found", code: "P0002" })).toContain("Link");
    expect(describeQuizError({ message: "quiz_not_found", code: "P0002" })).toContain("đã bị xoá");
    expect(describeQuizError({ message: "question_not_found", code: "P0002" })).toContain("đã bị xoá");
    expect(describeQuizError({ message: "reorder_mismatch", code: "23514" })).toContain("tải lại");
  });

  it("lỗi ràng buộc chung nêu các độ dài tối đa", () => {
    const text = describeQuizError({ code: "23514", message: 'violates check constraint "quizzes_title_length"' });
    for (const n of [MAX_TITLE_LENGTH, MAX_PROMPT_LENGTH, MAX_OPTION_LENGTH, MAX_ANSWER_LENGTH, MAX_ACCEPTED_ANSWERS]) {
      expect(text).toContain(String(n));
    }
  });

  it("nhận ra phiên hết hạn và mất mạng", () => {
    expect(describeQuizError({ code: "42501" })).toContain("đăng nhập lại");
    expect(describeQuizError({ message: "TypeError: Failed to fetch" })).toContain("kiểm tra mạng");
  });

  it("không lộ thông báo kỹ thuật", () => {
    expect(describeQuizError({ code: "XX000", message: 'relation "quizzes" does not exist' })).toBe(
      "Có lỗi xảy ra. Thầy cô thử lại nhé.",
    );
    expect(describeQuizError(undefined)).toBe("Có lỗi xảy ra. Thầy cô thử lại nhé.");
  });
});

describe("describeProblem", () => {
  const codes: ProblemCode[] = [
    "no_questions",
    "too_few_options",
    "correct_count",
    "no_correct",
    "bad_true_false",
    "no_answers",
    "duplicate_options",
  ];

  it("có lời nhắn riêng cho mọi mã lỗi và gắn số câu khi có", () => {
    for (const code of codes) {
      const onQuestion = describeProblem(code, 3);
      if (code === "no_questions") continue;
      expect(onQuestion, code).toMatch(/^Câu 3: /);
      expect(onQuestion.length, code).toBeGreaterThan(10);
    }
    expect(describeProblem("no_questions", 0)).toBe("Quiz chưa có câu hỏi nào.");
  });
});

describe("hằng số khớp migration", () => {
  const migration = readFileSync(join(process.cwd(), "supabase/migrations/20261021090000_quizzes.sql"), "utf8");

  it("giới hạn số lượng", () => {
    expect(migration).toContain(`>= ${MAX_QUIZZES} then`);
    expect(migration).toContain(`>= ${MAX_QUESTIONS_PER_QUIZ} then`);
    expect(migration).toContain(`>= ${MAX_OPTIONS_PER_QUESTION} then`);
    expect(migration).toContain(`cardinality(answers) <= ${MAX_ACCEPTED_ANSWERS}`);
  });

  it("độ dài chữ và thời gian trả lời", () => {
    expect(migration).toContain(`between 1 and ${MAX_TITLE_LENGTH}`);
    expect(migration).toContain(`between 1 and ${MAX_PROMPT_LENGTH}`);
    expect(migration).toContain(`between 1 and ${MAX_OPTION_LENGTH}`);
    expect(migration).toContain(`not between 1 and ${MAX_ANSWER_LENGTH}`);
    expect(migration).toContain(`time_limit_seconds in (${TIME_LIMITS.join(", ")})`);
  });
});
