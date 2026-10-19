import { describe, expect, it } from "vitest";
import cases from "../../../tests/fixtures/quiz-validation-cases.json";
import {
  MAX_ANSWER_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_PROMPT_LENGTH,
} from "@/lib/quiz/limits";
import { checkDraft, newDraft, questionProblems, quizProblems, toPayload } from "@/lib/quiz/validate";
import type { QuestionInput } from "@/lib/quiz/types";

type Case = {
  name: string;
  questions: { kind: QuestionInput["kind"]; prompt: string; accepted_answers?: string[]; options?: { label: string; is_correct?: boolean }[] }[];
  expect: [number, string][];
};

describe("quizProblems khớp hàm SQL quiz_problems (cùng bảng ca)", () => {
  for (const testCase of cases as Case[]) {
    it(testCase.name, () => {
      const result = quizProblems(
        testCase.questions.map((question) => ({
          kind: question.kind,
          accepted_answers: question.accepted_answers ?? [],
          options: question.options,
        })),
      );
      const expected = testCase.expect
        .map(([position, code]) => ({ position, code }))
        .sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
      expect(result).toEqual(expected);
    });
  }
});

describe("checkDraft", () => {
  const valid = (): QuestionInput => ({
    kind: "single",
    prompt: "1 + 1?",
    time_limit_seconds: 20,
    accepted_answers: [],
    ignore_diacritics: false,
    options: [
      { label: "1", is_correct: false },
      { label: "2", is_correct: true },
    ],
  });

  it("bản nháp hợp lệ không có lỗi chặn lưu và không có cảnh báo", () => {
    const issues = checkDraft(valid());
    expect(issues.blocking).toBe(false);
    expect(issues.warnings).toEqual([]);
  });

  it("câu hỏi trống hoặc quá dài chặn lưu", () => {
    expect(checkDraft({ ...valid(), prompt: "   " }).prompt).toContain("Nhập nội dung");
    const long = checkDraft({ ...valid(), prompt: "p".repeat(MAX_PROMPT_LENGTH + 1) });
    expect(long.prompt).toContain(String(MAX_PROMPT_LENGTH));
    expect(long.blocking).toBe(true);
    expect(checkDraft({ ...valid(), prompt: "p".repeat(MAX_PROMPT_LENGTH) }).blocking).toBe(false);
  });

  it("lựa chọn trống hoặc quá dài chặn lưu, chỉ rõ lựa chọn nào", () => {
    const draft = valid();
    draft.options = [
      { label: "", is_correct: true },
      { label: "x".repeat(MAX_OPTION_LENGTH + 1), is_correct: false },
      { label: "tốt", is_correct: false },
    ];
    const issues = checkDraft(draft);
    expect(issues.options).toEqual(["Nhập nội dung lựa chọn.", `Tối đa ${MAX_OPTION_LENGTH} ký tự.`, undefined]);
    expect(issues.blocking).toBe(true);
  });

  it("quá nhiều lựa chọn chặn lưu", () => {
    const draft = valid();
    draft.options = Array.from({ length: MAX_OPTIONS_PER_QUESTION + 1 }, (_, i) => ({ label: `L${i}`, is_correct: i === 0 }));
    const issues = checkDraft(draft);
    expect(issues.general).toContain(String(MAX_OPTIONS_PER_QUESTION));
    expect(issues.blocking).toBe(true);
  });

  it("chưa chọn đáp án đúng chỉ là cảnh báo, không chặn lưu", () => {
    const draft = valid();
    draft.options = [{ label: "1" }, { label: "2" }].map((o) => ({ ...o, is_correct: false }));
    const issues = checkDraft(draft);
    expect(issues.blocking).toBe(false);
    expect(issues.warnings).toEqual(["correct_count"]);
  });

  it("điền từ: dòng đáp án trống hoặc quá dài chặn lưu; chưa có đáp án chỉ là cảnh báo", () => {
    const base = newDraft("short_text");
    base.prompt = "Thủ đô?";
    const empty = checkDraft({ ...base, accepted_answers: [""] });
    expect(empty.answers).toEqual(["Nhập đáp án hoặc xoá dòng này."]);
    expect(empty.blocking).toBe(true);
    expect(empty.warnings).toEqual(["no_answers"]);

    const long = checkDraft({ ...base, accepted_answers: ["a".repeat(MAX_ANSWER_LENGTH + 1)] });
    expect(long.answers[0]).toContain(String(MAX_ANSWER_LENGTH));

    const tooMany = checkDraft({ ...base, accepted_answers: Array.from({ length: 11 }, (_, i) => `đ${i}`) });
    expect(tooMany.general).toContain("10");
    expect(checkDraft({ ...base, accepted_answers: ["Hà Nội"] }).blocking).toBe(false);
  });
});

describe("newDraft", () => {
  it("mỗi dạng có dàn ý ban đầu đúng", () => {
    expect(newDraft("single").options).toHaveLength(4);
    expect(newDraft("multi").options).toHaveLength(4);
    expect(newDraft("true_false").options.map((o) => o.label)).toEqual(["Đúng", "Sai"]);
    expect(newDraft("short_text").accepted_answers).toEqual([""]);
    expect(newDraft("short_text").options).toEqual([]);
    expect(newDraft("single").time_limit_seconds).toBe(20);
  });

  it("bản nháp mới có cảnh báo cho tới khi giáo viên điền đủ", () => {
    expect(questionProblems(newDraft("single"))).toContain("correct_count");
    expect(checkDraft(newDraft("single")).blocking).toBe(true);
  });
});

describe("toPayload", () => {
  it("cắt khoảng trắng và bỏ dòng đáp án trống", () => {
    const draft = newDraft("short_text");
    draft.prompt = "  Thủ đô?  ";
    draft.accepted_answers = ["  Hà Nội ", "", "Hanoi"];
    draft.ignore_diacritics = true;
    expect(toPayload(draft)).toEqual({
      kind: "short_text",
      prompt: "Thủ đô?",
      time_limit_seconds: 20,
      accepted_answers: ["Hà Nội", "Hanoi"],
      ignore_diacritics: true,
      options: [],
    });
  });

  it("đúng/sai luôn gửi hai nhãn cố định và giữ lựa chọn đúng", () => {
    const draft = newDraft("true_false");
    draft.prompt = "Trái đất tròn.";
    draft.options = [{ label: "tuỳ ý", is_correct: false }, { label: "khác", is_correct: true }];
    expect(toPayload(draft).options).toEqual([
      { label: "Đúng", is_correct: false },
      { label: "Sai", is_correct: true },
    ]);
  });

  it("câu không phải điền từ không gửi đáp án chấp nhận hay cờ bỏ dấu; giữ id khi sửa", () => {
    const draft = { ...newDraft("single"), id: "abc", prompt: "q", ignore_diacritics: true, accepted_answers: ["x"] };
    draft.options = [{ label: " A ", is_correct: true }, { label: "B", is_correct: false }];
    const payload = toPayload(draft);
    expect(payload.id).toBe("abc");
    expect(payload.accepted_answers).toEqual([]);
    expect(payload.ignore_diacritics).toBe(false);
    expect(payload.options[0].label).toBe("A");
  });
});
