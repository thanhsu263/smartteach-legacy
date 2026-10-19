import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/classes/api";
import { describeJoinCode, describeLiveError, isFatalPlayerError, liveErrorKey } from "@/lib/live/errors";
import type { HistoryRow, HostResults } from "@/lib/live/results";
import type { FetchOutcome } from "@/lib/live/sync";
import type { AnswerValue, HostState, JoinCode, LeaderboardView, PlayerState } from "@/lib/live/types";

/**
 * Lớp gọi các hàm Postgres của phiên chơi (xem migration live_sessions), trả kết quả có kiểu và lỗi
 * tiếng Việt. Không lộ thông báo kỹ thuật cho người dùng.
 */

type Failure = {
  ok: false;
  message: string;
  /** Mã tham gia hỏng hẳn: không thể thử lại, phải vào lại phòng. */
  fatal: boolean;
  /** Với `join`: mã kết quả để giao diện biết lỗi thuộc ô PIN hay ô biệt danh. */
  code?: JoinCode | string;
  /** Mã nghiệp vụ của lỗi (vd. "already_answered", "answer_closed") để giao diện rẽ nhánh; null nếu lỗi khác. */
  reason?: string | null;
};

export type LiveResult<T> = ({ ok: true } & T) | Failure;

type ErrorLike = { code?: string; message?: string } | null | undefined;

function fail(error: ErrorLike, fatal = isFatalPlayerError(error)): Failure {
  return { ok: false, message: describeLiveError(error), fatal, reason: liveErrorKey(error) };
}

const BAD_TOKEN: Failure = { ok: false, message: describeLiveError({ message: "invalid_token" }), fatal: true };
const BAD_SESSION: Failure = { ok: false, message: describeLiveError({ message: "session_not_found" }), fatal: false };

async function call(supabase: SupabaseClient, fn: string, args: Record<string, unknown>) {
  return supabase.rpc(fn, args);
}

async function action(supabase: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<LiveResult<object>> {
  const { error } = await call(supabase, fn, args);
  return error ? fail(error, false) : { ok: true };
}

/** Hàm của giáo viên. */
export const host = {
  async create(supabase: SupabaseClient, quizId: string, speedBonus: boolean): Promise<LiveResult<{ sessionId: string; pin: string }>> {
    if (!isUuid(quizId)) return { ok: false, message: describeLiveError({ message: "quiz_not_found" }), fatal: false };
    const { data, error } = await call(supabase, "create_session", { p_quiz_id: quizId, p_speed_bonus: speedBonus });
    const row = Array.isArray(data) ? (data[0] as { session_id?: string; pin?: string } | undefined) : undefined;
    if (error || !row?.session_id || !row.pin) return fail(error, false);
    return { ok: true, sessionId: row.session_id, pin: row.pin };
  },

  async state(supabase: SupabaseClient, sessionId: string): Promise<LiveResult<{ state: HostState }>> {
    // Id sai dạng thì hỏi tiếp cũng vô ích: báo hỏng hẳn để màn hình nói "không tìm thấy" thay vì quay mãi.
    if (!isUuid(sessionId)) return { ...BAD_SESSION, fatal: true };
    const { data, error } = await call(supabase, "host_state", { p_session: sessionId });
    // Không phải chủ phiên (hoặc phiên không còn): hỏi tiếp cũng vô ích nên báo hỏng hẳn để giao diện nói rõ.
    if (error || !data) return fail(error, ["session_not_found", "not_authenticated"].includes(liveErrorKey(error) ?? ""));
    return { ok: true, state: data as HostState };
  },

  setLocked: (supabase: SupabaseClient, sessionId: string, locked: boolean) =>
    isUuid(sessionId) ? action(supabase, "host_set_locked", { p_session: sessionId, p_locked: locked }) : Promise.resolve(BAD_SESSION),

  remove: (supabase: SupabaseClient, sessionId: string, participantId: string) =>
    isUuid(sessionId) && isUuid(participantId)
      ? action(supabase, "host_remove_participant", { p_session: sessionId, p_participant: participantId })
      : Promise.resolve(BAD_SESSION),

  open: (supabase: SupabaseClient, sessionId: string) =>
    isUuid(sessionId) ? action(supabase, "host_open_question", { p_session: sessionId }) : Promise.resolve(BAD_SESSION),

  close: (supabase: SupabaseClient, sessionId: string) =>
    isUuid(sessionId) ? action(supabase, "host_close_question", { p_session: sessionId }) : Promise.resolve(BAD_SESSION),

  /** Kết quả chi tiết sau buổi chơi (chỉ chủ phiên, chỉ khi đã kết thúc). Không phải của mình hoặc id sai thì báo hỏng hẳn. */
  async results(supabase: SupabaseClient, sessionId: string): Promise<LiveResult<{ results: HostResults }>> {
    if (!isUuid(sessionId)) return { ...BAD_SESSION, fatal: true };
    const { data, error } = await call(supabase, "host_results", { p_session: sessionId });
    if (error || !data) return fail(error, liveErrorKey(error) === "session_not_found");
    return { ok: true, results: data as HostResults };
  },

  /** Các buổi đã chơi (của một quiz, hoặc tất cả), mới nhất trước; `offset` để xem thêm. */
  async history(
    supabase: SupabaseClient,
    options: { quizId?: string; limit?: number; offset?: number } = {},
  ): Promise<LiveResult<{ rows: HistoryRow[] }>> {
    const args: Record<string, unknown> = {};
    if (options.quizId) args.p_quiz_id = options.quizId;
    if (options.limit !== undefined) args.p_limit = options.limit;
    if (options.offset !== undefined) args.p_offset = options.offset;
    const { data, error } = await call(supabase, "session_history", args);
    if (error || !Array.isArray(data)) return fail(error, false);
    return { ok: true, rows: data as HistoryRow[] };
  },

  deleteSession: (supabase: SupabaseClient, sessionId: string) =>
    isUuid(sessionId) ? action(supabase, "delete_session", { p_session: sessionId }) : Promise.resolve(BAD_SESSION),

  /** Tự đóng khi hết giờ: máy chủ chỉ đóng nếu giờ của nó đã qua hạn. `closed` false nghĩa là chưa tới hạn hoặc đã đóng rồi. */
  async closeIfExpired(supabase: SupabaseClient, sessionId: string): Promise<LiveResult<{ closed: boolean }>> {
    if (!isUuid(sessionId)) return BAD_SESSION;
    const { data, error } = await call(supabase, "host_close_if_expired", { p_session: sessionId });
    return error ? fail(error, false) : { ok: true, closed: data === true };
  },

  next: (supabase: SupabaseClient, sessionId: string) =>
    isUuid(sessionId) ? action(supabase, "host_next", { p_session: sessionId }) : Promise.resolve(BAD_SESSION),

  end: (supabase: SupabaseClient, sessionId: string) =>
    isUuid(sessionId) ? action(supabase, "host_end_session", { p_session: sessionId }) : Promise.resolve(BAD_SESSION),
};

/** Hàm của học sinh (chỉ cần mã tham gia bí mật). */
export const player = {
  async join(supabase: SupabaseClient, pin: string, nickname: string): Promise<LiveResult<{ token: string; nickname: string }>> {
    const { data, error } = await call(supabase, "join_session", { p_pin: pin, p_nickname: nickname });
    if (error) return fail(error, false);
    const row = Array.isArray(data)
      ? (data[0] as { result?: string; player_token?: string | null; player_nickname?: string | null } | undefined)
      : undefined;
    if (!row?.result) return fail(null, false);
    if (row.result !== "ok" || !row.player_token) {
      return { ok: false, message: describeJoinCode(row.result), fatal: false, code: row.result };
    }
    return { ok: true, token: row.player_token, nickname: row.player_nickname ?? nickname };
  },

  async state(supabase: SupabaseClient, token: string): Promise<LiveResult<{ state: PlayerState }>> {
    if (!isUuid(token)) return BAD_TOKEN;
    const { data, error } = await call(supabase, "player_state", { p_token: token });
    if (error || !data) return fail(error);
    return { ok: true, state: data as PlayerState };
  },

  async submit(supabase: SupabaseClient, token: string, answer: AnswerValue): Promise<LiveResult<object>> {
    if (!isUuid(token)) return BAD_TOKEN;
    const { error } = await call(supabase, "submit_answer", { p_token: token, p_answer: answer });
    return error ? fail(error) : { ok: true };
  },

  /** Tự rời phòng: giải phóng chỗ và biệt danh (xoá dòng nếu còn ở phòng chờ, đánh dấu rời nếu đã bắt đầu). */
  async leave(supabase: SupabaseClient, token: string): Promise<LiveResult<object>> {
    if (!isUuid(token)) return BAD_TOKEN;
    const { error } = await call(supabase, "leave_session", { p_token: token });
    return error ? fail(error) : { ok: true };
  },

  async leaderboard(supabase: SupabaseClient, token: string): Promise<LiveResult<{ board: LeaderboardView }>> {
    if (!isUuid(token)) return BAD_TOKEN;
    const { data, error } = await call(supabase, "player_leaderboard", { p_token: token });
    if (error || !data) return fail(error);
    return { ok: true, board: data as LeaderboardView };
  },
};

/** Nguồn trạng thái cho lõi đồng bộ của giáo viên. */
export function hostFetcher(supabase: SupabaseClient, sessionId: string): () => Promise<FetchOutcome<HostState>> {
  return async () => {
    const result = await host.state(supabase, sessionId);
    return result.ok ? { ok: true, state: result.state } : { ok: false, message: result.message, fatal: result.fatal };
  };
}

/** Nguồn trạng thái cho lõi đồng bộ của học sinh; mã hỏng hẳn thì báo `fatal`. */
export function playerFetcher(supabase: SupabaseClient, token: string): () => Promise<FetchOutcome<PlayerState>> {
  return async () => {
    const result = await player.state(supabase, token);
    return result.ok ? { ok: true, state: result.state } : { ok: false, message: result.message, fatal: result.fatal };
  };
}
