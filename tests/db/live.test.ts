import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, signUp, type QuestionInput, type TestUser } from "./helpers";
import {
  allKeys,
  host,
  hostOk,
  hostState,
  join,
  joinOk,
  leave,
  newQuiz,
  playerState,
  psql,
  psqlAsync,
  questions,
  rpcStatus,
  setTimeLimit,
  sleep,
  startSession,
  submit,
  submitOk,
} from "./live-helpers";

/**
 * Kiểm thử máy chủ chơi trực tiếp (phase 3 giai đoạn 2) trên Postgres thật của Supabase cục bộ, đi
 * qua đúng đường mà ứng dụng dùng: PostgREST với JWT của giáo viên và vai trò anon của học sinh.
 * Cần `npm run supabase:start`. Đây là ranh giới bảo mật duy nhất của phần học sinh.
 */

const FORBIDDEN_KEYS = ["is_correct", "correct", "key", "accepted_answers", "ignore_diacritics", "quiz_snapshot", "token"];

afterAll(async () => {
  // Đóng mọi phiên còn dở để không giữ PIN; xoá người dùng sẽ kéo theo xoá phiên.
  await cleanupUsers();
});

// ---------------------------------------------------------------------------------------------
describe("3.1 quyền truy cập và giới hạn", () => {
  let a: TestUser;
  let b: TestUser;
  let session: { id: string; pin: string };

  beforeAll(async () => {
    a = await signUp("live-a");
    b = await signUp("live-b");
    session = await startSession(a, await newQuiz(a));
    await joinOk(session.pin, "Minh");
  }, 60_000);

  it("khách không đọc, ghi, sửa, xoá được bảng nào", async () => {
    const filters = {
      live_sessions: ["id", session.id],
      participants: ["session_id", session.id],
      answers: ["session_id", session.id],
    } as const;
    for (const table of ["live_sessions", "participants", "answers"] as const) {
      const [column, value] = filters[table];
      expect((await anon.from(table).select("*")).error?.code, `đọc ${table}`).toBe("42501");
      expect((await anon.from(table).insert({})).error?.code, `chèn ${table}`).toBe("42501");
      expect((await anon.from(table).update({}).eq(column, value)).error?.code, `sửa ${table}`).toBe("42501");
      expect((await anon.from(table).delete().eq(column, value)).error?.code, `xoá ${table}`).toBe("42501");
    }
  });

  it("giáo viên chỉ đọc được cột an toàn của phiên mình: không có đề đã chụp, không có mã tham gia", async () => {
    const own = await a.client.from("live_sessions").select("id, pin, status").eq("id", session.id);
    expect(own.data).toEqual([{ id: session.id, pin: session.pin, status: "lobby" }]);
    expect((await a.client.from("live_sessions").select("quiz_snapshot")).error?.code).toBe("42501");
    expect((await a.client.from("live_sessions").select("*")).error?.code).toBe("42501");

    const players = await a.client.from("participants").select("id, nickname, score, removed").eq("session_id", session.id);
    expect(players.data).toHaveLength(1);
    expect((await a.client.from("participants").select("token")).error?.code).toBe("42501");
    expect((await a.client.from("participants").select("*")).error?.code).toBe("42501");
  });

  it("giáo viên không ghi trực tiếp được vào bảng nào (mọi ghi đi qua hàm)", async () => {
    expect((await a.client.from("live_sessions").update({ locked: true }).eq("id", session.id)).error?.code).toBe("42501");
    expect((await a.client.from("live_sessions").delete().eq("id", session.id)).error?.code).toBe("42501");
    expect((await a.client.from("participants").insert({ session_id: session.id, nickname: "Gian" })).error?.code).toBe("42501");
    expect((await a.client.from("participants").update({ score: 99999 }).eq("session_id", session.id)).error?.code).toBe("42501");
    expect((await a.client.from("answers").update({ points: 1000 }).eq("session_id", session.id)).error?.code).toBe("42501");
  });

  it("giáo viên B không thấy phiên, người chơi, câu trả lời của A", async () => {
    expect((await b.client.from("live_sessions").select("id").eq("id", session.id)).data).toEqual([]);
    expect((await b.client.from("participants").select("id").eq("session_id", session.id)).data).toEqual([]);
    expect((await b.client.from("answers").select("session_id").eq("session_id", session.id)).data).toEqual([]);
  });

  it("các hàm nội bộ và hàm trigger không gọi được qua API", async () => {
    for (const fn of ["normalize_answer", "score_question", "enforce_participant_limit"]) {
      const { error } = await anon.rpc(fn, {});
      expect(error, fn).not.toBeNull();
      const asTeacher = await a.client.rpc(fn, {});
      expect(asTeacher.error, `${fn} (giáo viên)`).not.toBeNull();
    }
  });

  it("mỗi giáo viên một phiên chưa kết thúc; kết thúc rồi mới mở phiên mới", async () => {
    const second = await host(a, "create_session", { p_quiz_id: await newQuiz(a), p_speed_bonus: true });
    expect(second.error?.message).toContain("session_already_active");
    await hostOk(a, "host_end_session", { p_session: session.id });
    const quizId = await newQuiz(a);
    const next = await startSession(a, quizId);
    expect(next.id).not.toBe(session.id);
    await hostOk(a, "host_end_session", { p_session: next.id });
  });

  it("tối đa 50 người chơi, kể cả khi 55 người vào cùng lúc; người bị loại nhường chỗ nhưng dòng vẫn bị giới hạn", async () => {
    const full = await startSession(b, await newQuiz(b));
    const results = await Promise.all(Array.from({ length: 55 }, (_, i) => join(full.pin, `Bạn ${i + 1}`)));
    expect(results.filter((r) => r.result === "ok")).toHaveLength(50);
    expect(results.filter((r) => r.result === "room_full")).toHaveLength(5);

    // Bỏ qua hàm: chèn thẳng bằng service_role vẫn bị trigger chặn.
    const direct = await admin.from("participants").insert({ session_id: full.id, nickname: "Lách luật" });
    expect(direct.error?.code).toBe("23514");
    expect(direct.error?.message).toContain("participant_limit_exceeded");

    const state = await hostState(b, full.id);
    const first = (state.players as { id: string }[])[0];
    await hostOk(b, "host_remove_participant", { p_session: full.id, p_participant: first.id });
    expect((await join(full.pin, "Chỗ trống")).result).toBe("ok");
    expect((await join(full.pin, "Hết chỗ")).result).toBe("room_full");

    const rows = await admin.from("participants").select("id", { count: "exact", head: true }).eq("session_id", full.id);
    expect(rows.count).toBe(51);
    await hostOk(b, "host_end_session", { p_session: full.id });
  }, 60_000);
});

// ---------------------------------------------------------------------------------------------
describe("3.2 hàm giáo viên và máy trạng thái", () => {
  let t: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    t = await signUp("live-t");
    other = await signUp("live-o");
  }, 60_000);

  it("chỉ tạo phiên cho quiz của mình và chỉ khi quiz chơi được", async () => {
    const mine = await newQuiz(t);
    expect((await host(other, "create_session", { p_quiz_id: mine })).error?.message).toContain("quiz_not_found");
    expect((await host(t, "create_session", { p_quiz_id: crypto.randomUUID() })).error?.message).toContain("quiz_not_found");

    const empty = await newQuiz(t, [], "Quiz rỗng");
    expect((await host(t, "create_session", { p_quiz_id: empty })).error?.message).toContain("quiz_not_playable");

    const noCorrect = await newQuiz(t, [{ kind: "single", prompt: "Không có đáp án", options: [{ label: "A" }, { label: "B" }] }], "Thiếu đáp án");
    expect((await host(t, "create_session", { p_quiz_id: noCorrect })).error?.message).toContain("quiz_not_playable");

    const asGuest = await anon.rpc("create_session", { p_quiz_id: mine });
    expect(asGuest.error?.code).toBe("42501");
  });

  it("PIN gồm 6 chữ số và không trùng giữa các phiên đang chạy", async () => {
    const one = await startSession(t, await newQuiz(t));
    const two = await startSession(other, await newQuiz(other));
    expect(one.pin).toMatch(/^[0-9]{6}$/);
    expect(two.pin).toMatch(/^[0-9]{6}$/);
    expect(one.pin).not.toBe(two.pin);
    await hostOk(t, "host_end_session", { p_session: one.id });
    await hostOk(other, "host_end_session", { p_session: two.id });
  });

  it("đi hết phòng chờ -> câu -> hiện đáp án -> ... -> kết thúc; chuyển sai thứ tự bị từ chối", async () => {
    const s = await startSession(t, await newQuiz(t));
    const lobby = await hostState(t, s.id);
    expect(lobby).toMatchObject({ status: "lobby", question_index: 0, question_total: 4, pin: s.pin, locked: false });
    expect(lobby.question).toBeUndefined();
    expect(lobby.key).toBeUndefined();

    for (const fn of ["host_close_question", "host_next"]) {
      expect((await host(t, fn, { p_session: s.id })).error?.message, `${fn} ở phòng chờ`).toContain("invalid_transition");
    }

    let previousSeq = lobby.seq as number;
    for (let index = 1; index <= 4; index++) {
      await hostOk(t, index === 1 ? "host_open_question" : "host_next", { p_session: s.id });
      const open = await hostState(t, s.id);
      expect(open).toMatchObject({ status: "question", question_index: index });
      expect(open.seq).toBeGreaterThan(previousSeq);
      expect(Date.parse(open.closes_at)).toBeGreaterThan(Date.parse(open.opened_at));
      // Khi đang hỏi, màn chiếu của giáo viên cũng không có khoá đáp án.
      expect(open.key).toBeUndefined();
      expect(allKeys(open.question).has("is_correct")).toBe(false);
      previousSeq = open.seq;

      for (const fn of ["host_open_question", "host_next"]) {
        expect((await host(t, fn, { p_session: s.id })).error?.message, `${fn} khi đang hỏi`).toContain("invalid_transition");
      }
      await hostOk(t, "host_close_question", { p_session: s.id });
      const revealed = await hostState(t, s.id);
      expect(revealed.status).toBe("reveal");
      expect(revealed.key).toBeDefined();
      expect(revealed.seq).toBeGreaterThan(previousSeq);
      previousSeq = revealed.seq;

      for (const fn of ["host_open_question", "host_close_question"]) {
        expect((await host(t, fn, { p_session: s.id })).error?.message, `${fn} khi đã hiện đáp án`).toContain("invalid_transition");
      }
    }

    await hostOk(t, "host_next", { p_session: s.id });
    const ended = await hostState(t, s.id);
    expect(ended.status).toBe("ended");
    expect(ended.leaderboard).toBeDefined();
    for (const [fn, args] of [
      ["host_next", {}],
      ["host_open_question", {}],
      ["host_close_question", {}],
      ["host_end_session", {}],
      ["host_set_locked", { p_locked: true }],
    ] as const) {
      expect((await host(t, fn, { p_session: s.id, ...args })).error?.message, `${fn} sau khi kết thúc`).toContain("session_ended");
    }
  });

  it("người không phải chủ phiên và khách bị từ chối mọi hàm điều khiển", async () => {
    const s = await startSession(t, await newQuiz(t));
    const token = await joinOk(s.pin, "Học sinh");
    const player = (await hostState(t, s.id)).players[0].id as string;
    const calls: [string, Record<string, unknown>][] = [
      ["host_state", {}],
      ["host_set_locked", { p_locked: true }],
      ["host_remove_participant", { p_participant: player }],
      ["host_open_question", {}],
      ["host_close_question", {}],
      ["host_next", {}],
      ["host_end_session", {}],
    ];
    for (const [fn, args] of calls) {
      const asOther = await host(other, fn, { p_session: s.id, ...args });
      expect(asOther.error?.message, `${fn} bởi giáo viên khác`).toContain("session_not_found");
      const asGuest = await anon.rpc(fn, { p_session: s.id, ...args });
      expect(asGuest.error?.code, `${fn} bởi khách`).toBe("42501");
    }
    // Phiên vẫn nguyên vẹn.
    expect((await hostState(t, s.id)).status).toBe("lobby");
    expect((await playerState(token)).phase).toBe("lobby");
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("đề được chụp lúc bắt đầu: sửa hay xoá quiz sau đó không đổi phiên đang chơi", async () => {
    const quizId = await newQuiz(t);
    const s = await startSession(t, quizId);
    const rows = await t.client.from("questions").select("id").eq("quiz_id", quizId).order("position");
    const firstId = (rows.data as { id: string }[])[0].id;
    const edited = await t.client.rpc("save_question", {
      p_quiz_id: quizId,
      p_question: { ...questions[0], id: firstId, prompt: "Đề đã bị sửa", options: [{ label: "Khác", is_correct: true }, { label: "Khác nữa" }] },
    });
    expect(edited.error).toBeNull();
    await t.client.from("quizzes").delete().eq("id", quizId);

    await hostOk(t, "host_open_question", { p_session: s.id });
    const state = await hostState(t, s.id);
    expect(state.question.prompt).toBe(questions[0].prompt);
    expect(state.question.options).toEqual(["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"]);
    const row = await t.client.from("live_sessions").select("quiz_id, quiz_title").eq("id", s.id).single();
    expect(row.data).toEqual({ quiz_id: null, quiz_title: "Quiz phiên chơi" });
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("khoá phòng chặn người mới; mở khoá thì vào lại được; loại người chơi thì họ bị chặn", async () => {
    const s = await startSession(t, await newQuiz(t));
    await hostOk(t, "host_set_locked", { p_session: s.id, p_locked: true });
    expect((await hostState(t, s.id)).locked).toBe(true);
    expect((await join(s.pin, "Muộn")).result).toBe("room_locked");
    await hostOk(t, "host_set_locked", { p_session: s.id, p_locked: false });

    const token = await joinOk(s.pin, "Bị loại");
    const keep = await joinOk(s.pin, "Ở lại");
    const players = (await hostState(t, s.id)).players as { id: string; nickname: string }[];
    const target = players.find((p) => p.nickname === "Bị loại")!;
    await hostOk(t, "host_remove_participant", { p_session: s.id, p_participant: target.id });
    expect((await host(t, "host_remove_participant", { p_session: s.id, p_participant: crypto.randomUUID() })).error?.message).toContain("participant_not_found");

    expect((await playerState(token)).phase).toBe("removed");
    expect((await anon.rpc("player_leaderboard", { p_token: token })).error?.message).toContain("participant_removed");
    expect((await playerState(keep)).phase).toBe("lobby");
    // Biệt danh của người bị loại vẫn bị giữ.
    expect((await join(s.pin, "Bị loại")).result).toBe("nickname_taken");

    await hostOk(t, "host_open_question", { p_session: s.id });
    expect((await submit(token, 0)).error?.message).toContain("participant_removed");
    expect((await join(s.pin, "Vào muộn")).result).toBe("session_started");
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("phiên quá hạn coi như đã kết thúc: không nhận thao tác, PIN và chỗ được trả lại", async () => {
    const s = await startSession(t, await newQuiz(t));
    const token = await joinOk(s.pin, "Người chơi");
    const expired = await admin.from("live_sessions").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", s.id);
    expect(expired.error).toBeNull();

    expect((await hostState(t, s.id)).status).toBe("ended");
    expect((await host(t, "host_open_question", { p_session: s.id })).error?.message).toContain("session_ended");
    expect((await playerState(token)).phase).toBe("ended");
    expect((await join(s.pin, "Người mới")).result).toBe("invalid_pin");
    expect((await submit(token, 0)).error?.message).toContain("answer_closed");

    // Tạo phiên mới tự dọn phiên quá hạn rồi cấp phiên mới.
    const fresh = await startSession(t, await newQuiz(t));
    expect(fresh.id).not.toBe(s.id);
    const old = await admin.from("live_sessions").select("status, ended_at").eq("id", s.id).single();
    expect((old.data as { status: string }).status).toBe("ended");
    expect((old.data as { ended_at: string | null }).ended_at).not.toBeNull();
    await hostOk(t, "host_end_session", { p_session: fresh.id });
  });

  it("kết thúc giữa chừng vẫn chấm các câu đã nộp", async () => {
    const s = await startSession(t, await newQuiz(t), false);
    const token = await joinOk(s.pin, "Nhanh tay");
    await hostOk(t, "host_open_question", { p_session: s.id });
    await submitOk(token, 0);
    await hostOk(t, "host_end_session", { p_session: s.id });
    const row = await admin.from("participants").select("score").eq("session_id", s.id).single();
    expect((row.data as { score: number }).score).toBe(1000);
  });
});

// ---------------------------------------------------------------------------------------------
describe("3.3 và 3.6 học sinh: không rò rỉ đáp án, không gian lận", () => {
  let t: TestUser;
  let s: { id: string; pin: string };
  let p1: string;
  let p2: string;
  const secretAnswer = "đáp án bí mật xyz";
  const secretQuestions: QuestionInput[] = [
    questions[0],
    { kind: "short_text", prompt: "Câu điền từ riêng", accepted_answers: [secretAnswer], ignore_diacritics: true },
    questions[2],
  ];

  beforeAll(async () => {
    t = await signUp("live-s");
    s = await startSession(t, await newQuiz(t, secretQuestions));
    p1 = await joinOk(s.pin, "Hoa");
    p2 = await joinOk(s.pin, "Lan");
  }, 60_000);

  function expectNoKey(state: unknown, label: string) {
    const keys = allKeys(state);
    for (const key of FORBIDDEN_KEYS) expect(keys.has(key), `${label}: lộ khoá "${key}"`).toBe(false);
  }

  it("mã tham gia sai, ngẫu nhiên hay thiếu đều bị từ chối", async () => {
    for (const token of [crypto.randomUUID(), "khong-phai-uuid"]) {
      expect((await anon.rpc("player_state", { p_token: token })).error).not.toBeNull();
      expect((await anon.rpc("player_leaderboard", { p_token: token })).error).not.toBeNull();
      expect((await submit(token, 0)).error).not.toBeNull();
    }
    expect((await anon.rpc("player_state", { p_token: crypto.randomUUID() })).error?.message).toContain("invalid_token");
  });

  it("phòng chờ: không lộ đề của bất kỳ câu nào; nộp đáp án khi chưa mở bị từ chối", async () => {
    const state = await playerState(p1);
    expect(state).toMatchObject({ phase: "lobby", nickname: "Hoa", score: 0, question_total: 3, player_count: 2 });
    // Id phiên (để nghe kênh Realtime) chỉ trả cho người giữ mã tham gia.
    expect(state.session_id).toBe(s.id);
    expect(state.question).toBeUndefined();
    expectNoKey(state, "phòng chờ");
    const text = JSON.stringify(state);
    for (const q of secretQuestions) expect(text).not.toContain(q.prompt);
    expect((await submit(p1, 0)).error?.message).toContain("answer_closed");
  });

  it("khi câu đang mở: có đề và lựa chọn, tuyệt đối không có khoá đáp án, không lộ câu sau", async () => {
    await hostOk(t, "host_open_question", { p_session: s.id });
    const state = await playerState(p1);
    expect(state.phase).toBe("question");
    expect(state.question).toEqual({
      kind: "single",
      prompt: questions[0].prompt,
      time_limit_seconds: 20,
      options: ["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"],
    });
    expect(state).toMatchObject({ question_index: 1, answered: false, time_up: false });
    expectNoKey(state, "câu đang mở");
    const text = JSON.stringify(state);
    expect(text).not.toContain(secretQuestions[1].prompt);
    expect(text).not.toContain(secretAnswer);
  });

  it("câu trả lời sai dạng bị từ chối và không ghi gì", async () => {
    for (const bad of [4, -1, 1.5, "0", [0], null, {}, true, 100000, 12345678901234567890]) {
      const { error } = await submit(p1, bad);
      expect(error?.message, `đáp án ${JSON.stringify(bad)}`).toContain("invalid_answer");
    }
    const rows = await t.client.from("answers").select("participant_id").eq("session_id", s.id);
    expect(rows.data).toEqual([]);
  });

  it("mỗi người một đáp án mỗi câu, không sửa được", async () => {
    await submitOk(p1, 0);
    expect((await submit(p1, 1)).error?.message).toContain("already_answered");
    expect((await submit(p1, 0)).error?.message).toContain("already_answered");
    expect((await playerState(p1)).answered).toBe(true);
    expect((await playerState(p2)).answered).toBe(false);
    const state = await hostState(t, s.id);
    expect(state.answered_count).toBe(1);
  });

  it("đóng câu rồi không nộp thêm được; sau đó mới có đáp án đúng, kết quả của chính mình và hạng", async () => {
    await hostOk(t, "host_close_question", { p_session: s.id });
    expect((await submit(p2, 0)).error?.message).toContain("answer_closed");

    const mine = await playerState(p1);
    expect(mine).toMatchObject({ phase: "reveal", answered: true, is_correct: true, your_answer: 0, rank: 1 });
    expect(mine.points).toBeGreaterThanOrEqual(500);
    expect(mine.key).toEqual({ correct: [0] });

    const theirs = await playerState(p2);
    expect(theirs).toMatchObject({ phase: "reveal", answered: false, is_correct: false, points: 0, rank: 2 });
    expect(theirs.your_answer).toBeNull();
    // Không có đáp án của người khác, không có mã tham gia của ai.
    expect(JSON.stringify(theirs)).not.toContain(p1);
    expect(allKeys(theirs).has("token")).toBe(false);
  });

  it("câu điền từ đang mở không lộ đáp án chấp nhận; câu sau vẫn ẩn cho tới khi mở", async () => {
    await hostOk(t, "host_next", { p_session: s.id });
    const state = await playerState(p1);
    expect(state.question.prompt).toBe("Câu điền từ riêng");
    expectNoKey(state, "câu điền từ");
    const text = JSON.stringify(state);
    expect(text).not.toContain(secretAnswer);
    expect(text).not.toContain(secretQuestions[2].prompt);
    expect((await submit(p1, "")).error?.message).toContain("invalid_answer");
    expect((await submit(p1, "   \t ")).error?.message).toContain("invalid_answer");
    expect((await submit(p1, "x".repeat(201))).error?.message).toContain("invalid_answer");
    expect((await submit(p1, 0)).error?.message).toContain("invalid_answer");
    await submitOk(p1, "một đáp án sai");
  });

  it("bảng xếp hạng chỉ có hạng, biệt danh, điểm; kết thúc thì trả top 3", async () => {
    await hostOk(t, "host_close_question", { p_session: s.id });
    const { data, error } = await anon.rpc("player_leaderboard", { p_token: p2 });
    expect(error).toBeNull();
    const board = data as { top: { rank: number; nickname: string; score: number }[]; me: { rank: number; score: number; nickname: string } };
    expect(board.top.map((row) => row.nickname)).toEqual(["Hoa", "Lan"]);
    expect(board.me).toMatchObject({ rank: 2, score: 0, nickname: "Lan" });
    expect(allKeys(board).has("token")).toBe(false);

    await hostOk(t, "host_end_session", { p_session: s.id });
    const ended = await playerState(p1);
    expect(ended).toMatchObject({ phase: "ended", rank: 1, player_total: 2 });
    expect(ended.question).toBeUndefined();
    expectNoKey(ended, "kết thúc");
    expect((await submit(p1, 0)).error?.message).toContain("answer_closed");
  });

  it("hạn chót theo giờ máy chủ: nộp trễ bị từ chối dù đồng hồ máy khách thế nào", async () => {
    const host2 = await signUp("live-late");
    const late = await startSession(host2, await newQuiz(host2, [questions[0]]));
    const early = await joinOk(late.pin, "Kịp giờ");
    const tardy = await joinOk(late.pin, "Trễ giờ");
    await setTimeLimit(late.id, 2);
    await hostOk(host2, "host_open_question", { p_session: late.id });

    const state = await playerState(early);
    expect(state.question.time_limit_seconds).toBe(2);
    await submitOk(early, 0);

    await sleep(2300);
    const after = await playerState(tardy);
    expect(after).toMatchObject({ phase: "question", time_up: true });
    expect((await submit(tardy, 0)).error?.message).toContain("answer_closed");

    await hostOk(host2, "host_close_question", { p_session: late.id });
    const rows = await host2.client.from("answers").select("participant_id").eq("session_id", late.id);
    expect(rows.data).toHaveLength(1);
    await hostOk(host2, "host_end_session", { p_session: late.id });
  });
});

// ---------------------------------------------------------------------------------------------
describe("3.3 vào phòng", () => {
  let t: TestUser;
  let s: { id: string; pin: string };

  beforeAll(async () => {
    t = await signUp("live-j");
    s = await startSession(t, await newQuiz(t));
  }, 60_000);

  afterAll(async () => {
    await host(t, "host_end_session", { p_session: s.id });
  });

  it("PIN sai, rỗng hoặc sai dạng đều báo invalid_pin", async () => {
    for (const pin of ["000000", "", "abcdef", "12345", " ", "1234567"]) {
      expect((await join(pin, "Ai đó")).result, `PIN "${pin}"`).toBe("invalid_pin");
    }
    expect((await join(s.pin, "Đúng PIN")).result).toBe("ok");
  });

  it("biệt danh: cắt khoảng trắng, không trùng (không phân biệt hoa thường và dấu cách thừa), 1-20 ký tự", async () => {
    const ok = await join(s.pin, "  Nguyễn   Văn  A  ");
    expect(ok).toMatchObject({ result: "ok", player_nickname: "Nguyễn Văn A" });
    expect((await join(s.pin, "nguyễn văn a")).result).toBe("nickname_taken");
    expect((await join(s.pin, "NGUYỄN VĂN A")).result).toBe("nickname_taken");
    expect((await join(s.pin, "Ánh")).result).toBe("ok");
    expect((await join(s.pin, "ánh")).result).toBe("nickname_taken");

    for (const bad of ["", "   ", "x".repeat(21), "chuông\u0007báo"]) {
      expect((await join(s.pin, bad)).result, `biệt danh ${JSON.stringify(bad)}`).toBe("invalid_nickname");
    }
    expect((await join(s.pin, "y".repeat(20))).result).toBe("ok");
    // Tab và xuống dòng bên trong được gộp thành một dấu cách.
    expect(await join(s.pin, "tab\tgiữa\nhai")).toMatchObject({ result: "ok", player_nickname: "tab giữa hai" });
    expect((await anon.rpc("join_session", { p_pin: s.pin, p_nickname: null })).data).toEqual([
      { result: "invalid_nickname", player_token: null, player_nickname: null },
    ]);
  });

  it("kết quả trả về học sinh chỉ gồm mã kết quả, mã tham gia của chính mình và biệt danh", async () => {
    const { data } = await anon.rpc("join_session", { p_pin: s.pin, p_nickname: "Chỉ mình tôi" });
    const row = (data as Record<string, unknown>[])[0];
    expect(Object.keys(row).sort()).toEqual(["player_nickname", "player_token", "result"]);
  });
});

// ---------------------------------------------------------------------------------------------
describe("3.4 chấm điểm và so khớp", () => {
  type Case = { nick: string; answer?: unknown; correct?: boolean };
  const scoringQuestions: QuestionInput[] = [
    questions[0],
    questions[1],
    questions[2],
    questions[3],
    { kind: "short_text", prompt: "Thành phố bên sông Hàn?", accepted_answers: ["Đà Nẵng"], ignore_diacritics: true },
  ];
  const plan: Case[][] = [
    [
      { nick: "s-đúng", answer: 0, correct: true },
      { nick: "s-sai", answer: 1, correct: false },
      { nick: "s-bỏ" },
    ],
    [
      { nick: "tf-đúng", answer: 1, correct: true },
      { nick: "tf-sai", answer: 0, correct: false },
    ],
    [
      { nick: "m-đủ", answer: [0, 2], correct: true },
      { nick: "m-đảo", answer: [2, 0], correct: true },
      { nick: "m-thiếu", answer: [0], correct: false },
      { nick: "m-thừa", answer: [0, 1, 2], correct: false },
      { nick: "m-sai", answer: [1, 3], correct: false },
    ],
    [
      { nick: "t-đúng", answer: "con mèo", correct: true },
      { nick: "t-hoa", answer: "  CON    MÈO ", correct: true },
      { nick: "t-khác", answer: "Mèo", correct: true },
      { nick: "t-bỏ dấu", answer: "con meo", correct: false },
      { nick: "t-sai", answer: "chó", correct: false },
    ],
    [
      { nick: "d-không dấu", answer: "da nang", correct: true },
      { nick: "d-có dấu", answer: "ĐÀ NẴNG", correct: true },
      { nick: "d-sai", answer: "hue", correct: false },
    ],
  ];

  async function playAll(t: TestUser, speedBonus: boolean) {
    const s = await startSession(t, await newQuiz(t, scoringQuestions), speedBonus);
    const tokens = new Map<string, string>();
    for (const nick of plan.flat().map((c) => c.nick)) tokens.set(nick, await joinOk(s.pin, nick));
    const ids = new Map<string, string>(((await hostState(t, s.id)).players as { id: string; nickname: string }[]).map((p) => [p.nickname, p.id]));
    const results: { case: Case; position: number; is_correct: boolean | undefined; points: number | undefined; response_ms: number | undefined }[] = [];

    for (let position = 0; position < plan.length; position++) {
      await hostOk(t, position === 0 ? "host_open_question" : "host_next", { p_session: s.id });
      for (const c of plan[position]) if (c.answer !== undefined) await submitOk(tokens.get(c.nick)!, c.answer);
      await hostOk(t, "host_close_question", { p_session: s.id });
      const rows = await t.client.from("answers").select("participant_id, is_correct, points, response_ms").eq("session_id", s.id).eq("position", position);
      for (const c of plan[position]) {
        const row = (rows.data as { participant_id: string; is_correct: boolean; points: number; response_ms: number }[]).find((r) => r.participant_id === ids.get(c.nick));
        results.push({ case: c, position, is_correct: row?.is_correct, points: row?.points, response_ms: row?.response_ms });
      }
    }
    return { s, tokens, ids, results };
  }

  let t: TestUser;
  beforeAll(async () => {
    t = await signUp("live-score");
  }, 60_000);

  it("đúng/sai theo từng dạng: một đáp án, đúng sai, nhiều đáp án (đủ và không thừa), điền từ", async () => {
    const { s, results } = await playAll(t, true);
    for (const r of results) {
      if (r.case.answer === undefined) {
        expect(r.is_correct, `${r.case.nick} không nộp`).toBeUndefined();
        continue;
      }
      expect(r.is_correct, `${r.case.nick} trả lời ${JSON.stringify(r.case.answer)}`).toBe(r.case.correct);
      if (!r.case.correct) expect(r.points, r.case.nick).toBe(0);
    }
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("điểm cơ bản 1000; bật thưởng tốc độ thì theo công thức, trong khoảng 500-1000", async () => {
    const { s, results, ids } = await playAll(t, true);
    for (const r of results.filter((x) => x.case.correct)) {
      const limitMs = 20_000;
      const expected = Math.max(500, Math.min(1000, Math.round(1000 * (1 - (0.5 * (r.response_ms as number)) / limitMs))));
      expect(r.points, r.case.nick).toBe(expected);
      expect(r.points).toBeGreaterThanOrEqual(500);
      expect(r.points).toBeLessThanOrEqual(1000);
    }
    // Tổng điểm của người chơi bằng tổng điểm các câu của họ.
    const rows = await t.client.from("participants").select("id, nickname, score").eq("session_id", s.id);
    const totals = new Map<string, number>();
    for (const r of results) totals.set(r.case.nick, (totals.get(r.case.nick) ?? 0) + (r.points ?? 0));
    for (const p of rows.data as { id: string; nickname: string; score: number }[]) {
      expect(p.score, p.nickname).toBe(totals.get(p.nickname) ?? 0);
      expect(ids.get(p.nickname)).toBe(p.id);
    }
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("tắt thưởng tốc độ thì mỗi câu đúng đúng 1000 điểm", async () => {
    const { s, results } = await playAll(t, false);
    for (const r of results.filter((x) => x.case.correct)) expect(r.points, r.case.nick).toBe(1000);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("trả lời chậm hơn thì điểm thấp hơn theo công thức", async () => {
    const s = await startSession(t, await newQuiz(t, [questions[0]]), true);
    const fast = await joinOk(s.pin, "Nhanh");
    const slow = await joinOk(s.pin, "Chậm");
    await hostOk(t, "host_open_question", { p_session: s.id });
    await submitOk(fast, 0);
    await sleep(1500);
    await submitOk(slow, 0);
    await hostOk(t, "host_close_question", { p_session: s.id });
    const rows = await t.client.from("answers").select("points, response_ms").eq("session_id", s.id).order("response_ms");
    const [first, second] = rows.data as { points: number; response_ms: number }[];
    expect(second.response_ms).toBeGreaterThanOrEqual(1500);
    expect(second.points).toBeLessThan(first.points);
    expect(second.points).toBe(Math.round(1000 * (1 - (0.5 * second.response_ms) / 20_000)));
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("hạng: đồng điểm cùng hạng, người bị loại không được tính", async () => {
    const s = await startSession(t, await newQuiz(t, [questions[0]]), false);
    const a = await joinOk(s.pin, "Nhất");
    const b = await joinOk(s.pin, "Sau 1");
    const c = await joinOk(s.pin, "Sau 2");
    const d = await joinOk(s.pin, "Bị loại");
    await hostOk(t, "host_open_question", { p_session: s.id });
    await submitOk(a, 0);
    await submitOk(d, 0);
    await submitOk(b, 1);
    const players = (await hostState(t, s.id)).players as { id: string; nickname: string }[];
    await hostOk(t, "host_remove_participant", { p_session: s.id, p_participant: players.find((p) => p.nickname === "Bị loại")!.id });
    await hostOk(t, "host_close_question", { p_session: s.id });

    const rank = async (token: string) => ((await anon.rpc("player_leaderboard", { p_token: token })).data as { me: { rank: number } }).me.rank;
    expect(await rank(a)).toBe(1);
    expect(await rank(b)).toBe(2);
    expect(await rank(c)).toBe(2);
    const board = ((await anon.rpc("player_leaderboard", { p_token: a })).data as { top: { nickname: string; rank: number }[] }).top;
    expect(board.map((row) => row.nickname)).not.toContain("Bị loại");
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("normalize_answer: giữ dấu tiếng Việt theo mặc định; bỏ dấu khi được bật; gộp khoảng trắng; chuẩn hoá Unicode", () => {
    const cases: [string, boolean, string][] = [
      ["Má", false, "má"],
      ["ma", false, "ma"],
      ["  Hà   Nội  ", false, "hà nội"],
      ["\tHà\nNội ", false, "hà nội"],
      ["Đà Nẵng", false, "đà nẵng"],
      ["Đà Nẵng", true, "da nang"],
      ["ĐÀ NẴNG", true, "da nang"],
      ["Má", true, "ma"],
      ["", false, ""],
      ["   ", true, ""],
    ];
    // Bọc trong [ ] để dòng rỗng không bị cắt mất ở cuối đầu ra.
    const sql = cases.map(([text, ignore]) => `select '[' || private.normalize_answer($q$${text}$q$, ${ignore}) || ']';`).join("\n");
    expect(psql(sql).split("\n")).toEqual(cases.map(([, , expected]) => `[${expected}]`));

    // "ma" khác "má" khi giữ dấu, bằng nhau khi bỏ dấu.
    expect(psql(`select private.normalize_answer('ma', false) = private.normalize_answer('má', false);`)).toBe("f");
    expect(psql(`select private.normalize_answer('ma', true) = private.normalize_answer('má', true);`)).toBe("t");
    // Chữ có dấu gõ kiểu tổ hợp bằng chữ dựng sẵn.
    expect(psql(`select private.normalize_answer(U&'Ha\\0302\\0323', false) = private.normalize_answer('Hậ', false);`)).toBe("t");
  });
});

// ---------------------------------------------------------------------------------------------
describe("3.5 nhập sai PIN không bị giới hạn và không lưu địa chỉ IP", () => {
  let t: TestUser;
  let s: { id: string; pin: string };

  beforeAll(async () => {
    t = await signUp("live-pin");
    s = await startSession(t, await newQuiz(t));
  }, 60_000);

  afterAll(async () => {
    await host(t, "host_end_session", { p_session: s.id });
  });

  it("gõ sai bao nhiêu lần cũng được; gõ đúng thì vào ngay (không khoá cả lớp dùng chung địa chỉ mạng)", async () => {
    for (let i = 0; i < 40; i++) {
      expect((await join(String(100000 + i), "x")).result, `lần sai ${i + 1}`).toBe("invalid_pin");
    }
    expect((await join(s.pin, "Sau 40 lần sai")).result).toBe("ok");
  }, 60_000);

  it("qua psql: 60 lần sai liên tiếp từ cùng một địa chỉ rồi PIN đúng vẫn vào được", () => {
    const out = psql(`begin;
set local role anon;
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.7"}', true);
select public.join_session('000000', 'x') from generate_series(1, 60);
select (public.join_session('${s.pin}', 'Sau 60 lần sai')).result;
commit;`);
    expect(out.split("\n").at(-2) ?? out).toContain("ok");
  });

  it("không còn bảng, hàm hay muối dùng để lưu hay băm địa chỉ IP", () => {
    expect(psql("select to_regclass('public.join_attempts') is null;")).toBe("t");
    expect(psql("select to_regclass('private.secrets') is null;")).toBe("t");
    expect(psql("select count(*) from pg_proc where proname in ('client_ip', 'hash_ip');")).toBe("0");
  });
});

// ---------------------------------------------------------------------------------------------
describe("host_close_if_expired: chỉ đóng khi giờ máy chủ đã qua hạn", () => {
  it("chưa tới hạn thì không đóng; qua hạn thì đóng và chấm điểm; gọi lại thì không làm gì", async () => {
    const t = await signUp("live-expire");
    const s = await startSession(t, await newQuiz(t, [questions[0]]), false);
    const token = await joinOk(s.pin, "Kịp giờ");
    await setTimeLimit(s.id, 2);

    // Còn ở phòng chờ: không có câu nào đang mở.
    expect((await t.client.rpc("host_close_if_expired", { p_session: s.id })).data).toBe(false);
    await hostOk(t, "host_open_question", { p_session: s.id });
    await submitOk(token, 0);

    // Chưa tới hạn (trình duyệt có thể tưởng đã hết giờ nhưng máy chủ biết rõ hơn): không đóng.
    const early = await t.client.rpc("host_close_if_expired", { p_session: s.id });
    expect(early.error).toBeNull();
    expect(early.data).toBe(false);
    expect((await hostState(t, s.id)).status).toBe("question");

    await sleep(2300);
    const late = await t.client.rpc("host_close_if_expired", { p_session: s.id });
    expect(late.data).toBe(true);
    const state = await hostState(t, s.id);
    expect(state.status).toBe("reveal");
    expect((state.players as { score: number }[])[0].score).toBe(1000);
    // Đã đóng rồi: không đóng lần hai, không chấm hai lần.
    expect((await t.client.rpc("host_close_if_expired", { p_session: s.id })).data).toBe(false);
    expect(((await hostState(t, s.id)).players as { score: number }[])[0].score).toBe(1000);
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("người khác và khách bị từ chối", async () => {
    const t = await signUp("live-expire2");
    const other = await signUp("live-expire3");
    const s = await startSession(t, await newQuiz(t));
    expect((await other.client.rpc("host_close_if_expired", { p_session: s.id })).error?.message).toContain("session_not_found");
    expect((await anon.rpc("host_close_if_expired", { p_session: s.id })).error?.code).toBe("42501");
    expect((await rpcStatus("host_close_if_expired", { p_session: s.id }, other)).status).toBe(404);
    await hostOk(t, "host_end_session", { p_session: s.id });
  });
});

// ---------------------------------------------------------------------------------------------
describe("học sinh tự rời phòng", () => {
  let t: TestUser;
  beforeAll(async () => {
    t = await signUp("live-leave");
  }, 60_000);

  it("rời ở phòng chờ: xoá dòng, trả lại chỗ và biệt danh; token cũ không dùng được nữa", async () => {
    const s = await startSession(t, await newQuiz(t));
    const token = await joinOk(s.pin, "Mai");
    expect((await hostState(t, s.id)).players).toHaveLength(1);
    expect((await join(s.pin, "mai")).result).toBe("nickname_taken");

    const left = await leave(token);
    expect(left.error).toBeNull();
    expect((await hostState(t, s.id)).players).toHaveLength(0);
    expect((await anon.rpc("player_state", { p_token: token })).error?.message).toContain("invalid_token");
    expect((await leave(token)).error?.message).toContain("invalid_token");
    // Vào lại bằng đúng tên cũ được vì không còn người ma.
    expect((await join(s.pin, "Mai")).result).toBe("ok");
    await hostOk(t, "host_end_session", { p_session: s.id });
  });

  it("phòng đầy 50 người: một bạn rời thì bạn khác vào được", async () => {
    const s = await startSession(t, await newQuiz(t));
    const tokens: string[] = [];
    for (let i = 0; i < 50; i += 1) tokens.push(await joinOk(s.pin, `Bạn ${i}`));
    expect((await join(s.pin, "Thứ 51")).result).toBe("room_full");
    expect((await leave(tokens[7])).error).toBeNull();
    expect((await join(s.pin, "Thứ 51")).result).toBe("ok");
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);

  it("rời khi đã bắt đầu: không còn tính vào xếp hạng và số trả lời, biệt danh trống để dùng lại; người bị loại thì giữ tên", async () => {
    const s = await startSession(t, await newQuiz(t, [questions[0]]), false);
    const a = await joinOk(s.pin, "Rời đi");
    const b = await joinOk(s.pin, "Bị loại");
    const c = await joinOk(s.pin, "Ở lại");
    await hostOk(t, "host_open_question", { p_session: s.id });
    await submitOk(a, 0);
    await submitOk(c, 0);
    const players = (await hostState(t, s.id)).players as { id: string; nickname: string }[];

    expect((await leave(a)).error).toBeNull();
    await hostOk(t, "host_remove_participant", { p_session: s.id, p_participant: players.find((p) => p.nickname === "Bị loại")!.id });
    // Người đã bị loại gọi rời phòng: không lỗi, không đổi gì (tên vẫn bị giữ).
    expect((await leave(b)).error).toBeNull();

    const state = await hostState(t, s.id);
    const byName = Object.fromEntries((state.players as { nickname: string; removed: boolean; left: boolean }[]).map((p) => [p.nickname, p]));
    expect(byName["Rời đi"]).toMatchObject({ removed: true, left: true });
    expect(byName["Bị loại"]).toMatchObject({ removed: true, left: false });
    expect(byName["Ở lại"]).toMatchObject({ removed: false, left: false });
    expect(state.answered_count).toBe(1);
    expect((await playerState(a)).phase).toBe("removed");

    await hostOk(t, "host_close_question", { p_session: s.id });
    const board = (await anon.rpc("player_leaderboard", { p_token: c })).data as { top: { nickname: string }[]; me: { rank: number } };
    expect(board.top.map((row) => row.nickname)).toEqual(["Ở lại"]);
    expect(board.me.rank).toBe(1);
    expect((await join(s.pin, "Rời đi")).result).toBe("session_started");
    await hostOk(t, "host_end_session", { p_session: s.id });
    // Phiên đã kết thúc: rời phòng không lỗi.
    expect((await leave(c)).error).toBeNull();
  });

  it("mã tham gia sai thì từ chối, và rời phòng không đụng tới người khác", async () => {
    const s = await startSession(t, await newQuiz(t));
    const other = await joinOk(s.pin, "Người khác");
    expect((await leave(crypto.randomUUID())).error?.message).toContain("invalid_token");
    expect((await anon.rpc("leave_session", { p_token: "khong-phai-uuid" })).error).not.toBeNull();
    expect((await playerState(other)).phase).toBe("lobby");
    await hostOk(t, "host_end_session", { p_session: s.id });
  });
});

// ---------------------------------------------------------------------------------------------
describe("đáp án của chính mình trong lúc câu đang mở", () => {
  it("chỉ có sau khi đã gửi và chỉ là đáp án của mình, không kèm khoá", async () => {
    const t = await signUp("live-mine");
    const s = await startSession(t, await newQuiz(t, [questions[0], questions[3]]));
    const a = await joinOk(s.pin, "A");
    const b = await joinOk(s.pin, "B");
    await hostOk(t, "host_open_question", { p_session: s.id });

    expect((await playerState(a)).your_answer).toBeNull();
    await submitOk(a, 2);
    const mine = await playerState(a);
    expect(mine.your_answer).toBe(2);
    expect(mine.answered).toBe(true);
    // Người khác không thấy đáp án của A.
    const theirs = await playerState(b);
    expect(theirs.your_answer).toBeNull();
    expect(JSON.stringify(theirs)).not.toContain('"your_answer":2');
    for (const key of ["is_correct", "correct", "key", "accepted_answers"]) expect(allKeys(mine).has(key), key).toBe(false);

    await hostOk(t, "host_close_question", { p_session: s.id });
    await hostOk(t, "host_next", { p_session: s.id });
    await submitOk(b, "  con mèo ");
    expect((await playerState(b)).your_answer).toBe("  con mèo ");
    await hostOk(t, "host_end_session", { p_session: s.id });
  });
});

// ---------------------------------------------------------------------------------------------
describe("mã HTTP của lỗi nghiệp vụ (không được là lỗi máy chủ 5xx)", () => {
  it("từ chối hợp lệ trả 4xx với thông báo cố định; chỉ lỗi thật mới là 5xx", async () => {
    const t = await signUp("live-http");
    const other = await signUp("live-http2");
    const quizId = await newQuiz(t, [questions[0]]);
    const s = await startSession(t, quizId);
    const token = await joinOk(s.pin, "Mã HTTP");
    const quiet = await joinOk(s.pin, "Im lặng");

    const cases: [string, number, string, Record<string, unknown>, TestUser | undefined][] = [
      ["mã tham gia sai", 404, "player_state", { p_token: crypto.randomUUID() }, undefined],
      ["nộp khi chưa mở", 409, "submit_answer", { p_token: token, p_answer: 0 }, undefined],
      ["host_next sai thứ tự", 409, "host_next", { p_session: s.id }, t],
      ["phiên của người khác", 404, "host_state", { p_session: s.id }, other],
      ["khách gọi hàm giáo viên", 401, "host_state", { p_session: s.id }, undefined],
      ["quiz không tồn tại", 404, "quiz_problems", { p_quiz_id: crypto.randomUUID() }, t],
      ["link chia sẻ không tồn tại", 404, "get_shared_quiz", { p_token: crypto.randomUUID() }, t],
      ["xoá câu hỏi không tồn tại", 404, "delete_question", { p_question_id: crypto.randomUUID() }, t],
    ];
    for (const [label, expected, fn, body, user] of cases) {
      const result = await rpcStatus(fn, body, user);
      expect(result.status, `${label} (${fn}): ${result.message}`).toBe(expected);
    }

    await hostOk(t, "host_open_question", { p_session: s.id });
    expect((await rpcStatus("submit_answer", { p_token: token, p_answer: "x" })).status).toBe(400);
    await submitOk(token, 0);
    expect((await rpcStatus("submit_answer", { p_token: token, p_answer: 0 })).status).toBe(409);
    await hostOk(t, "host_close_question", { p_session: s.id });
    expect((await rpcStatus("submit_answer", { p_token: quiet, p_answer: 0 })).status, "nộp sau khi đóng").toBe(409);
    await hostOk(t, "host_end_session", { p_session: s.id });
    expect((await rpcStatus("host_next", { p_session: s.id }, t)).status, "phiên đã kết thúc").toBe(409);
  }, 60_000);
});

// ---------------------------------------------------------------------------------------------
describe("xếp hạng đồng hạng và phân bố câu trả lời", () => {
  let t: TestUser;
  beforeAll(async () => {
    t = await signUp("live-board");
  }, 60_000);

  it("đồng hạng vẫn chỉ trả đúng top 5 (và top 3 khi kết thúc), cùng thứ hạng", async () => {
    const s = await startSession(t, await newQuiz(t, [questions[0]]));
    const tokens: string[] = [];
    for (let i = 0; i < 12; i++) tokens.push(await joinOk(s.pin, `Bạn ${i + 1}`));
    await hostOk(t, "host_open_question", { p_session: s.id });
    await hostOk(t, "host_close_question", { p_session: s.id });

    const state = await hostState(t, s.id);
    expect(state.leaderboard).toHaveLength(5);
    expect(state.leaderboard.map((row: { rank: number }) => row.rank)).toEqual([1, 1, 1, 1, 1]);
    const board = (await anon.rpc("player_leaderboard", { p_token: tokens[11] })).data as { top: unknown[]; me: { rank: number } };
    expect(board.top).toHaveLength(5);
    expect(board.me.rank).toBe(1);

    await hostOk(t, "host_end_session", { p_session: s.id });
    const ended = (await anon.rpc("player_leaderboard", { p_token: tokens[0] })).data as { top: unknown[] };
    expect(ended.top).toHaveLength(3);
  });

  it("phân bố: số đúng, sai, bỏ trống và lượt chọn từng lựa chọn (không tính người bị loại)", async () => {
    const s = await startSession(t, await newQuiz(t, [questions[0], questions[2]]), false);
    const tokens: string[] = [];
    for (let i = 0; i < 8; i++) tokens.push(await joinOk(s.pin, `P${i}`));
    await hostOk(t, "host_open_question", { p_session: s.id });
    // 3 chọn A (đúng), 2 chọn B, 1 chọn C, 1 chọn A nhưng sẽ bị loại, 1 bỏ trống.
    const picks = [0, 0, 0, 1, 1, 2, 0];
    for (let i = 0; i < picks.length; i++) await submitOk(tokens[i], picks[i]);
    const during = await hostState(t, s.id);
    expect(during.answered_count).toBe(7);
    const removed = (during.players as { id: string; nickname: string }[]).find((p) => p.nickname === "P6")!;
    await hostOk(t, "host_remove_participant", { p_session: s.id, p_participant: removed.id });
    expect((await hostState(t, s.id)).answered_count).toBe(6);

    await hostOk(t, "host_close_question", { p_session: s.id });
    const revealed = await hostState(t, s.id);
    expect(revealed.key).toEqual({ correct: [0] });
    expect(revealed.distribution).toEqual({ correct: 3, wrong: 3, unanswered: 1, options: [3, 2, 1, 0] });

    // Câu nhiều đáp án: mỗi lựa chọn được tính theo số người chọn nó.
    await hostOk(t, "host_next", { p_session: s.id });
    await submitOk(tokens[0], [0, 2]);
    await submitOk(tokens[1], [0, 1]);
    await submitOk(tokens[2], [3]);
    await hostOk(t, "host_close_question", { p_session: s.id });
    const second = await hostState(t, s.id);
    expect(second.distribution).toEqual({ correct: 1, wrong: 2, unanswered: 4, options: [2, 1, 1, 1] });
    await hostOk(t, "host_end_session", { p_session: s.id });
  });
});

// ---------------------------------------------------------------------------------------------
describe("chạy đua giữa nộp đáp án và đóng câu", () => {
  it("nộp đáp án phải chờ giáo viên đang đóng câu xong rồi mới xét, và bị từ chối (xác định, không phụ thuộc may rủi)", async () => {
    const t = await signUp("live-lock");
    const s = await startSession(t, await newQuiz(t, [questions[0]]));
    const token = await joinOk(s.pin, "Nộp giữa chừng");
    await hostOk(t, "host_open_question", { p_session: s.id });

    // Giả lập giáo viên đang đóng câu: giữ khoá độc quyền trên dòng phiên rồi mới chuyển sang pha hiện đáp án.
    const closing = psqlAsync(`begin;
select 1 from public.live_sessions where id = '${s.id}' for update;
select pg_sleep(1.5);
update public.live_sessions set status = 'reveal', question_closes_at = clock_timestamp(), seq = seq + 1 where id = '${s.id}';
commit;`);
    await sleep(500);
    const started = Date.now();
    const result = await submit(token, 0);
    const waited = Date.now() - started;
    await closing;

    expect(result.error?.message).toContain("answer_closed");
    // Phải bị chặn chờ khoá (còn khoảng 1 giây), không phải trả về ngay với trạng thái cũ.
    expect(waited).toBeGreaterThanOrEqual(700);
    const rows = await t.client.from("answers").select("participant_id").eq("session_id", s.id);
    expect(rows.data).toEqual([]);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 30_000);

  it("không có câu trả lời nào lọt vào sau khi chấm điểm: nộp xong thì đã được chấm, còn lại bị từ chối", async () => {
    const t = await signUp("live-race");
    const rounds: QuestionInput[] = Array.from({ length: 10 }, () => questions[0]);
    const s = await startSession(t, await newQuiz(t, rounds), false);
    const tokens: string[] = [];
    for (let i = 0; i < 40; i++) tokens.push(await joinOk(s.pin, `Đua ${i + 1}`));

    for (let round = 0; round < rounds.length; round++) {
      await hostOk(t, round === 0 ? "host_open_question" : "host_next", { p_session: s.id });
      const submits = tokens.map((token) => submit(token, 0));
      const closing = (async () => {
        await sleep(1 + round * 2);
        return host(t, "host_close_question", { p_session: s.id });
      })();
      const [results, closed] = await Promise.all([Promise.all(submits), closing]);
      expect(closed.error, "đóng câu").toBeNull();

      const accepted = results.filter((r) => r.error === null).length;
      for (const r of results) if (r.error) expect(r.error.message).toContain("answer_closed");

      const rows = await t.client.from("answers").select("is_correct, points").eq("session_id", s.id).eq("position", round);
      const stored = rows.data as { is_correct: boolean; points: number }[];
      // Mọi câu trả lời đã được nhận đều đúng (chọn A) nên phải được chấm 1000; một dòng chưa chấm là đã lọt qua.
      expect(stored, `vòng ${round + 1}`).toHaveLength(accepted);
      expect(stored.every((row) => row.is_correct && row.points === 1000), `vòng ${round + 1}: có câu trả lời chưa được chấm`).toBe(true);
    }
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);
});
