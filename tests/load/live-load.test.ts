import { mkdirSync, writeFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { createSessionChannel } from "@/lib/live/channel";
import { host, player, playerFetcher, hostFetcher } from "@/lib/live/rpc";
import { createLiveSync, pollIntervalForPhase, type LiveSync } from "@/lib/live/sync";
import type { AnswerValue, HostState, PlayerState } from "@/lib/live/types";
import { buildQuiz, cleanupUsers, config, signUp, type QuestionInput } from "../db/helpers";

/**
 * Thử tải phiên chơi trực tiếp trên stack Supabase cục bộ. KHÔNG nằm trong `npm test`; chạy bằng
 * `npm run test:load`. Mỗi người chơi là một client Supabase riêng (một WebSocket Realtime riêng) và dùng
 * đúng lõi đồng bộ `createLiveSync` cùng các hàm gọi RPC của ứng dụng, nên nhịp hỏi và tin báo giống thật.
 *
 * Biến môi trường: LOAD_PLAYERS (mặc định 40), LOAD_SESSIONS (mặc định 1), LOAD_QUESTIONS (mặc định 5).
 *
 * Lưu ý: stack cục bộ chạy trên một máy, không có độ trễ mạng thật. Số kết nối, số tin Realtime và số
 * yêu cầu là phần đáng tin; độ trễ chỉ là cận dưới.
 */

const PLAYERS = Number(process.env.LOAD_PLAYERS ?? 40);
const SESSIONS = Number(process.env.LOAD_SESSIONS ?? 1);
const QUESTIONS = Number(process.env.LOAD_QUESTIONS ?? 5);
// Học sinh gõ PIN rải rác chứ không đồng thời đến từng mili giây; 0 để thử trường hợp xấu nhất.
// Trên máy thử (Windows + Docker Desktop) cổng 54321 bắt đầu reset kết nối mới khi hơn ~170 kết nối cùng bắn
// hàng trăm yêu cầu mỗi giây (UND_ERR_SOCKET), dù Kong và PostgREST không ghi lỗi. Vượt mức này kịch bản
// chỉ khảo sát và báo số liệu, không còn khẳng định về lỗi hay độ phủ.
const VERIFIED_SOCKETS = 170;
const JOIN_SPREAD_MS = Number(process.env.LOAD_JOIN_SPREAD_MS ?? 3000);

const quizQuestions: QuestionInput[] = [
  { kind: "single", prompt: "Thủ đô của Việt Nam?", time_limit_seconds: 30, options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế" }, { label: "Đà Nẵng" }, { label: "Cần Thơ" }] },
  { kind: "true_false", prompt: "Mặt Trời quay quanh Trái Đất.", time_limit_seconds: 30, options: [{ label: "Đúng" }, { label: "Sai", is_correct: true }] },
  { kind: "multi", prompt: "Những số nào là số chẵn?", time_limit_seconds: 30, options: [{ label: "2", is_correct: true }, { label: "3" }, { label: "4", is_correct: true }, { label: "5" }] },
  { kind: "short_text", prompt: "Con vật kêu meo meo là gì?", time_limit_seconds: 30, accepted_answers: ["con mèo", "mèo"] },
  { kind: "single", prompt: "2 + 2 = ?", time_limit_seconds: 30, options: [{ label: "3" }, { label: "4", is_correct: true }, { label: "5" }] },
].slice(0, QUESTIONS) as QuestionInput[];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clockMs = () => performance.now();

/** Số liệu dùng chung cho mọi phiên chạy đồng thời. */
const metrics = {
  startedAt: 0,
  /** Số yêu cầu HTTP theo giây (tính từ lúc bắt đầu) và theo tên hàm. */
  httpPerSecond: new Map<number, number>(),
  httpByFn: new Map<string, number>(),
  httpErrors: [] as string[],
  rpcLatency: new Map<string, number[]>(),
  /** Tin Realtime theo giây: gửi (giáo viên) và nhận (mọi người chơi + giáo viên). */
  sentPerSecond: new Map<number, number>(),
  receivedPerSecond: new Map<number, number>(),
  receivedByPlayer: [] as number[],
  /** Thời gian từ lúc giáo viên mở câu tới lúc người chơi thấy đề (ms). */
  questionLatency: [] as number[],
  missedQuestions: 0,
  socketsOpen: 0,
  socketsPeak: 0,
  submitFailures: 0,
  notLive: 0,
  socketRetries: 0,
};

const bump = (map: Map<number, number>) => {
  const second = Math.floor((clockMs() - metrics.startedAt) / 1000);
  map.set(second, (map.get(second) ?? 0) + 1);
};

/** `fetch` có đo đếm: mỗi yêu cầu tới Supabase đi qua đây. */
const CONNECTION_CLOSE = process.env.LOAD_CONNECTION_CLOSE === "1";

const instrumentedFetch: typeof fetch = async (input, init) => {
  // Tuỳ chọn: không giữ kết nối sống, để tách lỗi do tái dùng kết nối qua proxy cổng của Docker trên máy thử.
  if (CONNECTION_CLOSE) {
    const headers = new Headers(init?.headers);
    headers.set("Connection", "close");
    init = { ...init, headers };
  }
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const fn = /\/rest\/v1\/rpc\/([a-z_]+)/.exec(url)?.[1] ?? (url.includes("/realtime/") ? "realtime-rest" : "other");
  const began = clockMs();
  bump(metrics.httpPerSecond);
  metrics.httpByFn.set(fn, (metrics.httpByFn.get(fn) ?? 0) + 1);
  try {
    // Trình duyệt tự gửi lại khi máy chủ vừa đóng kết nối giữ sống (keep-alive); undici của Node thì không.
    // Gửi lại đúng một lần để mô phỏng trình duyệt và đếm riêng, không coi là lỗi của ứng dụng.
    const response = await fetch(input, init).catch((error: { cause?: { code?: string } }) => {
      if (error.cause?.code !== "UND_ERR_SOCKET") throw error;
      metrics.socketRetries += 1;
      return fetch(input, init);
    });
    (metrics.rpcLatency.get(fn) ?? metrics.rpcLatency.set(fn, []).get(fn)!).push(clockMs() - began);
    if (response.status >= 400) metrics.httpErrors.push(`${fn} -> ${response.status}`);
    return response;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    metrics.httpErrors.push(`${fn} -> ${(error as Error).message}${cause ? ` (${cause})` : ""}`);
    throw error;
  }
};

function loadClient(key = config.anonKey): SupabaseClient {
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: instrumentedFetch },
    realtime: { params: { eventsPerSecond: 20 } },
  });
}

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

function answerFor(kind: string, options: string[]): AnswerValue {
  if (kind === "short_text") return Math.random() < 0.5 ? "mèo" : "chó";
  if (kind === "multi") return [0, 2];
  return Math.floor(Math.random() * options.length);
}

type Bot = {
  nickname: string;
  supabase: SupabaseClient;
  sync: LiveSync<PlayerState>;
  received: number;
  seen: Set<number>;
};

type ClassSummary = { sessionId: string; joined: number; seenEveryQuestion: number };

/** Mô phỏng một lớp: một giáo viên điều khiển và `PLAYERS` học sinh. */
async function runClass(label: string): Promise<ClassSummary> {
  const teacher = await signUp(`load-${label}`);
  const teacherClient = loadClient();
  await teacherClient.auth.setSession((await teacher.client.auth.getSession()).data.session!);
  const quizId = await buildQuiz(teacher.client, `Quiz tải ${label}`, quizQuestions);
  const created = await host.create(teacherClient, quizId, true);
  if (!created.ok) throw new Error(`create_session: ${created.message}`);
  const { sessionId, pin } = created;

  // Giáo viên: lõi đồng bộ + kênh, như màn hình điều khiển thật.
  const hostChannel = createSessionChannel(teacherClient, sessionId);
  const hostSync = createLiveSync<HostState>({
    fetchState: hostFetcher(teacherClient, sessionId),
    channelFor: (state) => ({
      key: state.id,
      source: (handlers) =>
        hostChannel.source({
          ...handlers,
          onSignal: (seq) => {
            bump(metrics.receivedPerSecond);
            handlers.onSignal(seq);
          },
        }),
    }),
    pollMs: (state) => (state?.status === "ended" ? 0 : 1500),
    livePollMs: 1500,
  });
  hostSync.start();

  const bots: Bot[] = [];
  const questionOpenedAt = new Map<number, number>();

  async function hostAct(run: () => Promise<{ ok: boolean; message?: string }>) {
    const result = await run();
    if (!result.ok) throw new Error(`thao tác của giáo viên lỗi: ${result.message}`);
    await hostSync.refresh();
    const seq = hostSync.getSnapshot().state?.seq;
    if (seq !== undefined) {
      bump(metrics.sentPerSecond);
      await hostChannel.notify(seq);
    }
  }

  // Học sinh vào phòng.
  const joinResults = await Promise.all(
    Array.from({ length: PLAYERS }, async (_, i) => {
      const nickname = `HS${String(i + 1).padStart(2, "0")}`;
      await sleep(Math.random() * JOIN_SPREAD_MS);
      const supabase = loadClient();
      const joined = await player.join(supabase, pin, nickname);
      if (!joined.ok) throw new Error(`join ${nickname}: ${joined.message}`);
      const bot: Bot = { nickname, supabase, received: 0, seen: new Set(), sync: null as unknown as LiveSync<PlayerState> };
      const answered = new Set<number>();
      let leaderboardSeq = -1;
      bot.sync = createLiveSync<PlayerState>({
        fetchState: playerFetcher(supabase, joined.token),
        channelFor: (state) => ({
          key: state.session_id,
          source: (handlers) =>
            createSessionChannel(supabase, state.session_id).source({
              ...handlers,
              onSignal: (seq) => {
                bot.received += 1;
                bump(metrics.receivedPerSecond);
                handlers.onSignal(seq);
              },
            }),
        }),
        pollMs: (state) => pollIntervalForPhase(state?.phase),
      });
      bot.sync.listen(() => {
        const state = bot.sync.getSnapshot().state;
        if (!state) return;
        if (state.phase === "question" && state.question_index !== undefined && state.question && !bot.seen.has(state.question_index)) {
          const index = state.question_index;
          bot.seen.add(index);
          const openedAt = questionOpenedAt.get(index);
          if (openedAt !== undefined) metrics.questionLatency.push(clockMs() - openedAt);
          if (!answered.has(index)) {
            answered.add(index);
            const thinkMs = 500 + Math.random() * 2500;
            const answer = answerFor(state.question.kind, state.question.options);
            setTimeout(async () => {
              const result = await player.submit(supabase, joined.token, answer);
              if (!result.ok) metrics.submitFailures += 1;
            }, thinkMs);
          }
        }
        // Như useLeaderboard: một lần hỏi cho mỗi seq của pha reveal.
        if (state.phase === "reveal" && state.seq !== leaderboardSeq) {
          leaderboardSeq = state.seq;
          void player.leaderboard(supabase, joined.token);
        }
      });
      bot.sync.start();
      bots.push(bot);
      return bot;
    }),
  );
  void joinResults;

  // Chờ mọi người chơi thấy phòng chờ và kênh Realtime đã sống.
  await waitFor(() => bots.every((bot) => bot.sync.getSnapshot().state?.phase === "lobby"), 20_000, "vào phòng chờ");
  await waitFor(() => bots.every((bot) => bot.sync.getSnapshot().status === "live"), 30_000, "kênh Realtime sống").catch((error) => {
    const byStatus: Record<string, number> = {};
    for (const bot of bots) {
      const status = bot.sync.getSnapshot().status;
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }
    process.stderr.write(`Lớp ${label}: không đủ kênh sống: ${JSON.stringify(byStatus)} (${(error as Error).message})
`);
    // Vượt trần 200 kết nối thì phần dư vẫn phải chơi được bằng polling; ghi lại để báo cáo, không dừng.
    metrics.notLive += bots.filter((bot) => bot.sync.getSnapshot().status !== "live").length;
  });
  metrics.socketsOpen += bots.length + 1;
  metrics.socketsPeak = Math.max(metrics.socketsPeak, metrics.socketsOpen);

  for (let index = 1; index <= quizQuestions.length; index += 1) {
    const open = index === 1 ? () => host.open(teacherClient, sessionId) : () => host.next(teacherClient, sessionId);
    questionOpenedAt.set(index, clockMs());
    await hostAct(open);
    // Cho người chơi thời gian suy nghĩ (đáp án đến sau 0,5-3 giây) rồi đóng câu.
    await waitFor(() => bots.every((bot) => bot.seen.has(index)), 15_000, `mọi người thấy câu ${index}`).catch(() => {
      metrics.missedQuestions += bots.filter((bot) => !bot.seen.has(index)).length;
    });
    await sleep(3600);
    await hostAct(() => host.close(teacherClient, sessionId));
    await sleep(1500);
  }
  await hostAct(() => host.end(teacherClient, sessionId));
  await waitFor(() => bots.every((bot) => bot.sync.getSnapshot().state?.phase === "ended"), 20_000, "mọi người thấy kết thúc").catch(() => {});

  const summary: ClassSummary = {
    sessionId,
    joined: bots.length,
    seenEveryQuestion: bots.filter((bot) => bot.seen.size === quizQuestions.length).length,
  };
  metrics.receivedByPlayer.push(...bots.map((bot) => bot.received));
  for (const bot of bots) {
    bot.sync.stop();
    await bot.supabase.removeAllChannels();
  }
  hostSync.stop();
  await teacherClient.removeAllChannels();
  return summary;
}

async function waitFor(condition: () => boolean, timeoutMs: number, what: string) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`quá hạn chờ: ${what}`);
    await sleep(100);
  }
}

function report(sessions: ClassSummary[], elapsedS: number) {
  const seconds = [...new Set([...metrics.sentPerSecond.keys(), ...metrics.receivedPerSecond.keys()])];
  const total = (second: number) => (metrics.sentPerSecond.get(second) ?? 0) + (metrics.receivedPerSecond.get(second) ?? 0);
  const peakMessages = Math.max(0, ...seconds.map(total));
  const totalMessages = seconds.reduce((sum, second) => sum + total(second), 0);
  const peakHttp = Math.max(0, ...metrics.httpPerSecond.values());
  const totalHttp = [...metrics.httpPerSecond.values()].reduce((a, b) => a + b, 0);
  const lat = metrics.questionLatency;
  const row = {
    "số phiên đồng thời": SESSIONS,
    "người chơi mỗi phiên": PLAYERS,
    "số câu": quizQuestions.length,
    "kết nối WebSocket cùng lúc (cao nhất)": metrics.socketsPeak,
    "thời gian chạy (giây)": Math.round(elapsedS),
    "tin Realtime cao nhất / giây (gửi + nhận)": peakMessages,
    "tin Realtime trung bình / giây": Number((totalMessages / Math.max(1, elapsedS)).toFixed(1)),
    "tin nhận trung bình mỗi người chơi": Number((metrics.receivedByPlayer.reduce((a, b) => a + b, 0) / Math.max(1, metrics.receivedByPlayer.length)).toFixed(1)),
    "yêu cầu HTTP cao nhất / giây": peakHttp,
    "yêu cầu HTTP trung bình / giây": Number((totalHttp / Math.max(1, elapsedS)).toFixed(1)),
    "yêu cầu lỗi": metrics.httpErrors.length,
    "yêu cầu gửi lại do kết nối keep-alive bị đóng (như trình duyệt)": metrics.socketRetries,
    "nộp đáp án lỗi": metrics.submitFailures,
    "lượt người-câu không thấy đề": metrics.missedQuestions,
    "người chơi chưa có kênh Realtime sau 30 giây (chơi bằng polling)": metrics.notLive,
    "độ trễ mở câu -> thấy đề, trung vị (ms)": Math.round(percentile(lat, 50)),
    "độ trễ mở câu -> thấy đề, p95 (ms)": Math.round(percentile(lat, 95)),
    "độ trễ mở câu -> thấy đề, lớn nhất (ms)": Math.round(Math.max(...lat)),
    "player_state: số lần gọi": metrics.httpByFn.get("player_state") ?? 0,
    "player_state p95 (ms)": Math.round(percentile(metrics.rpcLatency.get("player_state") ?? [], 95)),
    "submit_answer p95 (ms)": Math.round(percentile(metrics.rpcLatency.get("submit_answer") ?? [], 95)),
  };
  const lines = [`\n=== KẾT QUẢ THỬ TẢI ===\n${JSON.stringify(row, null, 2)}`];
  lines.push(`Yêu cầu theo hàm: ${JSON.stringify(Object.fromEntries(metrics.httpByFn))}`);
  lines.push(`Phiên: ${JSON.stringify(sessions.map((s) => `${s.seenEveryQuestion}/${s.joined} thấy đủ ${quizQuestions.length} câu`))}`);
  if (metrics.httpErrors.length) lines.push(`Lỗi: ${JSON.stringify([...new Set(metrics.httpErrors)].slice(0, 10))}`);
  // Ghi ra stderr và tệp vì vitest ẩn console.log của test đạt.
  const text = `${lines.join("\n")}\n`;
  process.stderr.write(text);
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/load-last.txt", text);
  return { peakMessages, lat };
}

describe(`thử tải: ${SESSIONS} phiên x ${PLAYERS} người chơi`, () => {
  afterAll(async () => {
    await cleanupUsers();
  });

  it("mọi người chơi nhận đủ đề, không lỗi, tin Realtime dưới 100/giây", async () => {
    metrics.startedAt = clockMs();
    const sessions = await Promise.all(Array.from({ length: SESSIONS }, (_, i) => runClass(`l${i + 1}`)));
    const elapsedS = (clockMs() - metrics.startedAt) / 1000;
    const { peakMessages, lat } = report(sessions, elapsedS);

    const verified = SESSIONS * (PLAYERS + 1) <= VERIFIED_SOCKETS;
    if (verified) {
      expect(metrics.httpErrors, "yêu cầu lỗi").toEqual([]);
      expect(metrics.submitFailures, "nộp đáp án lỗi").toBe(0);
      for (const session of sessions) expect(session.seenEveryQuestion, "người chơi thấy đủ mọi câu").toBe(session.joined);
    }
    // Mỗi lần đổi pha chỉ có 1 tin gửi và tối đa một tin nhận mỗi kết nối: không có "bão tin".
    expect(peakMessages, "tin Realtime cao nhất mỗi giây").toBeLessThanOrEqual(SESSIONS * (PLAYERS + 1));
    if (SESSIONS === 1) expect(peakMessages, "một lớp: dưới trần 100 tin/giây của gói Free").toBeLessThan(100);
    if (SESSIONS * (PLAYERS + 1) <= 200) expect(metrics.notLive, "dưới 200 kết nối thì ai cũng có kênh").toBe(0);
    expect(percentile(lat, 95), "p95 độ trễ thấy đề (ms)").toBeLessThan(3000);
  }, 600_000);
});
