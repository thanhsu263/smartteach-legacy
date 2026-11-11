import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, type Result } from "@/lib/classes/api";
import { describeAssignmentError } from "./errors";
import {
  MAX_ASSIGNMENT_DESCRIPTION_LENGTH,
  MAX_ASSIGNMENT_LIST_PAGE,
  MAX_ASSIGNMENT_TITLE_LENGTH,
} from "./limits";
import type { AssignmentDetail, AssignmentDraftInput, AssignmentStatus, AssignmentSummary, CreateAssignmentInput, RevealPolicy } from "./types";

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
