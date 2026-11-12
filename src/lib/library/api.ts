import type { SupabaseClient } from "@supabase/supabase-js";
import { GRADES, SUBJECTS, type GradeId, type SubjectId } from "@/lib/catalog";
import { isUuid, type Result } from "@/lib/classes/api";
import { describeLibraryError } from "./errors";
import { MAX_LIBRARY_PAGE_SIZE, MAX_LIBRARY_QUERY_LENGTH, MAX_PUBLICATION_DESCRIPTION_LENGTH, MAX_PUBLICATION_TITLE_LENGTH } from "./limits";
import type { LibraryFilter, OwnPublication, PublicationDraft, PublicationSummary, PublicPublication } from "./types";

const subjectIds = new Set(SUBJECTS.map(({ id }) => id));
const gradeIds = new Set(GRADES.map(({ id }) => id));
const fail = (error: { code?: string; message?: string } | null | undefined): { ok: false; message: string } => ({ ok: false, message: describeLibraryError(error) });

export function validatePublicationDraft(input: PublicationDraft): string | null {
  if (!isUuid(input.quizId)) return "Quiz chưa hợp lệ.";
  if (!input.title.trim()) return "Thầy cô nhập tiêu đề học liệu trước nhé.";
  if (input.title.trim().length > MAX_PUBLICATION_TITLE_LENGTH) return `Tiêu đề tối đa ${MAX_PUBLICATION_TITLE_LENGTH} ký tự.`;
  if (input.description.length > MAX_PUBLICATION_DESCRIPTION_LENGTH) return `Mô tả tối đa ${MAX_PUBLICATION_DESCRIPTION_LENGTH} ký tự.`;
  if (!subjectIds.has(input.subject)) return "Môn học chưa hợp lệ.";
  if (input.grades.length === 0 || input.grades.some((grade) => !gradeIds.has(grade))) return "Chọn ít nhất một khối lớp hợp lệ.";
  return null;
}

export function validateLibraryFilter(input: LibraryFilter): string | null {
  if (input.query && input.query.trim().length > MAX_LIBRARY_QUERY_LENGTH) return `Từ khoá tối đa ${MAX_LIBRARY_QUERY_LENGTH} ký tự.`;
  if (input.subject && !subjectIds.has(input.subject)) return "Môn học chưa hợp lệ.";
  if (input.grade && !gradeIds.has(input.grade)) return "Khối lớp chưa hợp lệ.";
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_LIBRARY_PAGE_SIZE)) return `Mỗi trang tối đa ${MAX_LIBRARY_PAGE_SIZE} học liệu.`;
  if (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0)) return "Vị trí trang chưa hợp lệ.";
  return null;
}

export async function submitPublication(supabase: SupabaseClient, input: PublicationDraft): Promise<Result<{ id: string }>> {
  const issue = validatePublicationDraft(input);
  if (issue) return { ok: false, message: issue };
  const { data, error } = await supabase.rpc("submit_quiz_publication", { p_quiz_id: input.quizId, p_title: input.title.trim(), p_description: input.description, p_subject: input.subject, p_grades: input.grades });
  return error || typeof data !== "string" ? fail(error) : { ok: true, id: data };
}

export async function updatePublication(supabase: SupabaseClient, id: string, input: Omit<PublicationDraft, "quizId">): Promise<Result<object>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy học liệu này." };
  const draftIssue = validatePublicationDraft({ ...input, quizId: "00000000-0000-4000-8000-000000000000" });
  if (draftIssue) return { ok: false, message: draftIssue };
  const { error } = await supabase.rpc("update_quiz_publication", { p_publication: id, p_title: input.title.trim(), p_description: input.description, p_subject: input.subject, p_grades: input.grades });
  return error ? fail(error) : { ok: true };
}

export async function resubmitPublication(supabase: SupabaseClient, id: string): Promise<Result<object>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy học liệu này." };
  const { error } = await supabase.rpc("resubmit_quiz_publication", { p_publication: id });
  return error ? fail(error) : { ok: true };
}

export async function withdrawPublication(supabase: SupabaseClient, id: string): Promise<Result<object>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy học liệu này." };
  const { error } = await supabase.rpc("withdraw_quiz_publication", { p_publication: id });
  return error ? fail(error) : { ok: true };
}

export async function listOwnPublications(supabase: SupabaseClient, quizId: string): Promise<Result<{ publications: OwnPublication[] }>> {
  if (!isUuid(quizId)) return { ok: false, message: "Không tìm thấy quiz này." };
  const { data, error } = await supabase.rpc("own_quiz_publications", { p_quiz_id: quizId });
  if (error || !Array.isArray(data)) return fail(error);
  return { ok: true, publications: (data as Record<string, unknown>[]).map((item) => ({ id: item.id as string, status: item.status as OwnPublication["status"], title: item.title as string, description: item.description as string, subject: item.subject as SubjectId, grades: item.grades as GradeId[], reviewReason: (item.review_reason as string | null) ?? null })) };
}

export async function browseLibrary(supabase: SupabaseClient, input: LibraryFilter = {}): Promise<Result<{ items: PublicationSummary[]; total: number; hasMore: boolean }>> {
  const issue = validateLibraryFilter(input);
  if (issue) return { ok: false, message: issue };
  const { data, error } = await supabase.rpc("library_browse", { p_query: input.query?.trim() ?? "", p_subject: input.subject ?? null, p_grade: input.grade ?? null, p_limit: input.limit ?? MAX_LIBRARY_PAGE_SIZE, p_offset: input.offset ?? 0 });
  if (error || !data || typeof data !== "object") return fail(error);
  const row = data as { items?: Record<string, unknown>[]; total?: number; has_more?: boolean };
  return { ok: true, items: (row.items ?? []).map((item) => ({ id: item.id as string, title: item.title as string, description: item.description as string, subject: item.subject as SubjectId, grades: item.grades as GradeId[], questionCount: Number(item.question_count) || 0, publishedAt: item.published_at as string })), total: Number(row.total) || 0, hasMore: row.has_more === true };
}

export async function previewPublication(supabase: SupabaseClient, id: string): Promise<Result<{ publication: PublicPublication }>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy học liệu này hoặc học liệu chưa được duyệt." };
  const { data, error } = await supabase.rpc("library_preview", { p_publication: id });
  if (error || !data || typeof data !== "object") return fail(error ?? { message: "publication_not_found" });
  return { ok: true, publication: data as PublicPublication };
}

export async function clonePublication(supabase: SupabaseClient, id: string): Promise<Result<{ id: string }>> {
  if (!isUuid(id)) return { ok: false, message: "Không tìm thấy học liệu này hoặc học liệu chưa được duyệt." };
  const { data, error } = await supabase.rpc("clone_library_publication", { p_publication: id });
  return error || typeof data !== "string" ? fail(error) : { ok: true, id: data };
}

export type { GradeId, SubjectId };
