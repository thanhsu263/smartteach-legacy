import { expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readLocalSupabase } from "../../scripts/supabase-local.mjs";

/**
 * Giáo viên mô phỏng cho e2e của học sinh: điều khiển phiên bằng chính các hàm Postgres (không qua giao diện),
 * rồi báo `{ seq }` trên kênh Realtime như màn hình giáo viên thật sẽ làm. Cần stack Supabase cục bộ.
 */

type LocalConfig = { url: string; anonKey: string; serviceRoleKey: string };
let cached: LocalConfig | undefined;

export function localConfig(): LocalConfig {
  cached ??= readLocalSupabase() as LocalConfig;
  return cached;
}

function client(key: string): SupabaseClient {
  return createClient(localConfig().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const admin = () => client(localConfig().serviceRoleKey);
const createdUsers: string[] = [];

export type Teacher = { client: SupabaseClient; id: string; email: string; password: string };

export async function newTeacher(label = "live-e2e"): Promise<Teacher> {
  const email = `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = "e2e-password-123";
  const created = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("không tạo được giáo viên thử");
  createdUsers.push(created.data.user.id);
  const teacher = client(localConfig().anonKey);
  const signedIn = await teacher.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { client: teacher, id: created.data.user.id, email, password };
}

/** Đăng nhập giao diện bằng tài khoản giáo viên thử rồi tới trang `next`. */
export async function loginAs(page: Page, teacher: Teacher, next = "/my-quizzes") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Mật khẩu").fill(teacher.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
  await expect(page).toHaveURL((url) => url.pathname === next);
}

/** Học sinh mô phỏng qua hàm (không qua giao diện): vào phòng và trả lời bằng mã tham gia. */
export async function joinPlayer(pin: string, nickname: string) {
  const anon = client(localConfig().anonKey);
  const { data, error } = await anon.rpc("join_session", { p_pin: pin, p_nickname: nickname });
  if (error) throw error;
  const row = (data as { result: string; player_token: string | null }[])[0];
  if (row.result !== "ok" || !row.player_token) throw new Error(`${nickname} không vào được: ${row.result}`);
  const token = row.player_token;
  return {
    token,
    async answer(value: unknown) {
      const { error: submitError } = await anon.rpc("submit_answer", { p_token: token, p_answer: value });
      if (submitError) throw new Error(`submit_answer: ${submitError.message}`);
    },
  };
}

export type QuestionSpec = {
  kind: "single" | "true_false" | "multi" | "short_text";
  prompt: string;
  time_limit_seconds?: number;
  accepted_answers?: string[];
  ignore_diacritics?: boolean;
  options?: { label: string; is_correct?: boolean }[];
};

/** Bốn dạng câu hỏi, đủ để chơi trọn một phiên. */
export const fourKinds: QuestionSpec[] = [
  {
    kind: "single",
    prompt: "Thủ đô của Việt Nam là gì?",
    options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế" }, { label: "Đà Nẵng" }, { label: "Cần Thơ" }],
  },
  { kind: "true_false", prompt: "Mặt Trời quay quanh Trái Đất.", options: [{ label: "Đúng" }, { label: "Sai", is_correct: true }] },
  {
    kind: "multi",
    prompt: "Những số nào là số chẵn?",
    options: [{ label: "2", is_correct: true }, { label: "3" }, { label: "4", is_correct: true }, { label: "5" }],
  },
  { kind: "short_text", prompt: "Con vật kêu meo meo là gì?", accepted_answers: ["con mèo", "mèo"] },
];

export async function newQuiz(teacher: Teacher, questions: QuestionSpec[] = fourKinds, title = "Quiz e2e"): Promise<string> {
  const created = await teacher.client.from("quizzes").insert({ title }).select("id").single();
  if (created.error) throw created.error;
  const quizId = (created.data as { id: string }).id;
  for (const question of questions) {
    const saved = await teacher.client.rpc("save_question", { p_quiz_id: quizId, p_question: question });
    if (saved.error) throw saved.error;
  }
  return quizId;
}

export type LiveSession = ReturnType<typeof wrap>;

function wrap(teacher: Teacher, id: string, pin: string) {
  /** Gọi một hàm điều khiển rồi báo seq mới cho người chơi (giống `runHostAction`). */
  async function act(fn: string, args: Record<string, unknown> = {}) {
    const { error } = await teacher.client.rpc(fn, { p_session: id, ...args });
    if (error) throw new Error(`${fn}: ${error.message}`);
    await notify();
  }

  async function state() {
    const { data, error } = await teacher.client.rpc("host_state", { p_session: id });
    if (error) throw new Error(`host_state: ${error.message}`);
    return data as { seq: number; status: string; answered_count: number; players: { id: string; nickname: string; score: number }[] };
  }

  async function notify() {
    const { seq } = await state();
    const { url, anonKey } = localConfig();
    try {
      await fetch(`${url}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ topic: `session:${id}`, event: "seq", payload: { seq }, private: false }] }),
      });
    } catch {
      // Không gửi được tin báo thì người chơi vẫn đồng bộ bằng polling.
    }
  }

  return {
    id,
    pin,
    state,
    open: () => act("host_open_question"),
    close: () => act("host_close_question"),
    next: () => act("host_next"),
    end: () => act("host_end_session"),
    lock: (locked: boolean) => act("host_set_locked", { p_locked: locked }),
    async remove(nickname: string) {
      const player = (await state()).players.find((p) => p.nickname === nickname);
      if (!player) throw new Error(`không có người chơi ${nickname}`);
      await act("host_remove_participant", { p_participant: player.id });
    },
    /** Đặt thời gian của mọi câu trong đề đã chụp (bằng service_role) để kiểm thử hết giờ mà không chờ lâu. */
    async setTimeLimit(seconds: number) {
      const row = await admin().from("live_sessions").select("quiz_snapshot").eq("id", id).single();
      if (row.error) throw row.error;
      const snapshot = (row.data as { quiz_snapshot: { questions: { time_limit_seconds: number }[] } }).quiz_snapshot;
      for (const question of snapshot.questions) question.time_limit_seconds = seconds;
      const updated = await admin().from("live_sessions").update({ quiz_snapshot: snapshot }).eq("id", id);
      if (updated.error) throw updated.error;
    },
  };
}

export async function startSession(teacher: Teacher, quizId: string, speedBonus = false) {
  const { data, error } = await teacher.client.rpc("create_session", { p_quiz_id: quizId, p_speed_bonus: speedBonus });
  if (error) throw new Error(`create_session: ${error.message}`);
  const row = (data as { session_id: string; pin: string }[])[0];
  return wrap(teacher, row.session_id, row.pin);
}

/** Tạo giáo viên, quiz và phiên trong một lần gọi. */
export async function newSession(questions: QuestionSpec[] = fourKinds, speedBonus = false) {
  const teacher = await newTeacher();
  const quizId = await newQuiz(teacher, questions);
  return { teacher, session: await startSession(teacher, quizId, speedBonus) };
}

/** Xoá người dùng thử (kéo theo phiên). */
export async function cleanupLive() {
  const service = admin();
  await Promise.all(createdUsers.splice(0).map((id) => service.auth.admin.deleteUser(id)));
}
