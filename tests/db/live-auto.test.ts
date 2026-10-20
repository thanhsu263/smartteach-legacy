import { afterAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, signUp, type TestUser } from "./helpers";
import { host, hostOk, hostState, joinOk, newQuiz, playerState, questions, rpcStatus, startSession, submitOk } from "./live-helpers";

/**
 * Tự động qua câu (phase 2 của giai đoạn 2.5): cấu hình phiên, giờ chốt do MÁY CHỦ quyết (reveal_ends_at),
 * tạm dừng và quyền. Cần `npm run supabase:start`. Giờ được dịch bằng service_role (như các test hạn chót khác).
 */

afterAll(async () => {
  await cleanupUsers();
});

const past = () => new Date(Date.now() - 2000).toISOString();

/** Phiên bật tự động với ba câu đầu của bộ câu hỏi mẫu, một người chơi đã vào phòng. */
async function autoSession(t: TestUser, options: Record<string, unknown> = { auto_advance: true, reveal_seconds: 5 }) {
  const quizId = await newQuiz(t, [questions[0], questions[1], questions[2]]);
  const s = await startSession(t, quizId, false, options);
  const token = await joinOk(s.pin, "Học sinh");
  return { ...s, token };
}

/** Mở câu 1 rồi đóng bằng tay: phiên ở pha hiện đáp án. */
async function toReveal(t: TestUser, id: string, token: string) {
  await hostOk(t, "host_open_question", { p_session: id });
  await submitOk(token, 0);
  await hostOk(t, "host_close_question", { p_session: id });
}

async function setRevealEnds(id: string, when: string | null) {
  const { error } = await admin.from("live_sessions").update({ reveal_ends_at: when }).eq("id", id);
  expect(error).toBeNull();
}

async function advance(t: TestUser, id: string): Promise<boolean> {
  const { data, error } = await host(t, "host_advance_if_due", { p_session: id });
  expect(error, "host_advance_if_due").toBeNull();
  return data as boolean;
}

describe("cấu hình tự động khi tạo phiên", () => {
  it("mặc định tắt, 8 giây, không tạm dừng; tuỳ chọn hợp lệ được lưu; khoá lạ bị bỏ qua", async () => {
    const t = await signUp("auto-cfg");
    const quizId = await newQuiz(t, [questions[0]]);

    const plain = await startSession(t, quizId);
    expect(await hostState(t, plain.id)).toMatchObject({ auto_advance: false, reveal_seconds: 8, paused: false, reveal_ends_at: null });
    await hostOk(t, "host_end_session", { p_session: plain.id });

    const custom = await startSession(t, quizId, true, { auto_advance: true, reveal_seconds: 12, khoa_la: "bỏ qua" });
    expect(await hostState(t, custom.id)).toMatchObject({ auto_advance: true, reveal_seconds: 12, paused: false });
    await hostOk(t, "host_end_session", { p_session: custom.id });

    // Gọi kiểu cũ (không có p_options) vẫn chạy: PostgREST dùng giá trị mặc định.
    const legacy = await t.client.rpc("create_session", { p_quiz_id: quizId, p_speed_bonus: true });
    expect(legacy.error).toBeNull();
    const id = (legacy.data as { session_id: string }[])[0].session_id;
    expect(await hostState(t, id)).toMatchObject({ auto_advance: false });
    await hostOk(t, "host_end_session", { p_session: id });
  }, 60_000);

  it("giá trị sai kiểu hoặc ngoài tập cho phép bị từ chối (HTTP 400) và không tạo phiên", async () => {
    const t = await signUp("auto-bad");
    const quizId = await newQuiz(t, [questions[0]]);
    const bad: unknown[] = [
      { reveal_seconds: 7 },
      { reveal_seconds: "8" },
      { reveal_seconds: 8.5 },
      { reveal_seconds: null },
      { auto_advance: "true" },
      { auto_advance: 1 },
      "chuỗi",
      [],
      42,
    ];
    for (const options of bad) {
      const res = await rpcStatus("create_session", { p_quiz_id: quizId, p_speed_bonus: true, p_options: options }, t);
      expect(res.status, JSON.stringify(options)).toBe(400);
      expect(res.message, JSON.stringify(options)).toContain("invalid_options");
    }
    // Không phiên nào bị tạo dở: vẫn tạo được phiên mới ngay.
    const ok = await startSession(t, quizId, true, { auto_advance: true, reveal_seconds: 5 });
    await hostOk(t, "host_end_session", { p_session: ok.id });
  }, 60_000);
});

describe("hết giờ rồi tự mở câu kế theo giờ máy chủ", () => {
  it("đóng câu đặt reveal_ends_at = giờ máy chủ + reveal_seconds; tắt tự động thì để null; mở câu kế xoá nó", async () => {
    const t = await signUp("auto-ends");
    const s = await autoSession(t);
    await toReveal(t, s.id, s.token);

    const state = await hostState(t, s.id);
    expect(state.status).toBe("reveal");
    const wait = Date.parse(state.reveal_ends_at) - Date.parse(state.server_now);
    expect(wait).toBeGreaterThan(4000);
    expect(wait).toBeLessThanOrEqual(5100);

    // Học sinh thấy cùng giờ.
    const player = await playerState(s.token);
    expect(player).toMatchObject({ phase: "reveal", auto_advance: true, paused: false, next_at: state.reveal_ends_at });

    await hostOk(t, "host_next", { p_session: s.id });
    const next = await hostState(t, s.id);
    expect(next).toMatchObject({ status: "question", question_index: 2, reveal_ends_at: null });
    await hostOk(t, "host_end_session", { p_session: s.id });

    // Tắt tự động: không có giờ chốt.
    const off = await autoSession(t, {});
    await toReveal(t, off.id, off.token);
    expect(await hostState(t, off.id)).toMatchObject({ status: "reveal", auto_advance: false, reveal_ends_at: null });
    expect(await playerState(off.token)).toMatchObject({ auto_advance: false, next_at: null });
    await hostOk(t, "host_end_session", { p_session: off.id });
  }, 90_000);

  it("hết giờ câu do máy chủ tự đóng (host_close_if_expired) cũng đặt reveal_ends_at", async () => {
    const t = await signUp("auto-expire");
    const s = await autoSession(t);
    await hostOk(t, "host_open_question", { p_session: s.id });
    expect((await host(t, "host_close_if_expired", { p_session: s.id })).data).toBe(false);
    await admin.from("live_sessions").update({ question_closes_at: past() }).eq("id", s.id);
    expect((await host(t, "host_close_if_expired", { p_session: s.id })).data).toBe(true);
    const state = await hostState(t, s.id);
    expect(state.status).toBe("reveal");
    expect(Date.parse(state.reveal_ends_at)).toBeGreaterThan(Date.parse(state.server_now));
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);

  it("host_advance_if_due: không mở sớm; tới hạn thì mở đúng một lần; gọi lại không mở thêm", async () => {
    const t = await signUp("auto-due");
    const s = await autoSession(t);
    await toReveal(t, s.id, s.token);

    expect(await advance(t, s.id)).toBe(false);
    expect(await hostState(t, s.id)).toMatchObject({ status: "reveal", question_index: 1 });

    await setRevealEnds(s.id, past());
    expect(await advance(t, s.id)).toBe(true);
    expect(await hostState(t, s.id)).toMatchObject({ status: "question", question_index: 2, reveal_ends_at: null });
    // Gọi trùng (hai tab, hoặc thử lại): đã sang câu kế nên không làm gì và không mở câu 3.
    expect(await advance(t, s.id)).toBe(false);
    expect(await hostState(t, s.id)).toMatchObject({ status: "question", question_index: 2 });
    // Dù giờ chốt còn sót ở quá khứ, đang ở pha hỏi thì không được mở câu 3.
    await setRevealEnds(s.id, past());
    expect(await advance(t, s.id)).toBe(false);
    expect(await hostState(t, s.id)).toMatchObject({ status: "question", question_index: 2 });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 90_000);

  it("gọi trùng cùng lúc chỉ mở một câu (khoá hàng phiên)", async () => {
    const t = await signUp("auto-race");
    const s = await autoSession(t);
    await toReveal(t, s.id, s.token);
    await setRevealEnds(s.id, past());
    const results = await Promise.all(Array.from({ length: 6 }, () => host(t, "host_advance_if_due", { p_session: s.id })));
    expect(results.map((r) => r.error)).toEqual(Array(6).fill(null));
    expect(results.filter((r) => r.data === true)).toHaveLength(1);
    expect(await hostState(t, s.id)).toMatchObject({ status: "question", question_index: 2 });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 90_000);

  it("không chạy khi tắt tự động, dù có giờ chốt trong quá khứ; không chạy ở pha khác", async () => {
    const t = await signUp("auto-off");
    const s = await autoSession(t, {});
    expect(await advance(t, s.id)).toBe(false); // phòng chờ
    await toReveal(t, s.id, s.token);
    await setRevealEnds(s.id, past());
    expect(await advance(t, s.id)).toBe(false);
    expect(await hostState(t, s.id)).toMatchObject({ status: "reveal", question_index: 1 });
    await hostOk(t, "host_next", { p_session: s.id });
    expect(await advance(t, s.id)).toBe(false); // đang hỏi
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 90_000);

  it("sau câu cuối thì kết thúc phiên; gọi tiếp báo phiên đã kết thúc", async () => {
    const t = await signUp("auto-last");
    const quizId = await newQuiz(t, [questions[0]]);
    const s = await startSession(t, quizId, false, { auto_advance: true, reveal_seconds: 5 });
    const token = await joinOk(s.pin, "Học sinh");
    await toReveal(t, s.id, token);
    await setRevealEnds(s.id, past());
    expect(await advance(t, s.id)).toBe(true);
    expect(await hostState(t, s.id)).toMatchObject({ status: "ended", reveal_ends_at: null });
    expect((await host(t, "host_advance_if_due", { p_session: s.id })).error?.message).toContain("session_ended");
    expect((await playerState(token)).phase).toBe("ended");
  }, 60_000);

  it("bấm tay (host_next) vẫn dùng được khi đang bật tự động, trước giờ chốt", async () => {
    const t = await signUp("auto-manual");
    const s = await autoSession(t);
    await toReveal(t, s.id, s.token);
    await hostOk(t, "host_next", { p_session: s.id });
    expect(await hostState(t, s.id)).toMatchObject({ status: "question", question_index: 2, reveal_ends_at: null });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);
});

describe("tạm dừng và tiếp tục", () => {
  it("tạm dừng giữ nguyên màn hiện đáp án dù quá giờ; tiếp tục cho thêm 3 giây; lặp lại thì không đổi", async () => {
    const t = await signUp("auto-pause");
    const s = await autoSession(t);
    await toReveal(t, s.id, s.token);

    await hostOk(t, "host_set_paused", { p_session: s.id, p_paused: true });
    expect(await hostState(t, s.id)).toMatchObject({ status: "reveal", paused: true, reveal_ends_at: null });
    expect(await playerState(s.token)).toMatchObject({ paused: true, next_at: null });
    // Ngay cả khi giờ chốt bị đặt về quá khứ (không thể xảy ra thật), vẫn không tự mở khi đang tạm dừng.
    await setRevealEnds(s.id, past());
    expect(await advance(t, s.id)).toBe(false);
    await setRevealEnds(s.id, null);
    const seqPaused = (await hostState(t, s.id)).seq;
    await hostOk(t, "host_set_paused", { p_session: s.id, p_paused: true }); // lặp lại: không làm gì
    expect((await hostState(t, s.id)).seq).toBe(seqPaused);

    await hostOk(t, "host_set_paused", { p_session: s.id, p_paused: false });
    const resumed = await hostState(t, s.id);
    expect(resumed.paused).toBe(false);
    const grace = Date.parse(resumed.reveal_ends_at) - Date.parse(resumed.server_now);
    expect(grace).toBeGreaterThan(2000);
    expect(grace).toBeLessThanOrEqual(3100);
    expect(await advance(t, s.id)).toBe(false); // chưa hết 3 giây ân hạn
    await hostOk(t, "host_set_paused", { p_session: s.id, p_paused: false }); // tiếp tục khi đang chạy: không đặt lại giờ
    expect((await hostState(t, s.id)).reveal_ends_at).toBe(resumed.reveal_ends_at);

    await setRevealEnds(s.id, past());
    expect(await advance(t, s.id)).toBe(true);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 90_000);

  it("tạm dừng trong lúc đang hỏi: đóng câu xong không đặt giờ chốt cho tới khi tiếp tục", async () => {
    const t = await signUp("auto-pause-q");
    const s = await autoSession(t);
    await hostOk(t, "host_open_question", { p_session: s.id });
    await hostOk(t, "host_set_paused", { p_session: s.id, p_paused: true });
    await hostOk(t, "host_close_question", { p_session: s.id });
    expect(await hostState(t, s.id)).toMatchObject({ status: "reveal", paused: true, reveal_ends_at: null });
    await hostOk(t, "host_set_paused", { p_session: s.id, p_paused: false });
    expect((await hostState(t, s.id)).reveal_ends_at).not.toBeNull();
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);

  it("không bật tự động thì tạm dừng bị từ chối (HTTP 409)", async () => {
    const t = await signUp("auto-pause-off");
    const s = await autoSession(t, {});
    const res = await rpcStatus("host_set_paused", { p_session: s.id, p_paused: true }, t);
    expect(res.status).toBe(409);
    expect(res.message).toContain("invalid_transition");
    expect((await host(t, "host_set_paused", { p_session: s.id, p_paused: null })).error).not.toBeNull();
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);
});

describe("quyền", () => {
  it("chỉ chủ phiên gọi được; khách và giáo viên khác bị từ chối", async () => {
    const t = await signUp("auto-own");
    const other = await signUp("auto-other");
    const s = await autoSession(t);
    await toReveal(t, s.id, s.token);

    for (const [fn, args] of [
      ["host_advance_if_due", { p_session: s.id }],
      ["host_set_paused", { p_session: s.id, p_paused: true }],
    ] as const) {
      const stranger = await rpcStatus(fn, args, other);
      expect(stranger.status, `${fn}: giáo viên khác`).toBe(404);
      expect(stranger.message).toContain("session_not_found");
      const guest = await anon.rpc(fn, args);
      expect(guest.error, `${fn}: khách`).not.toBeNull();
    }
    // Hàm nội bộ không mở ra API.
    expect((await anon.rpc("advance_from_reveal", {})).error).not.toBeNull();
    expect((await t.client.rpc("advance_from_reveal", {})).error).not.toBeNull();
    // Phiên không đổi sau các lần thử.
    expect(await hostState(t, s.id)).toMatchObject({ status: "reveal", paused: false });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);
});
