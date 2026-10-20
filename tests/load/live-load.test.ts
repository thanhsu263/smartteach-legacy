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
 * LOAD_AUTO=1: phiên tự động qua câu (giáo viên chỉ bấm mở câu đầu; sau đó chỉ làm như màn hình điều khiển thật là nhắc máy chủ
 * đóng câu và mở câu kế khi tới hạn). LOAD_REVEAL (5, 8 hoặc 12; mặc định 8) là số giây hiện đáp án.
 * LOAD_TREASURE=1: phiên kho báu; nửa số học sinh luôn trả lời đúng, nửa luôn sai nên ai cũng nhận rương ở câu 3; 3/4 mở rương
 * ngay khi thấy, 1/4 để máy chủ tự mở.
 *
 * Độ trễ tính từ lúc giáo viên bấm mở câu, nên gồm cả lệnh gọi `host_open_question`, lần đồng bộ lại và tin báo: đây
 * là cận trên của độ trễ truyền tin.
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
const AUTO = process.env.LOAD_AUTO === "1";
const TREASURE = process.env.LOAD_TREASURE === "1";
const REVEAL_SECONDS = Number(process.env.LOAD_REVEAL ?? 8);
// Tự động thì câu phải tự hết giờ nên dùng mức ngắn nhất (10 giây); thủ công thì giáo viên đóng sau ~3,6 giây nên mức dài cũng được.
const LIMIT = AUTO ? 10 : 30;

const quizQuestions: QuestionInput[] = [
  { kind: "single", prompt: "Thủ đô của Việt Nam?", time_limit_seconds: LIMIT, options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế" }, { label: "Đà Nẵng" }, { label: "Cần Thơ" }] },
  { kind: "true_false", prompt: "Mặt Trời quay quanh Trái Đất.", time_limit_seconds: LIMIT, options: [{ label: "Đúng" }, { label: "Sai", is_correct: true }] },
  { kind: "multi", prompt: "Những số nào là số chẵn?", time_limit_seconds: LIMIT, options: [{ label: "2", is_correct: true }, { label: "3" }, { label: "4", is_correct: true }, { label: "5" }] },
  { kind: "short_text", prompt: "Con vật kêu meo meo là gì?", time_limit_seconds: LIMIT, accepted_answers: ["con mèo", "mèo"] },
  { kind: "single", prompt: "2 + 2 = ?", time_limit_seconds: LIMIT, options: [{ label: "3" }, { label: "4", is_correct: true }, { label: "5" }] },
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
  /** Kết nối cần có theo kế hoạch (người chơi + giáo viên) và số kênh Realtime thật sự đã sống. */
  socketsWanted: 0,
  socketsLive: 0,
  submitFailures: 0,
  notLive: 0,
  socketRetries: 0,
  /** Thao tác giáo viên bấm tay (mở câu đầu, đóng, câu kế, kết thúc) và số lần chuyển câu tự động thành công. */
  teacherClicks: 0,
  autoAdvances: 0,
  /** Kho báu: rương học sinh bấm mở, mở lỗi, rương thấy là máy chủ tự mở. */
  chestsOpened: 0,
  chestFailures: 0,
  chestsAutoSeen: 0,
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

/** Chế độ kho báu: đáp án chắc chắn đúng hoặc chắc chắn sai của câu thứ `index` (từ 0) trong `quizQuestions`. */
function fixedAnswerFor(index: number, correct: boolean): AnswerValue {
  const question = quizQuestions[index];
  if (question.kind === "short_text") return correct ? "mèo" : "chó";
  if (question.kind === "multi") return correct ? [0, 2] : [1];
  const right = (question.options ?? []).findIndex((option) => option.is_correct);
  return correct ? right : right === 0 ? 1 : 0;
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
  const created = await host.create(teacherClient, quizId, {
    speedBonus: true,
    ...(AUTO ? { autoAdvance: true, revealSeconds: REVEAL_SECONDS } : {}),
    ...(TREASURE ? { treasureMode: true } : {}),
  });
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

  /** Như `live.act` của màn hình điều khiển: đồng bộ lại rồi báo seq mới cho cả phòng. */
  async function notifyHost() {
    await hostSync.refresh();
    const seq = hostSync.getSnapshot().state?.seq;
    if (seq !== undefined) {
      bump(metrics.sentPerSecond);
      await hostChannel.notify(seq);
    }
  }

  async function hostAct(run: () => Promise<{ ok: boolean; message?: string }>) {
    metrics.teacherClicks += 1;
    const result = await run();
    if (!result.ok) throw new Error(`thao tác của giáo viên lỗi: ${result.message}`);
    await notifyHost();
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
      const chestHandled = new Set<number>();
      const autoChestSeen = new Set<number>();
      // Kho báu: chẵn luôn đúng, lẻ luôn sai (cả hai nhóm đều đạt chuỗi 3 ở câu 3). Chỉ 3/4 số người tự mở rương.
      const alwaysCorrect = i % 2 === 0;
      const opensChest = i % 4 !== 3;
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
            const answer = TREASURE ? fixedAnswerFor(index - 1, alwaysCorrect) : answerFor(state.question.kind, state.question.options);
            setTimeout(async () => {
              const result = await player.submit(supabase, joined.token, answer);
              if (!result.ok) metrics.submitFailures += 1;
            }, thinkMs);
          }
        }
        if (TREASURE) {
          // Rương máy chủ vừa tự mở được báo ở câu kế (pha hỏi, `last_chest`) hoặc khi kết thúc.
          const chestFor = state.question_index ?? 0;
          if (state.phase === "question" && state.last_chest?.status === "opened" && state.last_chest.auto && !autoChestSeen.has(chestFor)) {
            autoChestSeen.add(chestFor);
            metrics.chestsAutoSeen += 1;
          }
          if (state.phase === "reveal" && state.chest?.status === "pending" && opensChest && !chestHandled.has(state.question_index ?? -1)) {
            chestHandled.add(state.question_index ?? -1);
            setTimeout(async () => {
              const result = await player.openChest(supabase, joined.token);
              if (result.ok) metrics.chestsOpened += 1;
              else metrics.chestFailures += 1;
            }, 300 + Math.random() * 900);
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
    process.stderr.write(`Lớp ${label}: không đủ kênh sống: ${JSON.stringify(byStatus)} (${(error as Error).message})\n`);
    // Vượt trần 200 kết nối thì phần dư vẫn phải chơi được bằng polling; ghi lại để báo cáo, không dừng.
    metrics.notLive += bots.filter((bot) => bot.sync.getSnapshot().status !== "live").length;
  });
  // Đếm kênh đã sống thật chứ không cộng theo kế hoạch: vượt trần 200 thì số này nhỏ hơn số cần có.
  metrics.socketsWanted += bots.length + 1;
  metrics.socketsLive += bots.filter((bot) => bot.sync.getSnapshot().status === "live").length + (hostSync.getSnapshot().status === "live" ? 1 : 0);

  if (AUTO) {
    // Giáo viên chỉ bấm mở câu đầu. Sau đó làm đúng việc của màn hình điều khiển: nhắc máy chủ đóng câu khi hết giờ và mở
    // câu kế khi hết thời gian hiện đáp án (máy chủ chỉ làm nếu giờ của nó đã qua hạn).
    questionOpenedAt.set(1, clockMs());
    await hostAct(() => host.open(teacherClient, sessionId));
    const deadline = Date.now() + quizQuestions.length * (LIMIT + REVEAL_SECONDS + 20) * 1000;
    // Như đồng hồ đếm ngược của màn hình điều khiển: chỉ nhắc máy chủ khi tới hạn (tính từ lúc thấy bản trạng thái mới nhất, mỗi bản có giờ máy chủ riêng), không gọi dồn.
    let seenNow = "";
    let seenAt = 0;
    const dueIn = (state: HostState, at: string | null) => (at ? Date.parse(at) - Date.parse(state.server_now) - (clockMs() - seenAt) : 0);
    while (hostSync.getSnapshot().state?.status !== "ended") {
      if (Date.now() > deadline) throw new Error("quá hạn chờ: phiên tự động chưa kết thúc");
      const state = hostSync.getSnapshot().state;
      if (state && state.server_now !== seenNow) {
        seenNow = state.server_now;
        seenAt = clockMs();
      }
      if (state?.status === "question" && dueIn(state, state.closes_at) <= 0) {
        const result = await host.closeIfExpired(teacherClient, sessionId);
        if (result.ok && result.closed) await notifyHost();
      } else if (state?.status === "reveal" && !state.paused && dueIn(state, state.reveal_ends_at) <= 0) {
        const began = clockMs();
        const result = await host.advanceIfDue(teacherClient, sessionId);
        if (result.ok && result.advanced) {
          metrics.autoAdvances += 1;
          questionOpenedAt.set(state.question_index + 1, began);
          await notifyHost();
        }
      }
      await sleep(250);
    }
  } else {
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
      // Kho báu: chừa thời gian để học sinh kịp mở rương (300-1200 ms) trước khi giáo viên sang câu kế; sang sớm hơn thì máy chủ tự mở rương.
      await sleep(TREASURE ? 2500 : 1500);
    }
    await hostAct(() => host.end(teacherClient, sessionId));
  }
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
    "tự động qua câu / kho báu": `${AUTO ? `bật (hiện đáp án ${REVEAL_SECONDS} giây)` : "tắt"} / ${TREASURE ? "bật" : "tắt"}`,
    "thao tác giáo viên bấm tay (cả phiên, mọi lớp)": metrics.teacherClicks,
    "lần máy chủ tự chuyển câu": metrics.autoAdvances,
    "rương học sinh mở / mở lỗi / thấy máy chủ tự mở": `${metrics.chestsOpened} / ${metrics.chestFailures} / ${metrics.chestsAutoSeen}`,
    "kết nối Realtime cần có (người chơi + giáo viên)": metrics.socketsWanted,
    "kết nối Realtime đã sống cùng lúc": metrics.socketsLive,
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
    "độ trễ từ lúc giáo viên bấm mở câu tới khi thấy đề, trung vị (ms)": Math.round(percentile(lat, 50)),
    "độ trễ từ lúc giáo viên bấm mở câu tới khi thấy đề, p95 (ms)": Math.round(percentile(lat, 95)),
    "độ trễ từ lúc giáo viên bấm mở câu tới khi thấy đề, lớn nhất (ms)": Math.round(Math.max(...lat)),
    "player_state: số lần gọi": metrics.httpByFn.get("player_state") ?? 0,
    "player_state p95 (ms)": Math.round(percentile(metrics.rpcLatency.get("player_state") ?? [], 95)),
    "submit_answer p95 (ms)": Math.round(percentile(metrics.rpcLatency.get("submit_answer") ?? [], 95)),
    "open_chest: số lần gọi": metrics.httpByFn.get("open_chest") ?? 0,
    "open_chest p95 (ms)": Math.round(percentile(metrics.rpcLatency.get("open_chest") ?? [], 95)),
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
    if (AUTO && verified) {
      // Mỗi lớp chỉ cần giáo viên bấm đúng một lần (mở câu đầu); mọi lần chuyển câu còn lại do máy chủ (kể cả kết thúc sau câu cuối).
      expect(metrics.teacherClicks, "giáo viên chỉ bấm mở câu đầu").toBe(SESSIONS);
      expect(metrics.autoAdvances, "máy chủ tự chuyển câu").toBe(SESSIONS * quizQuestions.length);
    }
    if (TREASURE && verified) {
      expect(metrics.chestFailures, "mở rương lỗi").toBe(0);
      expect(metrics.chestsOpened, "có rương được mở").toBeGreaterThan(0);
      // Câu 3 phát rương cho mọi người; 3/4 tự mở, 1/4 để máy chủ tự mở (thấy ở câu kế hoặc lúc kết thúc).
      expect(metrics.chestsAutoSeen, "có rương do máy chủ tự mở").toBeGreaterThan(0);
      if (metrics.rpcLatency.get("open_chest")) expect(percentile(metrics.rpcLatency.get("open_chest")!, 95), "open_chest p95 (ms)").toBeLessThan(100);
    }
    expect(percentile(lat, 95), "p95 độ trễ thấy đề (ms)").toBeLessThan(3000);
  }, 600_000);
});
