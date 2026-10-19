import {
  DEFAULT_TIME_LIMIT,
  MAX_ACCEPTED_ANSWERS,
  MAX_ANSWER_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_PROMPT_LENGTH,
  MIN_OPTIONS_PER_QUESTION,
} from "@/lib/quiz/limits";
import {
  FALSE_LABEL,
  TRUE_LABEL,
  type ProblemCode,
  type QuestionInput,
  type QuestionKind,
  type QuizProblem,
} from "@/lib/quiz/types";

/** Phần của câu hỏi mà các quy tắc về tính hợp lệ cần xem. */
export type ProblemSubject = Pick<QuestionInput, "kind" | "accepted_answers"> & {
  options?: { label: string; is_correct?: boolean }[];
};

/**
 * Lỗi chặn việc chơi của một câu. PHẢI giữ cùng quy tắc với hàm SQL `quiz_problems`
 * (supabase/migrations/20261021090000_quizzes.sql); cả hai cùng chạy bảng ca ở
 * tests/fixtures/quiz-validation-cases.json.
 */
export function questionProblems(question: ProblemSubject): ProblemCode[] {
  const options = question.options ?? [];
  const total = options.length;
  const correct = options.filter((option) => option.is_correct).length;
  const distinct = new Set(options.map((option) => option.label.trim().toLowerCase())).size;
  const problems: ProblemCode[] = [];

  switch (question.kind) {
    case "single":
      if (total < MIN_OPTIONS_PER_QUESTION) problems.push("too_few_options");
      if (correct !== 1) problems.push("correct_count");
      if (total !== distinct) problems.push("duplicate_options");
      break;
    case "multi":
      if (total < MIN_OPTIONS_PER_QUESTION) problems.push("too_few_options");
      if (correct === 0) problems.push("no_correct");
      if (total !== distinct) problems.push("duplicate_options");
      break;
    case "true_false": {
      const hasTrue = options.some((option) => option.label === TRUE_LABEL);
      const hasFalse = options.some((option) => option.label === FALSE_LABEL);
      if (!(total === 2 && correct === 1 && hasTrue && hasFalse)) problems.push("bad_true_false");
      break;
    }
    case "short_text":
      if (question.accepted_answers.length === 0) problems.push("no_answers");
      break;
  }
  return problems;
}

/** Lỗi của cả quiz theo thứ tự câu (số thứ tự từ 1; 0 là lỗi của cả quiz). */
export function quizProblems(questions: readonly ProblemSubject[]): QuizProblem[] {
  if (questions.length === 0) return [{ position: 0, code: "no_questions" }];
  const result: QuizProblem[] = [];
  questions.forEach((question, index) => {
    for (const code of questionProblems(question)) result.push({ position: index + 1, code });
  });
  return result.sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
}

export type DraftIssues = {
  prompt?: string;
  /** Lỗi từng lựa chọn (chặn lưu); cùng độ dài với `options`. */
  options: (string | undefined)[];
  /** Lỗi từng đáp án chấp nhận (chặn lưu); cùng độ dài với `accepted_answers`. */
  answers: (string | undefined)[];
  /** Lỗi chặn lưu không thuộc trường nào (ví dụ quá nhiều lựa chọn). */
  general?: string;
  /** Chưa chặn lưu nhưng quiz chưa chơi được cho tới khi sửa. */
  warnings: ProblemCode[];
  /** True nếu có lỗi chặn lưu. */
  blocking: boolean;
};

/** Kiểm tra bản nháp ngay khi gõ; chỉ những lỗi mà cơ sở dữ liệu sẽ từ chối mới chặn việc lưu. */
export function checkDraft(draft: QuestionInput): DraftIssues {
  const issues: DraftIssues = {
    options: draft.options.map(() => undefined),
    answers: draft.accepted_answers.map(() => undefined),
    warnings: [],
    blocking: false,
  };

  const prompt = draft.prompt.trim();
  if (prompt === "") issues.prompt = "Nhập nội dung câu hỏi.";
  else if (prompt.length > MAX_PROMPT_LENGTH) issues.prompt = `Tối đa ${MAX_PROMPT_LENGTH} ký tự.`;

  if (draft.kind !== "short_text") {
    if (draft.options.length > MAX_OPTIONS_PER_QUESTION) {
      issues.general = `Tối đa ${MAX_OPTIONS_PER_QUESTION} lựa chọn.`;
    }
    draft.options.forEach((option, index) => {
      const label = option.label.trim();
      if (label === "") issues.options[index] = "Nhập nội dung lựa chọn.";
      else if (label.length > MAX_OPTION_LENGTH) issues.options[index] = `Tối đa ${MAX_OPTION_LENGTH} ký tự.`;
    });
  } else {
    if (draft.accepted_answers.length > MAX_ACCEPTED_ANSWERS) {
      issues.general = `Tối đa ${MAX_ACCEPTED_ANSWERS} đáp án chấp nhận.`;
    }
    draft.accepted_answers.forEach((answer, index) => {
      const text = answer.trim();
      if (text === "") issues.answers[index] = "Nhập đáp án hoặc xoá dòng này.";
      else if (text.length > MAX_ANSWER_LENGTH) issues.answers[index] = `Tối đa ${MAX_ANSWER_LENGTH} ký tự.`;
    });
  }

  issues.blocking =
    issues.prompt !== undefined ||
    issues.general !== undefined ||
    issues.options.some((message) => message !== undefined) ||
    issues.answers.some((message) => message !== undefined);

  issues.warnings = questionProblems({
    kind: draft.kind,
    accepted_answers: draft.accepted_answers.map((answer) => answer.trim()).filter((answer) => answer !== ""),
    options: draft.options.map((option) => ({ label: option.label, is_correct: option.is_correct })),
  });
  return issues;
}

/** Bản nháp trống cho một dạng câu hỏi mới. */
export function newDraft(kind: QuestionKind): QuestionInput {
  const base = { kind, prompt: "", time_limit_seconds: DEFAULT_TIME_LIMIT, ignore_diacritics: false };
  switch (kind) {
    case "single":
    case "multi":
      return {
        ...base,
        accepted_answers: [],
        options: Array.from({ length: 4 }, () => ({ label: "", is_correct: false })),
      };
    case "true_false":
      return {
        ...base,
        accepted_answers: [],
        options: [
          { label: TRUE_LABEL, is_correct: false },
          { label: FALSE_LABEL, is_correct: false },
        ],
      };
    case "short_text":
      return { ...base, accepted_answers: [""], options: [] };
  }
}

/** Dữ liệu gửi cho `save_question`: cắt khoảng trắng, bỏ dòng đáp án trống, đúng/sai luôn có hai nhãn cố định. */
export function toPayload(draft: QuestionInput): QuestionInput {
  const options =
    draft.kind === "short_text"
      ? []
      : draft.kind === "true_false"
        ? [
            { label: TRUE_LABEL, is_correct: draft.options[0]?.is_correct ?? false },
            { label: FALSE_LABEL, is_correct: draft.options[1]?.is_correct ?? false },
          ]
        : draft.options.map((option) => ({ label: option.label.trim(), is_correct: option.is_correct }));
  return {
    ...(draft.id ? { id: draft.id } : {}),
    kind: draft.kind,
    prompt: draft.prompt.trim(),
    time_limit_seconds: draft.time_limit_seconds,
    accepted_answers:
      draft.kind === "short_text" ? draft.accepted_answers.map((answer) => answer.trim()).filter((answer) => answer !== "") : [],
    ignore_diacritics: draft.kind === "short_text" ? draft.ignore_diacritics : false,
    options,
  };
}
