import { execFileSync, spawn } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";
import {
  admin,
  anon,
  buildQuiz,
  config,
  type QuestionInput,
  type TestUser,
} from "./helpers";

/** Dữ liệu JSON trả về từ các hàm của phiên chơi (hình dạng được kiểm tra trong từng test). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>;

const container = "supabase_db_smartteach";

/**
 * Chạy SQL thẳng trên Postgres cục bộ (vai trò postgres) qua `docker exec`. Dùng cho những thứ
 * PostgREST không cho làm được, như giả lập tiêu đề `request.headers` của địa chỉ IP khác.
 */
export function psql(sql: string): string {
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], {
    input: sql,
    encoding: "utf8",
  }).trim();
}

/** Như `psql` nhưng không chặn: dùng để giữ một giao dịch mở trong lúc test làm việc khác. */
export function psqlAsync(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"]);
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err || `psql thoát với mã ${code}`))));
    child.stdin.end(sql);
  });
}

/** Bốn dạng câu hỏi với khoá đáp án rõ ràng, dùng cho hầu hết các test. */
export const questions: QuestionInput[] = [
  {
    kind: "single",
    prompt: "Thủ đô của Việt Nam là gì?",
    options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế" }, { label: "Đà Nẵng" }, { label: "Cần Thơ" }],
  },
  {
    kind: "true_false",
    prompt: "Mặt Trời quay quanh Trái Đất.",
    options: [{ label: "Đúng" }, { label: "Sai", is_correct: true }],
  },
  {
    kind: "multi",
    prompt: "Những số nào là số chẵn?",
    options: [{ label: "2", is_correct: true }, { label: "3" }, { label: "4", is_correct: true }, { label: "5" }],
  },
  {
    kind: "short_text",
    prompt: "Con vật kêu meo meo là gì?",
    accepted_answers: ["con mèo", "mèo"],
  },
];

export async function newQuiz(host: TestUser, items: QuestionInput[] = questions, title = "Quiz phiên chơi") {
  return buildQuiz(host.client, title, items);
}

export async function startSession(host: TestUser, quizId: string, speedBonus = true, options: Record<string, unknown> = {}) {
  const { data, error } = await host.client.rpc("create_session", {
    p_quiz_id: quizId,
    p_speed_bonus: speedBonus,
    p_options: options,
  });
  expect(error, "create_session").toBeNull();
  const row = (data as { session_id: string; pin: string }[])[0];
  return { id: row.session_id, pin: row.pin };
}

export type JoinResult = { result: string; player_token: string | null; player_nickname: string | null };

export async function join(pin: string, nickname: string, client: SupabaseClient = anon): Promise<JoinResult> {
  const { data, error } = await client.rpc("join_session", { p_pin: pin, p_nickname: nickname });
  expect(error, `join_session ${nickname}`).toBeNull();
  return (data as JoinResult[])[0];
}

/** Vào phòng và trả về mã tham gia; thất bại thì test hỏng. */
export async function joinOk(pin: string, nickname: string): Promise<string> {
  const joined = await join(pin, nickname);
  expect(joined.result, `${nickname} vào phòng`).toBe("ok");
  return joined.player_token as string;
}

export async function host(user: TestUser, fn: string, args: Record<string, unknown>) {
  return user.client.rpc(fn, args);
}

export async function hostOk(user: TestUser, fn: string, args: Record<string, unknown>) {
  const { error } = await user.client.rpc(fn, args);
  expect(error, fn).toBeNull();
}

export async function hostState(user: TestUser, sessionId: string): Promise<Json> {
  const { data, error } = await user.client.rpc("host_state", { p_session: sessionId });
  expect(error, "host_state").toBeNull();
  return data as Json;
}

export async function playerState(token: string): Promise<Json> {
  const { data, error } = await anon.rpc("player_state", { p_token: token });
  expect(error, "player_state").toBeNull();
  return data as Json;
}

export async function leave(token: string) {
  return anon.rpc("leave_session", { p_token: token });
}

export async function submit(token: string, answer: unknown) {
  return anon.rpc("submit_answer", { p_token: token, p_answer: answer });
}

export async function submitOk(token: string, answer: unknown) {
  const { error } = await submit(token, answer);
  expect(error, "submit_answer").toBeNull();
}

/** Đặt thời gian của mọi câu trong đề đã chụp (bằng service_role) để kiểm thử hạn chót mà không cần cửa hậu. */
export async function setTimeLimit(sessionId: string, seconds: number) {
  const { data, error } = await admin.from("live_sessions").select("quiz_snapshot").eq("id", sessionId).single();
  expect(error).toBeNull();
  const snapshot = (data as { quiz_snapshot: { questions: { time_limit_seconds: number }[] } }).quiz_snapshot;
  for (const question of snapshot.questions) question.time_limit_seconds = seconds;
  const updated = await admin.from("live_sessions").update({ quiz_snapshot: snapshot }).eq("id", sessionId);
  expect(updated.error).toBeNull();
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mọi tên khoá có trong một cấu trúc JSON (để kiểm tra không lộ khoá đáp án). */
export function allKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      found.add(key);
      allKeys(item, found);
    }
  }
  return found;
}

/** Gọi RPC bằng fetch để thấy mã HTTP thật (supabase-js chỉ trả mã SQL). */
export async function rpcStatus(
  fn: string,
  body: Record<string, unknown>,
  user?: TestUser,
): Promise<{ status: number; code?: string; message?: string }> {
  const jwt = user ? (await user.client.auth.getSession()).data.session?.access_token : undefined;
  const res = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: config.anonKey, Authorization: `Bearer ${jwt ?? config.anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  return { status: res.status, code: json.code, message: json.message };
}

export { anon, admin };
