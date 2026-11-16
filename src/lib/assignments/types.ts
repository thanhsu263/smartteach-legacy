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
  snapshotVersion?: 1 | 2;
  examId?: string | null;
  durationSeconds?: number | null;
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

export type AssignmentProgress = {
  notStarted: number;
  inProgress: number;
  submitted: number;
};

export type AssignmentRosterEntry = {
  scorePoints?: number | null;
  maxPoints?: number | null;
  studentId: string;
  name: string;
  attemptStatus: "in_progress" | "submitted" | "invalidated" | null;
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
  correct: number | null;
  total: number | null;
};

export type AssignmentQuestionAnalytics = { position: number; answered: number; correct: number; unanswered: number };

export type AssignmentAttemptDetail = {
  scorePoints?: number | null;
  maxPoints?: number | null;
  studentId: string;
  name: string;
  status: AssignmentRosterEntry["attemptStatus"];
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
  correct: number | null;
  total: number | null;
  answers: Array<{ position: number; answer: StudentAnswer; isCorrect: boolean | null }>;
};

export type IssuedCredential = {
  studentId: string;
  credential: string;
  hint: string;
  version: number;
};

export type StudentAssignmentQuestion = {
  sectionTitle?: string;
  points?: number;
  index: number;
  kind: AssignmentQuestionSnapshot["kind"];
  prompt: string;
  timeLimitSeconds: number;
  options: string[];
};

export type StudentAnswer = number | number[] | string;

export type StudentAssignmentState = {
  snapshotVersion?: 2;
  deadlineAt?: string;
  serverNow?: string;
  phase: "in_progress" | "submitted" | "invalidated" | "unavailable";
  title: string;
  description: string;
  attemptId: string;
  expiresAt: string;
  questions: StudentAssignmentQuestion[];
  answers: Record<string, StudentAnswer>;
  submittedAt: string | null;
  result: { score: number; correct: number; total: number; scorePoints?: number; maxPoints?: number } | null;
};
