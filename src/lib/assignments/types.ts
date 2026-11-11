export type AssignmentStatus = "draft" | "published" | "closed";
export type RevealPolicy = "immediate" | "after_close";

export type AssignmentQuestionSnapshot = {
  kind: "single" | "true_false" | "multi" | "short_text";
  prompt: string;
  time_limit_seconds: number;
  accepted_answers: string[];
  ignore_diacritics: boolean;
  options: Array<{ label: string; is_correct: boolean }>;
};

export type AssignmentSnapshot = { title: string; questions: AssignmentQuestionSnapshot[] };

export type AssignmentSummary = {
  id: string;
  classId: string;
  className: string;
  quizId: string | null;
  title: string;
  publicCode: string;
  status: AssignmentStatus;
  opensAt: string | null;
  dueAt: string | null;
  revealPolicy: RevealPolicy;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type AssignmentDetail = AssignmentSummary & {
  description: string;
  snapshot: AssignmentSnapshot;
};

export type AssignmentDraftInput = {
  title: string;
  description?: string;
  opensAt?: string | null;
  dueAt?: string | null;
  revealPolicy?: RevealPolicy;
};

export type CreateAssignmentInput = AssignmentDraftInput & { classId: string; quizId: string };
