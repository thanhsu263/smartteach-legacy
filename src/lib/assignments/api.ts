import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, type Result } from "@/lib/classes/api";
import { describeAssignmentError } from "./errors";
import {
  MAX_ASSIGNMENT_DESCRIPTION_LENGTH,
  MAX_ASSIGNMENT_LIST_PAGE,
  MAX_ASSIGNMENT_TITLE_LENGTH,
} from "./limits";
import type {
  AssignmentDetail,
  AssignmentAttemptDetail,
  AssignmentQuestionAnalytics,
  AssignmentDraftInput,
  AssignmentProgress,
  AssignmentRosterEntry,
  AssignmentStatus,
  AssignmentSummary,
  CreateAssignmentInput,
  IssuedCredential,
  RevealPolicy,
  StudentAnswer,
  StudentAssignmentState,
} from "./types";
import { describeStudentAssignmentError } from "./student-access";

type ErrorLike = { code?: string; message?: string } | null | undefined;

function fail(error: ErrorLike): { ok: false; message: string } {
  return { ok: false, message: describeAssignmentError(error) };
}
export function validateAssignmentDraft(input: AssignmentDraftInput): string | null {
  if (input.title.trim() === "") return "Thầy cô nhập tên bài giao trước nhé.";
  if (input.title.trim().length > MAX_ASSIGNMENT_TITLE_LENGTH) return `Tên bài giao tối đa ${MAX_ASSIGNMENT_TITLE_LENGTH} ký tự.`;
  if ((input.description ?? "").length > MAX_ASSIGNMENT_DESCRIPTION_LENGTH) return `Mô tả tối đa ${MAX_ASSIGNMENT_DESCRIPTION_LENGTH} ký tự.`;
  if (input.opensAt && Number.isNaN(Date.parse(input.opensAt))) return "Thời điểm mở bài chưa hợp lệ.";
  if (input.dueAt && Number.isNaN(Date.parse(input.dueAt))) return "Hạn nộp chưa hợp lệ.";
  if (input.opensAt && input.dueAt && Date.parse(input.dueAt) <= Date.parse(input.opensAt)) return "Hạn nộp cần sau thời điểm mở bài.";
  if (input.revealPolicy && !["immediate", "after_close"].includes(input.revealPolicy)) return "Cách công bố kết quả chưa hợp lệ.";
  return null;
}
function mapSummary(row: Record<string, unknown>): AssignmentSummary {
  return {
    ...(row.snapshot_version === 2 ? { snapshotVersion: 2 as const, examId: row.exam_id as string | null, durationSeconds: row.duration_seconds as number | null } : {}),
    id: row.id as string,
    classId: row.class_id as string,
    className: row.class_name as string,
    quizId: (row.quiz_id as string | null) ?? null,
    title: row.title as string,
    publicCode: row.public_code as string,
    status: row.status as AssignmentStatus,
    opensAt: (row.opens_at as string | null) ?? null,
    dueAt: (row.due_at as string | null) ?? null,
    revealPolicy: row.reveal_policy as RevealPolicy,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
  };
}

function rpcDraft(input: AssignmentDraftInput) {
  return {
    p_title: input.title.trim(),
    p_description: input.description ?? "",
    p_opens_at: input.opensAt ?? null,
    p_due_at: input.dueAt ?? null,
    p_reveal_policy: input.revealPolicy ?? "after_close",
  };
}

export async function createAssignment(supabase: SupabaseClient, input: CreateAssignmentInput): Promise<Result<{ id: string }>> {
  const issue = validateAssignmentDraft(input);
  if (issue) return { ok: false, message: issue };
  if (!isUuid(input.classId) || !isUuid(input.quizId)) return { ok: false, message: "Lớp hoặc quiz chưa hợp lệ." };
  const { data, error } = await supabase.rpc("create_assignment", { p_class_id: input.classId, p_quiz_id: input.quizId, ...rpcDraft(input) });
  return error || typeof data !== "string" ? fail(error) : { ok: true, id: data };
}

export async function updateAssignmentDraft(supabase: SupabaseClient, id: string, input: AssignmentDraftInput): Promise<Result<object>> {
  const issue = validateAssignmentDraft(input);
  if (issue) return { ok: false, message: issue };
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá." };
  const { error } = await supabase.rpc("update_assignment_draft", { p_assignment: id, ...rpcDraft(input) });
  return error ? fail(error) : { ok: true };
}

async function mutate(supabase: SupabaseClient, fn: "publish_assignment" | "close_assignment" | "delete_assignment", id: string): Promise<Result<object>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá." };
  const { error } = await supabase.rpc(fn, { p_assignment: id });
  return error ? fail(error) : { ok: true };
}

export const publishAssignment = (supabase: SupabaseClient, id: string) => mutate(supabase, "publish_assignment", id);
export const closeAssignment = (supabase: SupabaseClient, id: string) => mutate(supabase, "close_assignment", id);
export const deleteAssignment = (supabase: SupabaseClient, id: string) => mutate(supabase, "delete_assignment", id);

export async function listAssignments(
  supabase: SupabaseClient,
  options: { status?: AssignmentStatus; limit?: number; offset?: number } = {},
): Promise<Result<{ assignments: AssignmentSummary[] }>> {
  const { data, error } = await supabase.rpc("assignment_list", {
    p_status: options.status ?? null,
    p_limit: Math.min(Math.max(options.limit ?? 50, 1), MAX_ASSIGNMENT_LIST_PAGE),
    p_offset: Math.max(options.offset ?? 0, 0),
  });
  return error || !Array.isArray(data) ? fail(error) : { ok: true, assignments: (data as Record<string, unknown>[]).map(mapSummary) };
}

export async function getAssignmentDetail(supabase: SupabaseClient, id: string): Promise<Result<{ assignment: AssignmentDetail }>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá." };
  const { data, error } = await supabase.rpc("assignment_detail", { p_assignment: id });
  if (error || !data || typeof data !== "object") return fail(error ?? { message: "assignment_not_found" });
  const row = data as Record<string, unknown>;
  return { ok: true, assignment: { ...mapSummary(row), description: row.description as string, snapshot: row.snapshot as AssignmentDetail["snapshot"] } };
}

function studentFail(error: ErrorLike): { ok: false; message: string } {
  return { ok: false, message: describeStudentAssignmentError(error) };
}

export async function getAssignmentProgress(supabase: SupabaseClient, id: string): Promise<Result<{ progress: AssignmentProgress }>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá." };
  const { data, error } = await supabase.rpc("assignment_progress", { p_assignment: id });
  if (error || !data || typeof data !== "object") return fail(error ?? { message: "assignment_not_found" });
  const row = data as Record<string, unknown>;
  return {
    ok: true,
    progress: {
      notStarted: Number(row.not_started) || 0,
      inProgress: Number(row.in_progress) || 0,
      submitted: Number(row.submitted) || 0,
    },
  };
}

export async function getAssignmentRoster(supabase: SupabaseClient, id: string): Promise<Result<{ roster: AssignmentRosterEntry[] }>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá." };
  const { data, error } = await supabase.rpc("assignment_roster_results", { p_assignment: id });
  if (error || !Array.isArray(data)) return fail(error ?? { message: "assignment_not_found" });
  return {
    ok: true,
    roster: (data as Record<string, unknown>[]).map((row) => ({
      ...(typeof row.max_points === "number" ? { maxPoints: row.max_points, scorePoints: typeof row.score_points === "number" ? row.score_points : null } : {}),
      studentId: row.student_id as string,
      name: row.name as string,
      attemptStatus: (row.attempt_status as AssignmentRosterEntry["attemptStatus"]) ?? null,
      startedAt: (row.started_at as string | null) ?? null,
      submittedAt: (row.submitted_at as string | null) ?? null,
      score: typeof row.score === "number" ? row.score : null,
      correct: typeof row.correct === "number" ? row.correct : null,
      total: typeof row.total === "number" ? row.total : null,
    })),
  };
}

export async function getAssignmentQuestionAnalytics(supabase: SupabaseClient, id: string): Promise<Result<{ questions: AssignmentQuestionAnalytics[] }>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá." };
  const { data, error } = await supabase.rpc("assignment_question_analytics", { p_assignment: id });
  if (error || !Array.isArray(data)) return fail(error ?? { message: "assignment_not_found" });
  return { ok: true, questions: (data as Record<string, unknown>[]).map((row) => ({ position: Number(row.position) || 0, answered: Number(row.answered) || 0, correct: Number(row.correct) || 0, unanswered: Number(row.unanswered) || 0 })) };
}

export async function getAssignmentAttemptDetail(supabase: SupabaseClient, assignmentId: string, studentId: string): Promise<Result<{ attempt: AssignmentAttemptDetail }>> {
  if (!isUuid(assignmentId) || !isUuid(studentId)) return { ok: false, message: "Không tìm thấy lượt làm bài này." };
  const { data, error } = await supabase.rpc("assignment_attempt_detail", { p_assignment: assignmentId, p_student: studentId });
  if (error || !data || typeof data !== "object") return fail(error ?? { message: "assignment_not_found" });
  const row = data as Record<string, unknown>;
  return { ok: true, attempt: {
    ...(typeof row.max_points === "number" ? { maxPoints: row.max_points, scorePoints: typeof row.score_points === "number" ? row.score_points : null } : {}),
    studentId: row.student_id as string, name: row.name as string, status: (row.status as AssignmentAttemptDetail["status"]) ?? null,
    startedAt: (row.started_at as string | null) ?? null, submittedAt: (row.submitted_at as string | null) ?? null,
    score: typeof row.score === "number" ? row.score : null, correct: typeof row.correct === "number" ? row.correct : null, total: typeof row.total === "number" ? row.total : null,
    answers: Array.isArray(row.answers) ? (row.answers as Record<string, unknown>[]).map((answer) => ({ position: Number(answer.position) || 0, answer: answer.answer as StudentAnswer, isCorrect: typeof answer.is_correct === "boolean" ? answer.is_correct : null })) : [],
  } };
}

export async function issueStudentCredential(supabase: SupabaseClient, studentId: string): Promise<Result<{ credential: IssuedCredential }>> {
  if (!isUuid(studentId)) return { ok: false, message: "Không tìm thấy học sinh trong lớp này." };
  const { data, error } = await supabase.rpc("issue_student_credential", { p_student: studentId });
  if (error || !data || typeof data !== "object") return fail(error ?? { message: "student_not_found" });
  const row = data as Record<string, unknown>;
  if (typeof row.credential !== "string" || typeof row.hint !== "string" || typeof row.version !== "number") return fail({ message: "student_not_found" });
  return { ok: true, credential: { studentId: row.student_id as string, credential: row.credential, hint: row.hint, version: row.version } };
}

export async function revokeStudentCredential(supabase: SupabaseClient, studentId: string): Promise<Result<object>> {
  if (!isUuid(studentId)) return { ok: false, message: "Không tìm thấy học sinh trong lớp này." };
  const { error } = await supabase.rpc("revoke_student_credential", { p_student: studentId });
  return error ? fail(error) : { ok: true };
}

export async function resetAssignmentAttempt(supabase: SupabaseClient, assignmentId: string, studentId: string): Promise<Result<object>> {
  if (!isUuid(assignmentId) || !isUuid(studentId)) return { ok: false, message: "Không tìm thấy lượt làm bài cần đặt lại." };
  const { error } = await supabase.rpc("reset_assignment_attempt", { p_assignment: assignmentId, p_student: studentId });
  return error ? fail(error) : { ok: true };
}

export async function exchangeAssignmentAccess(supabase: SupabaseClient, code: string, credential: string): Promise<Result<{ token: string }>> {
  const { data, error } = await supabase.rpc("exchange_assignment_access", { p_code: code.trim().toUpperCase(), p_credential: credential.trim().toUpperCase() });
  if (error || !data || typeof data !== "object") return studentFail(error);
  const row = data as Record<string, unknown>;
  return row.result === "ok" && typeof row.token === "string"
    ? { ok: true, token: row.token }
    : studentFail({ message: "invalid_assignment_access" });
}

function mapStudentState(row: Record<string, unknown>): StudentAssignmentState | null {
  if (!Array.isArray(row.questions) || typeof row.phase !== "string" || typeof row.title !== "string" || typeof row.attempt_id !== "string" || typeof row.expires_at !== "string") return null;
  const allowed = ["in_progress", "submitted", "invalidated", "unavailable"];
  if (!allowed.includes(row.phase)) return null;
  const result = row.result as Record<string, unknown> | null;
  return {
    phase: row.phase as StudentAssignmentState["phase"],
    ...(row.snapshot_version === 2 && typeof row.deadline_at === "string" && typeof row.server_now === "string" ? { snapshotVersion: 2 as const, deadlineAt: row.deadline_at, serverNow: row.server_now } : {}),
    title: row.title,
    description: typeof row.description === "string" ? row.description : "",
    attemptId: row.attempt_id,
    expiresAt: row.expires_at,
    questions: (row.questions as Record<string, unknown>[]).map((question) => ({
      index: Number(question.index),
      kind: question.kind as StudentAssignmentState["questions"][number]["kind"],
      prompt: question.prompt as string,
      timeLimitSeconds: Number(question.time_limit_seconds) || 0,
      ...(typeof question.points === "number" ? { points: question.points, sectionTitle: String(question.section_title ?? "") } : {}),
      options: Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === "string") : [],
    })),
    answers: (row.answers && typeof row.answers === "object" ? row.answers : {}) as Record<string, StudentAnswer>,
    submittedAt: (row.submitted_at as string | null) ?? null,
    result: result && typeof result.score === "number" && typeof result.correct === "number" && typeof result.total === "number"
      ? { score: result.score, correct: result.correct, total: result.total, ...(typeof result.score_points === "number" && typeof result.max_points === "number" ? { scorePoints: result.score_points, maxPoints: result.max_points } : {}) }
      : null,
  };
}

export async function getStudentAssignmentState(supabase: SupabaseClient, token: string): Promise<Result<{ state: StudentAssignmentState }>> {
  const { data, error } = await supabase.rpc("assignment_student_state", { p_token: token });
  const state = !error && data && typeof data === "object" ? mapStudentState(data as Record<string, unknown>) : null;
  return state ? { ok: true, state } : studentFail(error);
}

export async function saveStudentAssignmentAnswer(supabase: SupabaseClient, token: string, position: number, answer: StudentAnswer): Promise<Result<object>> {
  const { data, error } = await supabase.rpc("save_assignment_answer", { p_token: token, p_position: position, p_answer: answer });
  if (!error && data?.saved === false) return { ok: false, message: "Bài đã hết giờ hoặc đã nộp; câu trả lời mới không được lưu." };
  return error ? studentFail(error) : { ok: true };
}

export async function submitStudentAssignment(supabase: SupabaseClient, token: string): Promise<Result<object>> {
  const { error } = await supabase.rpc("submit_assignment", { p_token: token });
  return error ? studentFail(error) : { ok: true };
}
