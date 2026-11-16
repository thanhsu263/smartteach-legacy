import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";
import { readLocalSupabase } from "../../scripts/supabase-local.mjs";

/** Dùng chung cho các test DB dựng trên stack Supabase cục bộ (`npm run supabase:start`). */
export const config: { url: string; anonKey: string; serviceRoleKey: string } = readLocalSupabase();
export const run = Date.now().toString(36);
export const password = "test-password-123";

export function newClient(key = config.anonKey): SupabaseClient {
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const admin = newClient(config.serviceRoleKey);
export const anon = newClient();

export type TestUser = { client: SupabaseClient; id: string };

/** Explicit fixture for suites exercising Premium assignment behavior. Free users stay Free. */
export async function grantPremiumForTest(user: TestUser) {
  const result = await admin.from("membership_entitlements").upsert({ user_id: user.id, premium_until: new Date(Date.now() + 31 * 86400_000).toISOString() });
  expect(result.error, "cấp Premium cho fixture").toBeNull();
}

const created: string[] = [];

/** Tạo người dùng đã xác nhận và đăng nhập; được xoá ở `cleanupUsers`. */
export async function signUp(label: string): Promise<TestUser> {
  const email = `${label}-${run}-${created.length}@example.test`;
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (result.error || !result.data.user) throw result.error ?? new Error("không tạo được người dùng");
  const client = newClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  created.push(result.data.user.id);
  return { client, id: result.data.user.id };
}

/** Xoá người dùng kéo theo xoá dữ liệu của họ nhờ khoá ngoại `on delete cascade`. */
export async function cleanupUsers() {
  await Promise.all(created.splice(0).map((id) => admin.auth.admin.deleteUser(id)));
}

export type OptionInput = { label: string; is_correct?: boolean };
export type QuestionInput = {
  kind: "single" | "true_false" | "multi" | "short_text";
  prompt: string;
  time_limit_seconds?: number;
  accepted_answers?: string[];
  ignore_diacritics?: boolean;
  options?: OptionInput[];
};

export async function createQuiz(client: SupabaseClient, title = "Quiz thử"): Promise<string> {
  const { data, error } = await client.from("quizzes").insert({ title }).select("id").single();
  expect(error, "tạo quiz").toBeNull();
  return (data as { id: string }).id;
}

export async function saveQuestion(client: SupabaseClient, quizId: string, question: QuestionInput & { id?: string }) {
  return client.rpc("save_question", { p_quiz_id: quizId, p_question: question });
}

/** Dựng một quiz hoàn chỉnh bằng chính hàm `save_question` mà giao diện sẽ dùng. */
export async function buildQuiz(client: SupabaseClient, title: string, questions: QuestionInput[]): Promise<string> {
  const quizId = await createQuiz(client, title);
  for (const question of questions) {
    const { error } = await saveQuestion(client, quizId, question);
    expect(error, `lưu câu "${question.prompt}"`).toBeNull();
  }
  return quizId;
}

export const simpleQuestion = (prompt = "Câu hỏi"): QuestionInput => ({
  kind: "single",
  prompt,
  options: [{ label: "A", is_correct: true }, { label: "B" }],
});
