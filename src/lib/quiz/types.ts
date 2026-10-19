import type { TIME_LIMITS } from "@/lib/quiz/limits";

export type QuestionKind = "single" | "true_false" | "multi" | "short_text";

export const QUESTION_KINDS: readonly QuestionKind[] = ["single", "true_false", "multi", "short_text"];

export const KIND_LABELS: Record<QuestionKind, string> = {
  single: "Trắc nghiệm một đáp án",
  true_false: "Đúng hoặc sai",
  multi: "Nhiều đáp án đúng",
  short_text: "Điền từ ngắn",
};

/** Hai nhãn cố định của câu đúng/sai; hàm `quiz_problems` so khớp đúng hai chuỗi này. */
export const TRUE_LABEL = "Đúng";
export const FALSE_LABEL = "Sai";

export type TimeLimit = (typeof TIME_LIMITS)[number];

export type QuizOption = { label: string; is_correct: boolean };

/** Một câu hỏi như giao diện soạn quiz gửi cho `save_question`. */
export type QuestionInput = {
  id?: string;
  kind: QuestionKind;
  prompt: string;
  time_limit_seconds: TimeLimit;
  accepted_answers: string[];
  ignore_diacritics: boolean;
  options: QuizOption[];
};

export type Question = QuestionInput & { id: string; position: number };

export type QuizSummary = {
  id: string;
  title: string;
  questionCount: number;
  shared: boolean;
  updatedAt: string;
};

/** Mã lỗi chặn việc chơi do hàm `quiz_problems` trả về. */
export type ProblemCode =
  | "no_questions"
  | "too_few_options"
  | "correct_count"
  | "no_correct"
  | "bad_true_false"
  | "no_answers"
  | "duplicate_options";

/** `position` bắt đầu từ 1; 0 là lỗi của cả quiz. */
export type QuizProblem = { position: number; code: ProblemCode };
