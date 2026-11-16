import { QUESTION_KINDS, type QuestionInput } from "@/lib/quiz/types";
export function isQuestionDraft(value: unknown): value is QuestionInput {
  if (!value || typeof value !== "object") return false;
  const q = value as QuestionInput;
  return QUESTION_KINDS.includes(q.kind) && typeof q.prompt === "string" && q.prompt.length <= 5000
    && typeof q.time_limit_seconds === "number" && typeof q.ignore_diacritics === "boolean"
    && Array.isArray(q.accepted_answers) && q.accepted_answers.length <= 10 && q.accepted_answers.every(a => typeof a === "string" && a.length <= 1000)
    && Array.isArray(q.options) && q.options.length <= 6 && q.options.every(o => o && typeof o.label === "string" && o.label.length <= 1500 && typeof o.is_correct === "boolean");
}
