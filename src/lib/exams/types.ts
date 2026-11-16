import type { QuestionKind, QuizOption } from "@/lib/quiz/types";
export type ExamQuestion = { id: string; kind: QuestionKind; prompt: string; options: QuizOption[]; accepted_answers: string[]; ignore_diacritics: boolean; pointUnits: number | null };
export type ExamSection = { id: string; title: string; questions: ExamQuestion[] };
export type ExamDocument = { schemaVersion: 1; durationMinutes: number; sections: ExamSection[] };
export type ExamForm = { title: string; description: string; document: ExamDocument };
export type ExamDetail = ExamForm & { id: string; revision: number; updatedAt: string };
export type ExamSummary = Omit<ExamDetail, "document" | "description"> & { questionCount: number };
export type ExamIssue = { path: string; message: string };
export function emptyExam(): ExamForm { return { title: "", description: "", document: { schemaVersion: 1, durationMinutes: 45, sections: [] } }; }
export function emptyQuestion(kind: QuestionKind): ExamQuestion {
  return { id: crypto.randomUUID(), kind, prompt: "", pointUnits: 100, ignore_diacritics: false, accepted_answers: [], options: kind === "short_text" ? [] : (kind === "true_false" ? ["Đúng", "Sai"] : ["", "", "", ""]).map(label => ({ label, is_correct: false })) };
}
