import { describe, expect, it, vi } from "vitest";
import { createSessionChannel, channelName, parseSignal, SIGNAL_EVENT } from "./channel";
import { describeJoinCode, describeLiveError, isFatalPlayerError } from "./errors";
import { host, player, playerFetcher } from "./rpc";
import { clearPlayer, loadPlayer, savePlayer } from "./storage";
import { createServerClock, parseServerTime } from "./clock";
import { attachWakeListeners } from "./wake";
import { hostPollMs, runHostAction } from "./use-live-state";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("describeLiveError", () => {
  it("đổi mọi mã lỗi nghiệp vụ sang tiếng Việt, không lộ thông báo kỹ thuật", () => {
    const codes = [
      "invalid_token", "answer_closed", "already_answered", "participant_removed", "invalid_answer",
      "session_already_active", "quiz_not_playable", "quiz_not_found", "pin_unavailable", "session_not_found",
      "session_ended", "invalid_transition", "participant_not_found", "not_authenticated",
    ];
    for (const code of codes) {
      const text = describeLiveError({ message: code });
      expect(text, code).not.toContain("_");
      expect(text, code).toMatch(/[ăâêôơưđáàảãạ]|[A-Z]/);
      expect(text, code).not.toBe(describeLiveError({ message: "không rõ" }));
    }
  });

  it("các tình huống người dùng hay gặp có lời nhắn rõ ràng", () => {
    expect(describeLiveError({ message: "answer_closed" })).toContain("Hết giờ");
    expect(describeLiveError({ message: "already_answered" })).toContain("đã trả lời");
    expect(describeLiveError({ message: "participant_removed" })).toContain("rời phòng");
    expect(describeLiveError({ message: "TypeError: Failed to fetch" })).toContain("Mất kết nối");
    expect(describeLiveError({ code: "42501", message: "permission denied for function host_state" })).toContain("đăng nhập");
  });

  it("lỗi lạ hoặc rỗng cho lời nhắn chung, không lộ nội dung gốc", () => {
    expect(describeLiveError({ message: 'relation "live_sessions" does not exist' })).toBe("Có lỗi xảy ra. Bạn thử lại nhé.");
    expect(describeLiveError(null)).toBe("Có lỗi xảy ra. Bạn thử lại nhé.");
  });

  it("mã kết quả vào phòng: PIN sai, phiên khoá, trùng biệt danh, đã bắt đầu, đầy phòng, thử quá nhiều", () => {
    expect(describeJoinCode("invalid_pin")).toContain("PIN");
    expect(describeJoinCode("room_locked")).toContain("khoá");
    expect(describeJoinCode("nickname_taken")).toContain("Biệt danh");
    expect(describeJoinCode("session_started")).toContain("bắt đầu");
    expect(describeJoinCode("room_full")).toContain("đủ người");
    expect(describeJoinCode("lạ")).toBe("Có lỗi xảy ra. Bạn thử lại nhé.");
  });

  it("chỉ mã tham gia hỏng hẳn mới là lỗi không thể tự khỏi", () => {
    expect(isFatalPlayerError({ message: "invalid_token" })).toBe(true);
    expect(isFatalPlayerError({ message: "participant_removed" })).toBe(true);
    expect(isFatalPlayerError({ message: "answer_closed" })).toBe(false);
    expect(isFatalPlayerError({ message: "Failed to fetch" })).toBe(false);
  });
});

describe("clock", () => {
  it("dùng mẫu có độ trễ khứ hồi thấp nhất làm độ lệch", () => {
    const clock = createServerClock(() => 100_000);
    clock.sample(106_000, 99_000, 101_000); // rtt 2000, offset 6000
    clock.sample(105_000, 99_950, 100_050); // rtt 100, offset 5000
    expect(clock.offsetMs()).toBe(5000);
    expect(clock.now()).toBe(105_000);
    expect(clock.remainingMs(110_000)).toBe(5000);
    expect(clock.remainingMs(90_000)).toBe(0);
  });

  it("đọc giờ Postgres: 6 chữ số thập phân, dấu cách, múi giờ viết tắt và không có múi giờ", () => {
    const base = Date.parse("2026-10-19T12:02:54.458Z");
    expect(parseServerTime("2026-10-19T12:02:54.458398+00:00")).toBe(base);
    expect(parseServerTime("2026-10-19T12:02:54.458Z")).toBe(base);
    expect(parseServerTime("2026-10-19 12:02:54.458398+00")).toBe(base);
    expect(parseServerTime("2026-10-19T12:02:54.458398+0000")).toBe(base);
    expect(parseServerTime("2026-10-19T19:02:54.458398+07:00")).toBe(base);
    expect(parseServerTime("2026-10-19T12:02:54+00:00")).toBe(base - 458);
    expect(parseServerTime("2026-10-19T12:02:54.4+00:00")).toBe(base - 58);
    expect(parseServerTime("2026-10-19")).toBe(Date.parse("2026-10-19"));
  });

  it("chuỗi đưa cho Date.parse chỉ có tối đa 3 chữ số thập phân (V8 nhận 6 số nhưng Safari thì không chắc)", () => {
    const spy = vi.spyOn(Date, "parse");
    try {
      parseServerTime("2026-10-19T12:02:54.458398+00:00");
      parseServerTime("2026-10-19 12:02:54.458398+00");
      const passed = spy.mock.calls.map((call) => String(call[0]));
      expect(passed).toEqual(["2026-10-19T12:02:54.458+00:00", "2026-10-19T12:02:54.458+00:00"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("giá trị không đọc được thì trả NaN chứ không ném lỗi", () => {
    for (const bad of [null, undefined, "", "không phải giờ", 123 as never]) expect(parseServerTime(bad)).toBeNaN();
  });

  it("bỏ qua mẫu hỏng", () => {
    const clock = createServerClock(() => 0);
    clock.sample(Number.NaN, 0, 10);
    clock.sample(5, 10, 0);
    expect(clock.offsetMs()).toBe(0);
  });
});

describe("storage (mã tham gia trong sessionStorage)", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
  };

  it("lưu, đọc lại và xoá", () => {
    const storage = memory();
    expect(savePlayer({ token: UUID, nickname: "Hoa" }, storage)).toBe(true);
    expect(loadPlayer(storage)).toEqual({ token: UUID, nickname: "Hoa" });
    clearPlayer(storage);
    expect(loadPlayer(storage)).toBeNull();
  });

  it("trình duyệt chặn lưu trữ thì không ném lỗi, chỉ báo không lưu được", () => {
    const blocked = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
    };
    expect(savePlayer({ token: UUID, nickname: "Hoa" }, blocked)).toBe(false);
    expect(loadPlayer(blocked)).toBeNull();
    expect(() => clearPlayer(blocked)).not.toThrow();
    expect(savePlayer({ token: UUID, nickname: "Hoa" }, null)).toBe(false);
    expect(loadPlayer(null)).toBeNull();
  });

  it("dữ liệu hỏng hoặc mã không phải UUID bị bỏ", () => {
    const storage = memory();
    storage.setItem("smartteach.live.player", "{không phải json");
    expect(loadPlayer(storage)).toBeNull();
    storage.setItem("smartteach.live.player", JSON.stringify({ token: "abc", nickname: "x" }));
    expect(loadPlayer(storage)).toBeNull();
    storage.setItem("smartteach.live.player", JSON.stringify({ token: UUID, nickname: "x".repeat(50) }));
    expect(loadPlayer(storage)?.nickname).toHaveLength(20);
  });
});

describe("channel", () => {
  it("tin báo chỉ đọc seq là số nguyên không âm; còn lại là null", () => {
    expect(parseSignal({ payload: { seq: 5 } })).toBe(5);
    expect(parseSignal({ payload: { seq: 0 } })).toBe(0);
    for (const bad of [{ payload: { seq: -1 } }, { payload: { seq: 1.5 } }, { payload: { seq: "3" } }, { payload: {} }, {}, null, undefined, "x", { payload: { seq: Number.MAX_VALUE } }]) {
      expect(parseSignal(bad)).toBeNull();
    }
  });

  function fakeSupabase() {
    const sent: unknown[] = [];
    let onBroadcast: (message: unknown) => void = () => {};
    let onStatus: (status: string) => void = () => {};
    const channel = {
      on: vi.fn((_type: string, _filter: unknown, cb: (m: unknown) => void) => {
        onBroadcast = cb;
        return channel;
      }),
      subscribe: vi.fn((cb: (status: string) => void) => {
        onStatus = cb;
        return channel;
      }),
      send: vi.fn(async (message: unknown) => {
        sent.push(message);
        return "ok";
      }),
      // Kênh tạm gửi qua REST: ghi lại cùng dạng tin để các kiểm tra so sánh được.
      httpSend: vi.fn(async (event: string, payload: unknown) => {
        sent.push({ type: "broadcast", event, payload });
        return { success: true };
      }),
    };
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(async () => "ok"),
    } as unknown as SupabaseClient;
    return { supabase, channel, sent, emit: (m: unknown) => onBroadcast(m), status: (s: string) => onStatus(s) };
  }

  it("nghe đúng kênh session:<id>, đổi trạng thái kết nối và huỷ khi gỡ", () => {
    const fake = fakeSupabase();
    const handlers = { onSignal: vi.fn(), onStatus: vi.fn() };
    const session = createSessionChannel(fake.supabase, UUID);
    const stop = session.source(handlers);
    expect(fake.supabase.channel).toHaveBeenCalledWith(channelName(UUID), { config: { broadcast: { self: false } } });
    expect(channelName(UUID)).toBe(`session:${UUID}`);
    expect(fake.channel.on).toHaveBeenCalledWith("broadcast", { event: SIGNAL_EVENT }, expect.any(Function));

    fake.status("SUBSCRIBED");
    fake.status("CHANNEL_ERROR");
    fake.status("TIMED_OUT");
    fake.status("CLOSED");
    expect(handlers.onStatus.mock.calls.map((c) => c[0])).toEqual(["subscribed", "closed", "closed", "closed"]);

    fake.emit({ payload: { seq: 4, secret: "bỏ qua" } });
    fake.emit({ payload: "rác" });
    expect(handlers.onSignal.mock.calls.map((c) => c[0])).toEqual([4, null]);

    stop();
    expect(fake.supabase.removeChannel).toHaveBeenCalledWith(fake.channel);
  });

  it("giáo viên báo seq: tin chỉ mang { seq }, không có dữ liệu nào khác", async () => {
    const fake = fakeSupabase();
    const session = createSessionChannel(fake.supabase, UUID);
    session.source({ onSignal: vi.fn(), onStatus: vi.fn() });
    await session.notify(7);
    expect(fake.sent).toEqual([{ type: "broadcast", event: SIGNAL_EVENT, payload: { seq: 7 } }]);
    await session.notify(-1);
    await session.notify(1.5);
    expect(fake.sent).toHaveLength(1);
  });

  it("gửi thất bại thì bỏ qua, không ném lỗi", async () => {
    const fake = fakeSupabase();
    const session = createSessionChannel(fake.supabase, UUID);
    session.source({ onSignal: vi.fn(), onStatus: vi.fn() });
    fake.channel.send.mockRejectedValueOnce(new Error("socket đóng"));
    await expect(session.notify(2)).resolves.toBeUndefined();
  });

  it("kênh đã được nhả (phiên vừa kết thúc) vẫn báo được qua kênh tạm rồi bỏ kênh đó", async () => {
    const fake = fakeSupabase();
    const session = createSessionChannel(fake.supabase, UUID);
    const stop = session.source({ onSignal: vi.fn(), onStatus: vi.fn() });
    stop(); // lõi đồng bộ nhả kênh khi trạng thái đã cuối cùng
    (fake.supabase.removeChannel as ReturnType<typeof vi.fn>).mockClear();
    await session.notify(9);
    expect(fake.sent).toEqual([{ type: "broadcast", event: SIGNAL_EVENT, payload: { seq: 9 } }]);
    expect(fake.channel.httpSend).toHaveBeenCalledWith(SIGNAL_EVENT, { seq: 9 });
    expect(fake.channel.send).not.toHaveBeenCalled(); // không dùng send() vì thư viện sẽ cảnh báo
    expect(fake.supabase.removeChannel).toHaveBeenCalledTimes(1);
    // Kênh tạm gửi lỗi cũng không ném.
    fake.channel.httpSend.mockRejectedValueOnce(new Error("không gửi được"));
    await expect(session.notify(10)).resolves.toBeUndefined();
  });

  it("chưa từng đăng ký kênh vẫn gửi được qua kênh tạm", async () => {
    const fake = fakeSupabase();
    await createSessionChannel(fake.supabase, UUID).notify(3);
    expect(fake.sent).toEqual([{ type: "broadcast", event: SIGNAL_EVENT, payload: { seq: 3 } }]);
    expect(fake.channel.httpSend).toHaveBeenCalledWith(SIGNAL_EVENT, { seq: 3 });
  });
});

describe("rpc", () => {
  const client = (rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>) =>
    ({ rpc: vi.fn(rpc) }) as unknown as SupabaseClient;

  it("vào phòng: thành công trả mã tham gia; mỗi mã thất bại có lời nhắn và mã gốc", async () => {
    const ok = client(async () => ({ data: [{ result: "ok", player_token: UUID, player_nickname: "Hoa" }], error: null }));
    expect(await player.join(ok, "123456", "Hoa")).toEqual({ ok: true, token: UUID, nickname: "Hoa" });

    for (const code of ["invalid_pin", "room_locked", "nickname_taken", "session_started", "room_full", "invalid_nickname"]) {
      const c = client(async () => ({ data: [{ result: code, player_token: null, player_nickname: null }], error: null }));
      const result = await player.join(c, "123456", "Hoa");
      expect(result).toMatchObject({ ok: false, code, fatal: false });
      expect(result.ok === false && result.message).toBe(describeJoinCode(code));
    }
  });

  it("lỗi mạng khi vào phòng thành lời nhắn tiếng Việt", async () => {
    const c = client(async () => ({ data: null, error: { message: "TypeError: Failed to fetch" } }));
    const result = await player.join(c, "123456", "Hoa");
    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.message).toContain("Mất kết nối");
  });

  it("mã tham gia sai dạng bị chặn ngay ở máy khách và là lỗi không thể tự khỏi", async () => {
    const rpc = vi.fn();
    const c = { rpc } as unknown as SupabaseClient;
    expect(await player.state(c, "khong-phai-uuid")).toMatchObject({ ok: false, fatal: true });
    expect(await player.submit(c, "x", 1)).toMatchObject({ ok: false, fatal: true });
    expect(await player.leaderboard(c, "")).toMatchObject({ ok: false, fatal: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lỗi từ chối của máy chủ được đánh dấu đúng loại: hỏng hẳn hay thử lại được", async () => {
    const invalid = client(async () => ({ data: null, error: { message: "invalid_token", code: "PT404" } }));
    expect(await player.state(invalid, UUID)).toMatchObject({ ok: false, fatal: true });
    const closed = client(async () => ({ data: null, error: { message: "answer_closed", code: "PT409" } }));
    const result = await player.submit(closed, UUID, 0);
    expect(result).toMatchObject({ ok: false, fatal: false });
    expect(result.ok === false && result.message).toContain("Hết giờ");
  });

  it("nguồn trạng thái của học sinh báo fatal khi mã hỏng và trả trạng thái khi hợp lệ", async () => {
    const good = client(async () => ({ data: { phase: "lobby", seq: 1, server_now: "2026-01-01T00:00:00Z" }, error: null }));
    expect(await playerFetcher(good, UUID)()).toMatchObject({ ok: true, state: { phase: "lobby" } });
    const bad = client(async () => ({ data: null, error: { message: "invalid_token" } }));
    expect(await playerFetcher(bad, UUID)()).toMatchObject({ ok: false, fatal: true });
  });

  it("hàm giáo viên gọi đúng tên hàm và tham số, id sai dạng không gọi máy chủ", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const c = { rpc } as unknown as SupabaseClient;
    expect(await host.open(c, UUID)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("host_open_question", { p_session: UUID });
    await host.setLocked(c, UUID, true);
    expect(rpc).toHaveBeenCalledWith("host_set_locked", { p_session: UUID, p_locked: true });
    await host.remove(c, UUID, UUID);
    expect(rpc).toHaveBeenCalledWith("host_remove_participant", { p_session: UUID, p_participant: UUID });
    const calls = rpc.mock.calls.length;
    expect(await host.next(c, "sai")).toMatchObject({ ok: false });
    expect(await host.create(c, "sai", { speedBonus: true })).toMatchObject({ ok: false });
    expect(rpc.mock.calls.length).toBe(calls);
  });

  it("tuỳ chọn tự động qua câu: chỉ gửi khi bật; hàm advanceIfDue và setPaused gọi đúng tên hàm", async () => {
    const rpc = vi.fn(async (fn: string) => ({ data: fn === "create_session" ? [{ session_id: UUID, pin: "042913" }] : true, error: null }));
    const c = { rpc } as unknown as SupabaseClient;

    await host.create(c, UUID, { speedBonus: true });
    expect(rpc).toHaveBeenLastCalledWith("create_session", { p_quiz_id: UUID, p_speed_bonus: true, p_options: {} });
    await host.create(c, UUID, { speedBonus: false, autoAdvance: true, revealSeconds: 12 });
    expect(rpc).toHaveBeenLastCalledWith("create_session", {
      p_quiz_id: UUID,
      p_speed_bonus: false,
      p_options: { auto_advance: true, reveal_seconds: 12 },
    });
    await host.create(c, UUID, { speedBonus: true, treasureMode: true });
    expect(rpc).toHaveBeenLastCalledWith("create_session", { p_quiz_id: UUID, p_speed_bonus: true, p_options: { treasure_mode: true } });
    await host.create(c, UUID, { speedBonus: true, autoAdvance: true, revealSeconds: 12, treasureMode: true });
    expect(rpc).toHaveBeenLastCalledWith("create_session", {
      p_quiz_id: UUID,
      p_speed_bonus: true,
      p_options: { auto_advance: true, reveal_seconds: 12, treasure_mode: true },
    });
    // Tắt tự động thì giây hiện đáp án không được gửi dù có chọn.
    await host.create(c, UUID, { speedBonus: true, autoAdvance: false, revealSeconds: 5 });
    expect(rpc).toHaveBeenLastCalledWith("create_session", { p_quiz_id: UUID, p_speed_bonus: true, p_options: {} });

    expect(await host.advanceIfDue(c, UUID)).toEqual({ ok: true, advanced: true });
    expect(rpc).toHaveBeenLastCalledWith("host_advance_if_due", { p_session: UUID });
    await host.setPaused(c, UUID, true);
    expect(rpc).toHaveBeenLastCalledWith("host_set_paused", { p_session: UUID, p_paused: true });
    const calls = rpc.mock.calls.length;
    expect(await host.advanceIfDue(c, "sai")).toMatchObject({ ok: false });
    expect(await host.setPaused(c, "sai", false)).toMatchObject({ ok: false });
    expect(rpc.mock.calls.length).toBe(calls);

    const notYet = { rpc: vi.fn(async () => ({ data: false, error: null })) } as unknown as SupabaseClient;
    expect(await host.advanceIfDue(notYet, UUID)).toEqual({ ok: true, advanced: false });
  });

  it("mở rương gọi đúng hàm; mã sai không gọi máy chủ; lỗi chưa tới pha hiện đáp án có lời nhắn riêng", async () => {
    const opened = { status: "opened", kind: "win", label: "Nhân đôi điểm", op: "mul", operand: 2, before: 3000, after: 6000, auto: false };
    const ok = client(async () => ({ data: opened, error: null }));
    expect(await player.openChest(ok, UUID)).toEqual({ ok: true, chest: opened });
    expect(ok.rpc).toHaveBeenCalledWith("open_chest", { p_token: UUID });

    const early = client(async () => ({ data: null, error: { message: "chest_not_ready" } }));
    const result = await player.openChest(early, UUID);
    expect(result.ok === false && result.message).toContain("hiện đáp án");
    expect(result.ok === false && result.reason).toBe("chest_not_ready");

    const rpc = vi.fn(async () => ({ data: null, error: null }));
    expect(await player.openChest({ rpc } as unknown as SupabaseClient, "sai")).toMatchObject({ ok: false, fatal: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("tạo phiên trả id và PIN; lỗi quiz chưa chơi được có lời nhắn riêng", async () => {
    const ok = client(async () => ({ data: [{ session_id: UUID, pin: "042913" }], error: null }));
    expect(await host.create(ok, UUID, { speedBonus: true })).toEqual({ ok: true, sessionId: UUID, pin: "042913" });
    const bad = client(async () => ({ data: null, error: { message: "quiz_not_playable" } }));
    const result = await host.create(bad, UUID, { speedBonus: true });
    expect(result.ok === false && result.message).toContain("chơi được");
  });
});

describe("attachWakeListeners (hỏi lại khi trình duyệt thức dậy)", () => {
  function fakeTarget() {
    const handlers = new Map<string, Set<() => void>>();
    return {
      addEventListener: vi.fn((type: string, fn: () => void) => void (handlers.get(type) ?? handlers.set(type, new Set()).get(type)!).add(fn)),
      removeEventListener: vi.fn((type: string, fn: () => void) => void handlers.get(type)?.delete(fn)),
      fire: (type: string) => handlers.get(type)?.forEach((fn) => fn()),
      count: (type: string) => handlers.get(type)?.size ?? 0,
    };
  }

  it("tab hiện lại, có mạng lại, trang khôi phục hay lấy lại focus đều gọi refresh; tab ẩn thì không", () => {
    const doc = Object.assign(fakeTarget(), { visibilityState: "hidden" });
    const win = fakeTarget();
    let t = 0;
    const refresh = vi.fn();
    attachWakeListeners(refresh, doc, win, { now: () => (t += 1000) });

    doc.fire("visibilitychange");
    expect(refresh).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    doc.fire("visibilitychange");
    win.fire("online");
    win.fire("pageshow");
    win.fire("focus");
    expect(refresh).toHaveBeenCalledTimes(4);
  });

  it("các sự kiện đến cùng lúc được gộp thành một lần hỏi", () => {
    const doc = Object.assign(fakeTarget(), { visibilityState: "visible" });
    const win = fakeTarget();
    let t = 0;
    const refresh = vi.fn();
    attachWakeListeners(refresh, doc, win, { now: () => t, minGapMs: 500 });
    doc.fire("visibilitychange");
    win.fire("focus");
    win.fire("pageshow");
    expect(refresh).toHaveBeenCalledTimes(1);
    t = 600;
    win.fire("online");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("huỷ đăng ký thì gỡ sạch người nghe; không có document hay window (server) vẫn an toàn", () => {
    const doc = Object.assign(fakeTarget(), { visibilityState: "visible" });
    const win = fakeTarget();
    const detach = attachWakeListeners(vi.fn(), doc, win);
    expect(doc.count("visibilitychange")).toBe(1);
    expect(win.count("online") + win.count("pageshow") + win.count("focus")).toBe(3);
    detach();
    expect(doc.count("visibilitychange")).toBe(0);
    expect(win.count("online") + win.count("pageshow") + win.count("focus")).toBe(0);
    expect(() => attachWakeListeners(vi.fn(), undefined, undefined)()).not.toThrow();
  });
});

describe("màn hình giáo viên: nhịp hỏi và lỗi không thể tự khỏi", () => {
  it("hỏi dày (1,5 giây) khi phòng chờ và đang hỏi, thưa khi hiện đáp án, ngừng khi kết thúc", () => {
    expect(hostPollMs("lobby")).toBe(1500);
    expect(hostPollMs("question")).toBe(1500);
    expect(hostPollMs(undefined)).toBe(1500);
    expect(hostPollMs("reveal")).toBe(3000);
    expect(hostPollMs("ended")).toBe(0);
  });

  it("phiên không phải của mình hoặc id sai dạng là lỗi hỏng hẳn để nói rõ 'không tìm thấy'", async () => {
    const rpc = vi.fn();
    const c = { rpc } as unknown as SupabaseClient;
    expect(await host.state(c, "khong-phai-uuid")).toMatchObject({ ok: false, fatal: true });
    expect(rpc).not.toHaveBeenCalled();

    const notOwner = { rpc: vi.fn(async () => ({ data: null, error: { message: "session_not_found", code: "PT404" } })) } as unknown as SupabaseClient;
    expect(await host.state(notOwner, UUID)).toMatchObject({ ok: false, fatal: true });
    const network = { rpc: vi.fn(async () => ({ data: null, error: { message: "TypeError: Failed to fetch" } })) } as unknown as SupabaseClient;
    expect(await host.state(network, UUID)).toMatchObject({ ok: false, fatal: false });
  });
});

describe("runHostAction", () => {
  it("thao tác thành công thì hỏi lại trạng thái rồi báo seq mới cho người chơi", async () => {
    const order: string[] = [];
    const sync = {
      refresh: vi.fn(async () => void order.push("refresh")),
      getSnapshot: vi.fn(() => ({ state: { seq: 9 } }) as never),
    };
    const channel = { notify: vi.fn(async (seq: number) => void order.push(`notify ${seq}`)) };
    const result = await runHostAction(sync, channel, async () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
    expect(order).toEqual(["refresh", "notify 9"]);
  });

  it("thao tác thất bại thì không báo gì cho người chơi", async () => {
    const sync = { refresh: vi.fn(async () => {}), getSnapshot: vi.fn(() => ({ state: { seq: 9 } }) as never) };
    const channel = { notify: vi.fn(async () => {}) };
    const result = await runHostAction(sync, channel, async () => ({ ok: false, message: "x", fatal: false }));
    expect(result).toMatchObject({ ok: false });
    expect(sync.refresh).not.toHaveBeenCalled();
    expect(channel.notify).not.toHaveBeenCalled();
  });

  it("gửi tin lỗi không làm hỏng thao tác (notify tự nuốt lỗi) và chưa có trạng thái thì không gửi", async () => {
    const sync = { refresh: vi.fn(async () => {}), getSnapshot: vi.fn(() => ({ state: null }) as never) };
    const channel = { notify: vi.fn(async () => {}) };
    const result = await runHostAction(sync, channel, async () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
    expect(channel.notify).not.toHaveBeenCalled();
  });
});
