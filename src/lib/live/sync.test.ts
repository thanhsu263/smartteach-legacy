import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runHostAction } from "./use-live-state";
import {
  createLiveSync,
  pollIntervalForPhase,
  type FetchOutcome,
  type SignalHandlers,
  type SignalSource,
  type SyncState,
} from "./sync";

type State = SyncState & { phase: string; n?: number };

const at = (ms: number) => new Date(ms).toISOString();

/** Trạng thái giả với seq, pha và giờ máy chủ bằng đúng giờ (giả) hiện tại. */
const state = (seq: number, phase = "question", n = 0): State => ({ seq, phase, n, server_now: at(Date.now()) });

/** Kênh giả: cho test tự bắn tin, đổi trạng thái kết nối và đếm số lần đăng ký/huỷ. */
function fakeChannel() {
  const handlers: SignalHandlers[] = [];
  let subscribed = 0;
  let unsubscribed = 0;
  const source: SignalSource = (h) => {
    handlers.push(h);
    subscribed += 1;
    return () => {
      unsubscribed += 1;
      handlers.splice(handlers.indexOf(h), 1);
    };
  };
  return {
    source,
    signal: (seq: number | null) => handlers.forEach((h) => h.onSignal(seq)),
    status: (s: "subscribed" | "closed") => handlers.forEach((h) => h.onStatus(s)),
    get subscribed() {
      return subscribed;
    },
    get unsubscribed() {
      return unsubscribed;
    },
    get active() {
      return handlers.length;
    },
  };
}

/** Nguồn trạng thái giả trả lần lượt các kết quả cho trước (lặp lại kết quả cuối). */
function fakeFetch(...outcomes: (FetchOutcome<State> | (() => Promise<FetchOutcome<State>>))[]) {
  let calls = 0;
  const fn = vi.fn(async () => {
    const next = outcomes[Math.min(calls, outcomes.length - 1)];
    calls += 1;
    return typeof next === "function" ? next() : next;
  });
  return fn;
}

const ok = (s: State): FetchOutcome<State> => ({ ok: true, state: s });
const bad = (message = "lỗi mạng", fatal = false): FetchOutcome<State> => ({ ok: false, message, fatal });

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createLiveSync: hỏi và nhận tin báo", () => {
  it("hỏi ngay khi bắt đầu rồi đăng ký kênh theo trạng thái nhận được", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(1)));
    const channelFor = vi.fn(() => ({ key: "s1", source: channel.source }));
    const sync = createLiveSync({ fetchState, channelFor });
    sync.start();
    await tick(0);
    expect(fetchState).toHaveBeenCalledTimes(1);
    expect(sync.getSnapshot().state?.seq).toBe(1);
    expect(channel.subscribed).toBe(1);
    sync.stop();
  });

  it("nhận tin báo có seq mới thì hỏi lại ngay, không chờ polling", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(1)), ok(state(1)), ok(state(2, "reveal")));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 60_000, livePollMs: 60_000 });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(1000);
    const callsBefore = fetchState.mock.calls.length;
    channel.signal(2);
    await tick(0);
    expect(fetchState.mock.calls.length).toBe(callsBefore + 1);
    expect(sync.getSnapshot().state?.seq).toBe(2);
    expect(sync.getSnapshot().status).toBe("live");
    sync.stop();
  });

  it("bỏ qua tin báo cũ hoặc trùng seq đã có", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(5)));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 60_000, livePollMs: 60_000 });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(1000);
    const calls = fetchState.mock.calls.length;
    channel.signal(5);
    channel.signal(3);
    await tick(2000);
    expect(fetchState.mock.calls.length).toBe(calls);
    sync.stop();
  });

  it("tin báo hỏng (không có seq) vẫn chỉ là gợi ý hỏi lại", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(1)));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 60_000, livePollMs: 60_000 });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(1000);
    const calls = fetchState.mock.calls.length;
    channel.signal(null);
    await tick(0);
    expect(fetchState.mock.calls.length).toBe(calls + 1);
    sync.stop();
  });

  it("một client độc hại gửi tin giả dồn dập chỉ gây tối đa một lần hỏi mỗi khoảng chờ tối thiểu", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(1)));
    const sync = createLiveSync({
      fetchState,
      channelFor: () => ({ key: "s", source: channel.source }),
      pollMs: () => 600_000,
      livePollMs: 600_000,
      minSignalGapMs: 500,
    });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(1000);
    const calls = fetchState.mock.calls.length;
    // 1000 tin giả với seq tăng dần trong 1 giây.
    for (let i = 0; i < 1000; i++) {
      channel.signal(1000 + i);
      await tick(1);
    }
    // Cửa sổ 1 giây + khoảng chờ 500ms: không quá vài lần hỏi.
    expect(fetchState.mock.calls.length - calls).toBeLessThanOrEqual(4);
    sync.stop();
  });

  it("tin báo đến lúc đang hỏi thì hỏi thêm đúng một lần sau khi lần hiện tại xong", async () => {
    const channel = fakeChannel();
    let release: (value: FetchOutcome<State>) => void = () => {};
    const slow = () => new Promise<FetchOutcome<State>>((resolve) => (release = resolve));
    const fetchState = fakeFetch(ok(state(1)), slow, ok(state(3)));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 600_000, livePollMs: 600_000 });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(1000);
    void sync.refresh(); // lần hỏi chậm đang bay
    await tick(0);
    channel.signal(2);
    channel.signal(3);
    expect(fetchState).toHaveBeenCalledTimes(2); // ban đầu và lần chậm; hai tin chưa gây lần hỏi nào
    release(ok(state(2)));
    await tick(600);
    expect(sync.getSnapshot().state?.seq).toBe(3);
    sync.stop();
  });
});

describe("createLiveSync: polling dự phòng", () => {
  it("không có kênh thì hỏi định kỳ theo pha (3 giây khi đang hỏi)", async () => {
    const fetchState = fakeFetch(ok(state(1)));
    const sync = createLiveSync({ fetchState, pollMs: (s) => pollIntervalForPhase(s?.phase) });
    sync.start();
    await tick(0);
    expect(fetchState).toHaveBeenCalledTimes(1);
    await tick(2999);
    expect(fetchState).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(fetchState).toHaveBeenCalledTimes(2);
    await tick(3000);
    expect(fetchState).toHaveBeenCalledTimes(3);
    expect(sync.getSnapshot().status).toBe("polling");
    sync.stop();
  });

  it("kênh sống thì hỏi thưa hơn (dự phòng), kênh chết thì hỏi dày lại và vẫn đồng bộ được", async () => {
    const channel = fakeChannel();
    let seq = 1;
    const fetchState = vi.fn(async () => ok(state(seq)));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 3000, livePollMs: 10_000 });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(0);
    const afterConnect = fetchState.mock.calls.length;
    await tick(9000);
    expect(fetchState.mock.calls.length).toBe(afterConnect); // chưa tới 10 giây
    await tick(1000);
    expect(fetchState.mock.calls.length).toBe(afterConnect + 1);
    expect(sync.getSnapshot().status).toBe("live");

    // Kênh chết và mất tin: trạng thái vẫn theo kịp nhờ polling 3 giây.
    channel.status("closed");
    seq = 7;
    await tick(3000);
    expect(sync.getSnapshot().state?.seq).toBe(7);
    expect(sync.getSnapshot().status).toBe("polling");
    sync.stop();
  });

  it("kênh sống lại sau khi mất thì hỏi lại ngay để bù tin đã lỡ", async () => {
    const channel = fakeChannel();
    let seq = 1;
    const fetchState = vi.fn(async () => ok(state(seq)));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 600_000, livePollMs: 600_000 });
    sync.start();
    await tick(0);
    channel.status("subscribed");
    await tick(0);
    channel.status("closed");
    seq = 4; // tin đã lỡ
    channel.status("subscribed");
    await tick(0);
    expect(sync.getSnapshot().state?.seq).toBe(4);
    sync.stop();
  });

  it("lỗi mạng liên tiếp thì giãn dần khoảng hỏi, báo offline, rồi phục hồi", async () => {
    const outcomes: FetchOutcome<State>[] = [ok(state(1)), bad(), bad(), bad(), ok(state(2))];
    const fetchState = fakeFetch(...outcomes);
    const sync = createLiveSync({ fetchState, pollMs: () => 3000, maxBackoffMs: 30_000 });
    sync.start();
    await tick(0);
    expect(sync.getSnapshot().status).toBe("polling");

    await tick(3000); // lỗi 1 -> chờ 6 giây
    expect(fetchState).toHaveBeenCalledTimes(2);
    expect(sync.getSnapshot().status).toBe("polling");
    expect(sync.getSnapshot().error).toBe("lỗi mạng");
    await tick(5999);
    expect(fetchState).toHaveBeenCalledTimes(2);
    await tick(1); // lỗi 2 -> offline, chờ 12 giây
    expect(fetchState).toHaveBeenCalledTimes(3);
    expect(sync.getSnapshot().status).toBe("offline");
    await tick(11_999);
    expect(fetchState).toHaveBeenCalledTimes(3);
    await tick(1); // lỗi 3 -> chờ 24 giây
    expect(fetchState).toHaveBeenCalledTimes(4);
    await tick(24_000); // phục hồi
    expect(fetchState).toHaveBeenCalledTimes(5);
    expect(sync.getSnapshot()).toMatchObject({ status: "polling", error: null });
    expect(sync.getSnapshot().state?.seq).toBe(2);
    // Hết lỗi thì quay lại nhịp 3 giây.
    await tick(3000);
    expect(fetchState).toHaveBeenCalledTimes(6);
    sync.stop();
  });

  it("khoảng giãn không vượt mức trần", async () => {
    const fetchState = fakeFetch(bad());
    const sync = createLiveSync({ fetchState, pollMs: () => 3000, maxBackoffMs: 10_000 });
    sync.start();
    await tick(0);
    for (let i = 0; i < 6; i++) await tick(10_000);
    const calls = fetchState.mock.calls.length;
    await tick(10_000);
    expect(fetchState.mock.calls.length).toBe(calls + 1);
    sync.stop();
  });

  it("lỗi ném ra từ fetchState cũng được coi là lỗi mạng chứ không làm treo vòng hỏi", async () => {
    const fetchState = vi
      .fn<() => Promise<FetchOutcome<State>>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(ok(state(1)));
    const sync = createLiveSync({ fetchState, pollMs: () => 1000 });
    sync.start();
    await tick(0);
    expect(sync.getSnapshot().error).toMatch(/Mất kết nối/);
    await tick(2000);
    expect(sync.getSnapshot().state?.seq).toBe(1);
    sync.stop();
  });
});

describe("createLiveSync: thứ tự và trạng thái cuối", () => {
  it("không để trạng thái cũ ghi đè trạng thái mới (seq nhỏ hơn bị bỏ)", async () => {
    const fetchState = fakeFetch(ok(state(5, "question", 1)), ok(state(3, "lobby", 2)), ok(state(5, "question", 3)));
    const sync = createLiveSync({ fetchState, pollMs: () => 1000 });
    sync.start();
    await tick(0);
    await tick(1000); // nhận seq 3: bỏ
    expect(sync.getSnapshot().state).toMatchObject({ seq: 5, n: 1 });
    await tick(1000); // cùng seq 5 nhưng dữ liệu mới: nhận
    expect(sync.getSnapshot().state).toMatchObject({ seq: 5, n: 3 });
    sync.stop();
  });

  it("trạng thái cuối cùng thì ngừng hỏi và nhả kênh Realtime", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(1)), ok(state(2, "ended")));
    const sync = createLiveSync({
      fetchState,
      channelFor: () => ({ key: "s", source: channel.source }),
      pollMs: (s) => pollIntervalForPhase(s?.phase),
    });
    sync.start();
    await tick(0);
    expect(channel.active).toBe(1);
    await tick(3000);
    expect(sync.getSnapshot().state?.phase).toBe("ended");
    expect(channel.active).toBe(0);
    const calls = fetchState.mock.calls.length;
    await tick(60_000);
    expect(fetchState.mock.calls.length).toBe(calls);
    sync.stop();
  });

  it("lỗi không thể tự khỏi (mã tham gia hỏng) thì ngừng hỏi và báo fatal", async () => {
    const fetchState = fakeFetch(bad("Mã tham gia không còn hiệu lực.", true));
    const sync = createLiveSync({ fetchState, pollMs: () => 1000 });
    sync.start();
    await tick(0);
    expect(sync.getSnapshot()).toMatchObject({ fatal: true, error: "Mã tham gia không còn hiệu lực." });
    await tick(120_000);
    expect(fetchState).toHaveBeenCalledTimes(1);
    sync.stop();
  });

  it("đổi kênh khi id phiên đổi và giữ nguyên khi cùng id", async () => {
    const a = fakeChannel();
    const b = fakeChannel();
    let key = "a";
    const fetchState = vi.fn(async () => ok(state(1)));
    const sync = createLiveSync({
      fetchState,
      channelFor: () => (key === "a" ? { key, source: a.source } : { key, source: b.source }),
      pollMs: () => 1000,
    });
    sync.start();
    await tick(0);
    await tick(1000);
    expect(a.subscribed).toBe(1);
    key = "b";
    await tick(1000);
    expect(a.active).toBe(0);
    expect(b.active).toBe(1);
    sync.stop();
  });
});

describe("createLiveSync: vòng đời và đồng hồ", () => {
  it("stop rồi start lại (StrictMode) chạy lại bình thường và bỏ kết quả của lần hỏi cũ", async () => {
    const channel = fakeChannel();
    let release: (value: FetchOutcome<State>) => void = () => {};
    const fetchState = fakeFetch(() => new Promise<FetchOutcome<State>>((resolve) => (release = resolve)), ok(state(9)));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 1000 });
    sync.start();
    sync.stop();
    sync.start();
    await tick(0);
    release(ok(state(1))); // kết quả của lần hỏi thuộc vòng đời cũ
    await tick(0);
    expect(sync.getSnapshot().state?.seq).toBe(9);
    sync.stop();
    expect(channel.active).toBe(0);
  });

  it("sau stop không còn hỏi và không gọi người nghe nữa", async () => {
    const fetchState = fakeFetch(ok(state(1)));
    const sync = createLiveSync({ fetchState, pollMs: () => 1000 });
    const listener = vi.fn();
    sync.listen(listener);
    sync.start();
    await tick(0);
    sync.stop();
    const calls = fetchState.mock.calls.length;
    const notified = listener.mock.calls.length;
    await tick(10_000);
    expect(fetchState.mock.calls.length).toBe(calls);
    expect(listener.mock.calls.length).toBe(notified);
  });

  it("snapshot giữ nguyên tham chiếu khi không có gì đổi (tránh render thừa)", async () => {
    const fetchState = fakeFetch(ok(state(1)));
    const sync = createLiveSync({ fetchState, pollMs: () => 1000 });
    sync.start();
    await tick(0);
    const first = sync.getSnapshot();
    await tick(0);
    expect(sync.getSnapshot()).toBe(first);
    sync.stop();
  });

  it("ước lượng độ lệch đồng hồ từ server_now để thanh đếm giờ khớp máy chủ", async () => {
    // Máy chủ nhanh hơn máy khách 5 giây, độ trễ khứ hồi 200ms.
    const fetchState = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return ok({ seq: 1, phase: "question", server_now: at(Date.now() + 5000) });
    });
    const sync = createLiveSync({ fetchState, pollMs: () => 600_000 });
    sync.start();
    await tick(250);
    const { clock } = sync.getSnapshot();
    expect(clock.offsetMs()).toBeGreaterThan(4800);
    expect(clock.offsetMs()).toBeLessThan(5200);
    const deadline = Date.now() + 5000 + 20_000; // hạn chót theo giờ máy chủ: còn ~20 giây
    expect(Math.round(clock.remainingMs(deadline) / 1000)).toBe(20);
    sync.stop();
  });
});

describe("createLiveSync: refresh() chờ lần hỏi bắt đầu sau lệnh gọi", () => {
  /** Máy chủ giả: mỗi lần hỏi đọc seq ngay lúc bắt đầu nhưng chỉ trả về khi test cho phép. */
  function slowServer() {
    const server = { seq: 1 };
    const pending: (() => void)[] = [];
    const fetchState = vi.fn(
      () =>
        new Promise<FetchOutcome<State>>((resolve) => {
          const read = { seq: server.seq, phase: "question", server_now: at(Date.now()) };
          pending.push(() => resolve({ ok: true, state: read }));
        }),
    );
    return { server, fetchState, answer: () => pending.shift()?.(), waiting: () => pending.length };
  }

  it("đang có lần hỏi bay thì refresh() chờ lần hỏi kế tiếp, nên thấy được thao tác vừa commit", async () => {
    const s = slowServer();
    const sync = createLiveSync({ fetchState: s.fetchState, pollMs: () => 600_000 });
    sync.start();
    s.answer(); // lần hỏi đầu xong với seq 1
    await tick(0);
    void sync.refresh(); // lần hỏi định kỳ đang bay, đã đọc seq 1
    await tick(0);
    s.server.seq = 2; // giáo viên vừa thao tác xong

    let done = false;
    const refreshed = sync.refresh().then(() => (done = true));
    await tick(0);
    s.answer(); // lần bay cũ trả về seq 1
    await tick(0);
    expect(done).toBe(false); // chưa được xong chỉ vì lần hỏi cũ
    expect(sync.getSnapshot().state?.seq).toBe(1);
    s.answer(); // lần hỏi mới (bắt đầu sau lệnh gọi) đọc seq 2
    await refreshed;
    expect(sync.getSnapshot().state?.seq).toBe(2);
    sync.stop();
  });

  it("nhiều lệnh refresh() dồn lại dùng chung một lần hỏi kế tiếp", async () => {
    const s = slowServer();
    const sync = createLiveSync({ fetchState: s.fetchState, pollMs: () => 600_000 });
    sync.start();
    s.answer();
    await tick(0);
    void sync.refresh();
    await tick(0);
    const all = Promise.all([sync.refresh(), sync.refresh(), sync.refresh()]);
    s.answer();
    await tick(0);
    s.answer();
    await all;
    expect(s.fetchState).toHaveBeenCalledTimes(3);
    sync.stop();
  });

  it("runHostAction với lõi đồng bộ thật báo đúng seq mới dù có lần hỏi định kỳ đang bay", async () => {
    const s = slowServer();
    const sync = createLiveSync({ fetchState: s.fetchState, pollMs: () => 600_000 });
    sync.start();
    s.answer();
    await tick(0);
    void sync.refresh();
    await tick(0); // lần hỏi định kỳ đang bay, đã đọc seq 1

    const notified: number[] = [];
    const acting = runHostAction(
      sync as unknown as Parameters<typeof runHostAction>[0],
      { notify: async (seq) => void notified.push(seq) },
      async () => {
        s.server.seq = 2; // thao tác của giáo viên commit
        return { ok: true };
      },
    );
    await tick(0);
    s.answer(); // lần bay cũ: seq 1
    await tick(0);
    s.answer(); // lần hỏi sau thao tác: seq 2
    await acting;
    expect(notified).toEqual([2]);
    sync.stop();
  });

  it("refresh() khi đang dừng trả về ngay; dừng giữa chừng cũng gỡ người đang chờ", async () => {
    const s = slowServer();
    const sync = createLiveSync({ fetchState: s.fetchState, pollMs: () => 600_000 });
    await expect(sync.refresh()).resolves.toBeUndefined(); // chưa start
    sync.start();
    const waiting = sync.refresh();
    sync.stop();
    await expect(waiting).resolves.toBeUndefined();
    s.answer(); // kết quả của vòng đời cũ
    await tick(0);
    await expect(sync.refresh()).resolves.toBeUndefined();
  });

  it("lỗi không thể tự khỏi thì nhả kênh Realtime ngay", async () => {
    const channel = fakeChannel();
    const fetchState = fakeFetch(ok(state(1)), bad("Mã tham gia không còn hiệu lực.", true));
    const sync = createLiveSync({ fetchState, channelFor: () => ({ key: "s", source: channel.source }), pollMs: () => 1000 });
    sync.start();
    await tick(0);
    expect(channel.active).toBe(1);
    await tick(1000);
    expect(sync.getSnapshot().fatal).toBe(true);
    expect(channel.active).toBe(0);
    sync.stop();
  });
});

describe("pollIntervalForPhase", () => {
  it("phòng chờ và đang hỏi 3 giây, hiện đáp án chậm hơn, kết thúc hoặc bị loại thì ngừng", () => {
    expect(pollIntervalForPhase("lobby")).toBe(3000);
    expect(pollIntervalForPhase("question")).toBe(3000);
    expect(pollIntervalForPhase(undefined)).toBe(3000);
    expect(pollIntervalForPhase("reveal")).toBe(5000);
    expect(pollIntervalForPhase("ended")).toBe(0);
    expect(pollIntervalForPhase("removed")).toBe(0);
  });
});
