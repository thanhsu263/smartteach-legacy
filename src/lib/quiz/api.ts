import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, type Result } from "@/lib/classes/api";
import { describeQuizError } from "@/lib/quiz/errors";
import { MAX_QUIZZES, MAX_TITLE_LENGTH } from "@/lib/quiz/limits";
import {
  QUESTION_KINDS,
  type ProblemCode,
  type Question,
  type QuestionInput,
  type QuestionKind,
  type QuizProblem,
  type QuizSummary,
  type TimeLimit,
} from "@/lib/quiz/types";

export { MAX_QUIZZES };

function fail(error: { code?: string; message?: string } | null | undefined): { ok: false; message: string } {
  return { ok: false, message: describeQuizError(error) };
}

export function validateTitle(raw: string): string | null {
  const title = raw.trim();
  if (title === "") return "Thầy cô nhập tên quiz trước nhé.";
  if (title.length > MAX_TITLE_LENGTH) return `Tên quiz tối đa ${MAX_TITLE_LENGTH} ký tự.`;
  return null;
}

type OptionRow = { label: string; is_correct: boolean; position: number };
type QuestionRow = {
  id: string;
  position: number;
  kind: string;
  prompt: string;
  time_limit_seconds: number;
  accepted_answers: string[] | null;
  ignore_diacritics: boolean;
  options?: OptionRow[] | null;
};

/** Đổi một dòng câu hỏi (kèm lựa chọn) từ cơ sở dữ liệu sang kiểu dùng ở giao diện; lựa chọn theo đúng thứ tự. */
export function toQuestion(row: QuestionRow): Question {
  const kind: QuestionKind = (QUESTION_KINDS as readonly string[]).includes(row.kind) ? (row.kind as QuestionKind) : "single";
  return {
    id: row.id,
    position: row.position,
    kind,
    prompt: row.prompt,
    time_limit_seconds: row.time_limit_seconds as TimeLimit,
    accepted_answers: row.accepted_answers ?? [],
    ignore_diacritics: row.ignore_diacritics,
    options: [...(row.options ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({ label: option.label, is_correct: option.is_correct })),
  };
}

export async function listQuizzes(supabase: SupabaseClient): Promise<Result<{ quizzes: QuizSummary[] }>> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, share_token, updated_at, questions(count)")
    .order("updated_at", { ascending: false });
  if (error || !data) return fail(error);
  return {
    ok: true,
    quizzes: data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      questionCount: (row.questions as { count: number }[] | null)?.[0]?.count ?? 0,
      shared: row.share_token !== null,
      updatedAt: row.updated_at as string,
    })),
  };
}

export async function createQuiz(supabase: SupabaseClient, title: string): Promise<Result<{ id: string }>> {
  const problem = validateTitle(title);
  if (problem) return { ok: false, message: problem };
  const { data, error } = await supabase.from("quizzes").insert({ title: title.trim() }).select("id").single();
  if (error || !data) return fail(error);
  return { ok: true, id: data.id as string };
}

/**
 * Tạo quiz cùng toàn bộ câu hỏi đã đọc từ tệp hoặc văn bản trong MỘT lời gọi (một giao dịch ở máy chủ): lỗi thì không có quiz
 * nào được tạo. `questions` đã qua bộ đọc `src/lib/quiz/import` nên đã chuẩn hoá và đúng luật; máy chủ vẫn kiểm lại.
 */
export async function importQuiz(supabase: SupabaseClient, title: string, questions: readonly QuestionInput[]): Promise<Result<{ id: string }>> {
  const problem = validateTitle(title);
  if (problem) return { ok: false, message: problem };
  if (questions.length === 0) return { ok: false, message: describeQuizError({ message: "empty_import" }) };
  const { data, error } = await supabase.rpc("import_quiz", { p_title: title.trim(), p_questions: questions });
  if (error || typeof data !== "string") return fail(error);
  return { ok: true, id: data };
}

export async function renameQuiz(supabase: SupabaseClient, id: string, title: string): Promise<Result<object>> {
  const problem = validateTitle(title);
  if (problem) return { ok: false, message: problem };
  const { error } = await supabase.from("quizzes").update({ title: title.trim() }).eq("id", id);
  return error ? fail(error) : { ok: true };
}

export async function deleteQuiz(supabase: SupabaseClient, id: string): Promise<Result<object>> {
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  return error ? fail(error) : { ok: true };
}

export async function duplicateQuiz(supabase: SupabaseClient, id: string): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase.rpc("duplicate_quiz", { p_quiz_id: id });
  if (error || typeof data !== "string") return fail(error);
  return { ok: true, id: data };
}

export type LoadedQuiz = {
  id: string;
  title: string;
  shareToken: string | null;
  questions: Question[];
};

/** Quiz cùng toàn bộ câu hỏi và lựa chọn; `found: false` khi không có hoặc không phải của mình. */
export async function getQuiz(
  supabase: SupabaseClient,
  id: string,
): Promise<Result<{ found: false } | { found: true; quiz: LoadedQuiz }>> {
  if (!isUuid(id)) return { ok: true, found: false };
  const quizRow = await supabase.from("quizzes").select("id, title, share_token").eq("id", id).maybeSingle();
  if (quizRow.error) return fail(quizRow.error);
  if (!quizRow.data) return { ok: true, found: false };

  const questionRows = await supabase
    .from("questions")
    .select("id, position, kind, prompt, time_limit_seconds, accepted_answers, ignore_diacritics, options(label, is_correct, position)")
    .eq("quiz_id", id)
    .order("position", { ascending: true });
  if (questionRows.error || !questionRows.data) return fail(questionRows.error);

  return {
    ok: true,
    found: true,
    quiz: {
      id: quizRow.data.id as string,
      title: quizRow.data.title as string,
      shareToken: (quizRow.data.share_token as string | null) ?? null,
      questions: (questionRows.data as unknown as QuestionRow[]).map(toQuestion),
    },
  };
}

export async function saveQuestion(
  supabase: SupabaseClient,
  quizId: string,
  question: QuestionInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase.rpc("save_question", { p_quiz_id: quizId, p_question: question });
  if (error || typeof data !== "string") return fail(error);
  return { ok: true, id: data };
}

export async function reorderQuestions(supabase: SupabaseClient, quizId: string, ids: string[]): Promise<Result<object>> {
  const { error } = await supabase.rpc("reorder_questions", { p_quiz_id: quizId, p_ids: ids });
  return error ? fail(error) : { ok: true };
}

export async function deleteQuestion(supabase: SupabaseClient, questionId: string): Promise<Result<object>> {
  const { error } = await supabase.rpc("delete_question", { p_question_id: questionId });
  return error ? fail(error) : { ok: true };
}

export async function getQuizProblems(supabase: SupabaseClient, quizId: string): Promise<Result<{ problems: QuizProblem[] }>> {
  const { data, error } = await supabase.rpc("quiz_problems", { p_quiz_id: quizId });
  if (error || !Array.isArray(data)) return fail(error);
  return {
    ok: true,
    problems: (data as { question_position: number; code: string }[]).map((row) => ({
      position: row.question_position,
      code: row.code as ProblemCode,
    })),
  };
}

/** Bật chia sẻ (luôn cấp mã mới) hoặc tắt (trả null). */
export async function setSharing(
  supabase: SupabaseClient,
  quizId: string,
  enabled: boolean,
): Promise<Result<{ token: string | null }>> {
  const { data, error } = await supabase.rpc("set_quiz_sharing", { p_quiz_id: quizId, p_enabled: enabled });
  if (error) return fail(error);
  return { ok: true, token: typeof data === "string" ? data : null };
}

export type SharedQuiz = {
  title: string;
  questions: Omit<Question, "id" | "position">[];
};

export async function getSharedQuiz(supabase: SupabaseClient, token: string): Promise<Result<{ quiz: SharedQuiz }>> {
  if (!isUuid(token)) return { ok: false, message: describeQuizError({ message: "shared_quiz_not_found" }) };
  const { data, error } = await supabase.rpc("get_shared_quiz", { p_token: token });
  if (error || !data) return fail(error);
  const raw = data as {
    title: string;
    questions: Array<Omit<QuestionRow, "id" | "position"> & { options: Array<{ label: string; is_correct: boolean }> }>;
  };
  return {
    ok: true,
    quiz: {
      title: raw.title,
      questions: raw.questions.map((question) => {
        const full = toQuestion({
          ...question,
          id: "",
          position: 0,
          options: question.options.map((option, index) => ({ ...option, position: index })),
        });
        return {
          kind: full.kind,
          prompt: full.prompt,
          time_limit_seconds: full.time_limit_seconds,
          accepted_answers: full.accepted_answers,
          ignore_diacritics: full.ignore_diacritics,
          options: full.options,
        };
      }),
    },
  };
}

export async function cloneSharedQuiz(supabase: SupabaseClient, token: string): Promise<Result<{ id: string }>> {
  if (!isUuid(token)) return { ok: false, message: describeQuizError({ message: "shared_quiz_not_found" }) };
  const { data, error } = await supabase.rpc("clone_shared_quiz", { p_token: token });
  if (error || typeof data !== "string") return fail(error);
  return { ok: true, id: data };
}
