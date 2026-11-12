import type { GradeId, SubjectId } from "@/lib/catalog";
import type { QuestionInput } from "@/lib/quiz/types";

export type PublicationStatus = "draft" | "pending" | "approved" | "rejected" | "hidden";
export type PublicationDraft = {
  quizId: string;
  title: string;
  description: string;
  subject: SubjectId;
  grades: GradeId[];
};
export type LibraryFilter = { query?: string; subject?: SubjectId; grade?: GradeId; limit?: number; offset?: number };
export type PublicationSummary = { id: string; title: string; description: string; subject: SubjectId; grades: GradeId[]; questionCount: number; publishedAt: string };
export type PublicPublication = PublicationSummary & { questions: Omit<QuestionInput, "id" | "position" | "accepted_answers" | "ignore_diacritics">[] };
export type OwnPublication = { id: string; status: PublicationStatus; title: string; description: string; subject: SubjectId; grades: GradeId[]; reviewReason: string | null };
