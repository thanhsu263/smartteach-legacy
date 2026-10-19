import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSessionChannel, SIGNAL_EVENT, channelName } from "@/lib/live/channel";
import { hostFetcher, playerFetcher } from "@/lib/live/rpc";
import { createLiveSync, type LiveSync } from "@/lib/live/sync";
import type { HostState, PlayerState } from "@/lib/live/types";
import { cleanupUsers, newClient, signUp, type TestUser } from "./helpers";
import { hostOk, joinOk, newQuiz, sleep, startSession } from "./live-helpers";

/**
 * Tích hợp với Realtime thật của stack Supabase cục bộ (cần `[realtime] enabled = true`):
 * giáo viên báo `{ seq }` trên kênh `session:<id>`, người chơi nhận và hỏi trạng thái từ Postgres.
 * Chứng minh hai đường: tin báo (khi polling bị đặt rất thưa) và polling (khi kênh bị phá).
 */

async function waitFor(predicate: () => boolean, timeoutMs: number, label: string) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(`Hết ${timeoutMs}ms chờ: ${label}`);
    await sleep(20);
  }
  return Date.now() - started;
}

type Player = {
  name: string;
  client: SupabaseClient;
  token: string;
  sync: LiveSync<PlayerState>;
  fetches: number;
};

let teacher: TestUser;
let session: { id: string; pin: string };
const players: Player[] = [];
let hostSync: LiveSync<HostState>;
let teacherChannel: ReturnType<typeof createSessionChannel>;

function makePlayer(name: string, token: string, pollMs: number): Player {
  const client = newClient();
  const player: Player = { name, client, token, fetches: 0, sync: null as unknown as LiveSync<PlayerState> };
  const fetcher = playerFetcher(client, token);
  player.sync = createLiveSync<PlayerState>({
    fetchState: async () => {
      player.fetches += 1;
      return fetcher();
    },
    channelFor: (state) => ({ key: state.session_id, source: createSessionChannel(client, state.session_id).source }),
    // Kênh sống thì gần như không hỏi (để chứng minh tin báo mới là đường chạy); kênh chết thì hỏi dày.
    pollMs: (state) => (state?.phase === "ended" ? 0 : pollMs),
    livePollMs: 600_000,
    minSignalGapMs: 50,
  });
  return player;
}

beforeAll(async () => {
  teacher = await signUp("rt-teacher");
  session = await startSession(teacher, await newQuiz(teacher));
  for (const name of ["An", "Bình", "Châu"]) {
    const token = await joinOk(session.pin, name);
    players.push(makePlayer(name, token, 400));
  }

  // Giáo viên: nghe và báo trên cùng kênh.
  teacherChannel = createSessionChannel(teacher.client, session.id);
  hostSync = createLiveSync<HostState>({
    fetchState: hostFetcher(teacher.client, session.id),
    channelFor: (state) => ({ key: state.id, source: teacherChannel.source }),
    pollMs: () => 600_000,
    livePollMs: 600_000,
  });
}, 60_000);

afterAll(async () => {
  for (const p of players) {
    p.sync.stop();
    await p.client.removeAllChannels();
  }
  hostSync?.stop();
  await teacher?.client.removeAllChannels();
  await cleanupUsers();
});

/** Giáo viên làm một thao tác rồi báo seq mới, đúng như `runHostAction`. */
async function teacherActs(fn: string) {
  await hostOk(teacher, fn, { p_session: session.id });
  await hostSync.refresh();
  const seq = hostSync.getSnapshot().state?.seq as number;
  await teacherChannel.notify(seq);
  return seq;
}

describe("4.6 Realtime thật: tin báo và polling dự phòng", () => {
  it("cả ba người chơi vào được kênh và thấy phòng chờ", async () => {
    hostSync.start();
    for (const p of players) p.sync.start();
    await waitFor(() => players.every((p) => p.sync.getSnapshot().status === "live"), 10_000, "ba người chơi sống kênh");
    await waitFor(() => hostSync.getSnapshot().status === "live", 10_000, "giáo viên sống kênh");
    for (const p of players) expect(p.sync.getSnapshot().state?.phase).toBe("lobby");

    // Khởi động nguội: kênh báo SUBSCRIBED nhưng máy chủ Realtime có thể chưa định tuyến tin ngay. Gửi tin
    // khởi động (seq lớn hơn mọi seq thật nên chắc chắn gây một lần hỏi) tới khi ai cũng nhận được.
    const base = players.map((p) => p.fetches);
    await waitFor(
      () => {
        void teacherChannel.notify(1_000_000);
        return players.every((p, i) => p.fetches > base[i]);
      },
      10_000,
      "mọi người chơi nhận được tin khởi động",
    );
  }, 30_000);

  it("giáo viên mở câu: cả ba nhận tin báo và lấy được đề (không chờ polling)", async () => {
    const before = players.map((p) => p.fetches);
    const started = Date.now();
    await teacherActs("host_open_question");
    const waited = await waitFor(
      () => players.every((p) => p.sync.getSnapshot().state?.phase === "question"),
      5000,
      "người chơi thấy câu hỏi",
    );
    for (const p of players) {
      const state = p.sync.getSnapshot().state as PlayerState;
      expect(state.question?.prompt).toBe("Thủ đô của Việt Nam là gì?");
      expect(state.question?.options).toEqual(["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"]);
      expect(JSON.stringify(state)).not.toContain("is_correct");
      expect(p.sync.getSnapshot().status).toBe("live");
    }
    // Chỉ cần một vài lần hỏi (không phải polling liên tục), và nhanh hơn nhiều so với nhịp polling 400ms x vài vòng.
    expect(Math.max(...players.map((p, i) => p.fetches - before[i]))).toBeLessThanOrEqual(2);
    console.log(`Tin báo tới cả ba người chơi sau ${Date.now() - started}ms (chờ ${waited}ms)`);
  }, 30_000);

  it("người chơi sai mã tham gia không lấy được trạng thái và bị báo mã hỏng", async () => {
    const intruder = makePlayer("Kẻ lạ", crypto.randomUUID(), 400);
    intruder.sync.start();
    await waitFor(() => intruder.sync.getSnapshot().fatal, 5000, "báo mã hỏng");
    expect(intruder.sync.getSnapshot().state).toBeNull();
    expect(intruder.sync.getSnapshot().error).toMatch(/Mã tham gia/);
    intruder.sync.stop();
    await intruder.client.removeAllChannels();
  }, 20_000);

  it("tin giả từ client độc hại chỉ làm thêm vài lần hỏi và không đổi được trạng thái", async () => {
    const attacker = newClient();
    const channel = attacker.channel(channelName(session.id), { config: { broadcast: { self: false } } });
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
      });
    });
    const before = players.map((p) => p.fetches);
    const phases = players.map((p) => p.sync.getSnapshot().state?.phase);
    const started = Date.now();
    for (let i = 0; i < 200; i++) {
      await channel.send({ type: "broadcast", event: SIGNAL_EVENT, payload: { seq: 100_000 + i, phase: "ended", answer: "Hà Nội" } });
    }
    await sleep(1500);
    // 200 tin giả: số lần hỏi bị chặn theo khoảng chờ tối thiểu (50ms) chứ không theo số tin.
    const allowed = Math.ceil((Date.now() - started) / 50) + 3;
    expect(allowed).toBeLessThan(200);
    for (const [i, p] of players.entries()) {
      expect(p.fetches - before[i], p.name).toBeLessThanOrEqual(allowed);
      expect(p.sync.getSnapshot().state?.phase, p.name).toBe(phases[i]);
    }
    await attacker.removeAllChannels();
  }, 30_000);

  it("kênh của một người chơi bị phá thì người đó vẫn theo kịp nhờ polling, những người còn lại vẫn nhận tin", async () => {
    const victim = players[1];
    // Phá kênh: đóng hẳn socket Realtime của người chơi này.
    await victim.client.realtime.disconnect();
    await waitFor(() => victim.sync.getSnapshot().status !== "live", 10_000, "phát hiện kênh chết");

    await teacherActs("host_close_question");
    await waitFor(() => players.every((p) => p.sync.getSnapshot().state?.phase === "reveal"), 6000, "mọi người thấy hiện đáp án");

    for (const p of players) {
      const state = p.sync.getSnapshot().state as PlayerState;
      expect(state.key).toEqual({ correct: [0] });
      expect(state.phase).toBe("reveal");
    }
    // Người bị phá kênh đã phải dùng polling.
    expect(victim.sync.getSnapshot().status).not.toBe("live");
    expect(victim.fetches).toBeGreaterThan(2);
  }, 30_000);

  it("không có trạng thái cũ ghi đè trạng thái mới khi tin báo và polling chen nhau", async () => {
    for (const fn of ["host_next", "host_close_question", "host_next", "host_close_question"]) {
      await teacherActs(fn);
      await sleep(80);
    }
    const target = hostSync.getSnapshot().state as HostState;
    await waitFor(() => players.every((p) => p.sync.getSnapshot().state?.seq === target.seq), 8000, "mọi người theo kịp seq cuối");
    for (const p of players) {
      expect(p.sync.getSnapshot().state?.question_index).toBe(3);
      expect(p.sync.getSnapshot().state?.phase).toBe("reveal");
    }
  }, 40_000);

  it("kết thúc phiên: người chơi thấy 'ended' rồi ngừng hỏi", async () => {
    await teacherActs("host_end_session");
    await waitFor(() => players.every((p) => p.sync.getSnapshot().state?.phase === "ended"), 8000, "mọi người thấy kết thúc");
    const calls = players.map((p) => p.fetches);
    await sleep(1500);
    expect(players.map((p) => p.fetches)).toEqual(calls);
  }, 30_000);
});
