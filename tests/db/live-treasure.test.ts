import { afterAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, signUp, simpleQuestion, type TestUser } from "./helpers";
import { allKeys, host, hostOk, hostState, joinOk, newQuiz, playerState, psql, psqlAsync, rpcStatus, startSession, submitOk, type Json } from "./live-helpers";

/**
 * Kho báu (phase 3 của giai đoạn 2.5): chuỗi thắng/thua, phát rương, mở rương, hiệu ứng ngẫu nhiên, chốt rương và quyền.
 * Cần \`npm run supabase:start\`. Mọi luật ở Postgres; học sinh chỉ gọi được \`open_chest\` bằng mã tham gia của chính mình.
 */

afterAll(async () => {
  await cleanupUsers();
});

type Move = "C" | "W" | "-"; // đúng, sai, bỏ trống

type Session = { id: string; pin: string; tokens: Record<string, string> };

/** Quiz n câu một đáp án (A đúng, B sai), phiên bật chế độ kho báu, các bạn đã vào phòng. */
async function treasureSession(t: TestUser, names: string[], questionCount: number, options: Record<string, unknown> = { treasure_mode: true }): Promise<Session> {
  const quizId = await newQuiz(
    t,
    Array.from({ length: questionCount }, (_, i) => simpleQuestion(`Câu ${i + 1}`)),
  );
  const s = await startSession(t, quizId, false, options);
  const tokens: Record<string, string> = {};
  for (const name of names) tokens[name] = await joinOk(s.pin, name);
  return { ...s, tokens };
}

/** Chơi một câu: mở (hoặc sang câu kế), mỗi bạn đúng/sai/bỏ trống theo \`moves\`, rồi đóng câu để chấm điểm. */
async function round(t: TestUser, s: Session, index: number, moves: Record<string, Move>) {
  await hostOk(t, index === 1 ? "host_open_question" : "host_next", { p_session: s.id });
  for (const [name, move] of Object.entries(moves)) {
    if (move !== "-") await submitOk(s.tokens[name], move === "C" ? 0 : 1);
  }
  await hostOk(t, "host_close_question", { p_session: s.id });
}

async function playPatterns(t: TestUser, s: Session, patterns: Record<string, string>) {
  const rounds = Math.max(...Object.values(patterns).map((p) => p.length));
  for (let i = 0; i < rounds; i += 1) {
    const moves = Object.fromEntries(Object.entries(patterns).map(([name, pattern]) => [name, (pattern[i] ?? "-") as Move]));
    await round(t, s, i + 1, moves);
  }
}

type ChestRow = { position: number; kind: string; status: string; nickname: string };

async function chests(sessionId: string, nickname?: string): Promise<ChestRow[]> {
  const { data, error } = await admin
    .from("treasure_chests")
    .select("position, kind, status, participants!inner(nickname)")
    .eq("session_id", sessionId)
    .order("position");
  expect(error).toBeNull();
  const rows = (data as unknown as { position: number; kind: string; status: string; participants: { nickname: string } }[]).map((r) => ({
    position: r.position,
    kind: r.kind,
    status: r.status,
    nickname: r.participants.nickname,
  }));
  return nickname ? rows.filter((r) => r.nickname === nickname) : rows;
}

async function streaks(sessionId: string, nickname: string) {
  const { data, error } = await admin.from("participants").select("win_streak, lose_streak").eq("session_id", sessionId).eq("nickname", nickname).single();
  expect(error).toBeNull();
  return data as { win_streak: number; lose_streak: number };
}

async function openChest(token: string) {
  return anon.rpc("open_chest", { p_token: token });
}

async function openOk(token: string): Promise<Json> {
  const { data, error } = await openChest(token);
  expect(error, "open_chest").toBeNull();
  return data as Json;
}

const ALLOWED_WIN = ["add:500", "add:1000", "mul:2", "mul:1.5", "sub:300", "div:2"];
const ALLOWED_COMFORT = ["add:500", "add:1000", "mul:2"];

describe("luật chuỗi và phát rương", () => {
  it("3 đúng liền nhau cho rương thắng; 3 sai hoặc bỏ trống liền nhau cho rương an ủi; chuỗi bị cắt thì không có", async () => {
    const t = await signUp("tre-streak");
    const patterns = {
      dai: "CCCCCC", // hai rương thắng (câu 3 và câu 6)
      cat: "CCWCCW", // luôn bị cắt: không rương
      thua: "WWWCCC", // an ủi ở câu 3, thắng ở câu 6
      trong: "---WWW", // bỏ trống tính vào chuỗi thua: an ủi ở câu 3 và câu 6
      hon: "W-WCWC", // an ủi ở câu 3, sau đó bị cắt
      dang: "CCWWCC", // luôn dưới 3 liền nhau: không rương, kết thúc với chuỗi thắng 2
    };
    const s = await treasureSession(t, Object.keys(patterns), 6);
    await playPatterns(t, s, patterns);

    const summary = async (name: string) => (await chests(s.id, name)).map((c) => `${c.kind}@${c.position + 1}`);
    expect(await summary("dai")).toEqual(["win@3", "win@6"]);
    expect(await summary("cat")).toEqual([]);
    expect(await summary("thua")).toEqual(["comfort@3", "win@6"]);
    expect(await summary("trong")).toEqual(["comfort@3", "comfort@6"]);
    expect(await summary("hon")).toEqual(["comfort@3"]);
    expect(await summary("dang")).toEqual([]);

    // Nhận rương thì chuỗi về 0; chưa nhận thì giữ đúng giá trị.
    expect(await streaks(s.id, "dai")).toEqual({ win_streak: 0, lose_streak: 0 });
    expect(await streaks(s.id, "cat")).toEqual({ win_streak: 0, lose_streak: 1 });
    expect(await streaks(s.id, "hon")).toEqual({ win_streak: 1, lose_streak: 0 });
    expect(await streaks(s.id, "dang")).toEqual({ win_streak: 2, lose_streak: 0 });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("rương thứ nhất đã tự mở khi sang câu kế, rương mới nhất còn chờ ở pha hiện đáp án", async () => {
    const t = await signUp("tre-pending");
    const s = await treasureSession(t, ["dai"], 6);
    await playPatterns(t, s, { dai: "CCCCCC" });
    expect((await chests(s.id, "dai")).map((c) => `${c.position + 1}:${c.status}`)).toEqual(["3:opened", "6:pending"]);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("không bật chế độ kho báu thì không bao giờ có rương và chuỗi không đổi", async () => {
    const t = await signUp("tre-off");
    const s = await treasureSession(t, ["dai"], 6, {});
    await playPatterns(t, s, { dai: "CCCCCC" });
    expect(await chests(s.id)).toEqual([]);
    expect(await streaks(s.id, "dai")).toEqual({ win_streak: 0, lose_streak: 0 });
    expect(await hostState(t, s.id)).toMatchObject({ treasure_mode: false });
    expect(await hostState(t, s.id)).not.toHaveProperty("treasure_feed");
    const state = await playerState(s.tokens.dai);
    expect(state).not.toHaveProperty("streak");
    expect(state).not.toHaveProperty("chest");
    expect((await openChest(s.tokens.dai)).error?.message).toContain("no_chest");
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("bị loại hoặc đã rời phòng thì không được tính chuỗi; mỗi người một rương cho mỗi câu (ràng buộc duy nhất)", async () => {
    const t = await signUp("tre-removed");
    const s = await treasureSession(t, ["an", "ra"], 3);
    await round(t, s, 1, { an: "C", ra: "C" });
    await hostOk(t, "host_remove_participant", {
      p_session: s.id,
      p_participant: (await hostState(t, s.id)).players.find((p: Json) => p.nickname === "ra").id,
    });
    await round(t, s, 2, { an: "C" });
    await round(t, s, 3, { an: "C" });
    // "ra" đã bị loại sau câu 1 nên không được tính chuỗi dù đã đúng câu 1; "an" đúng 3 câu có rương.
    expect(await chests(s.id, "ra")).toEqual([]);
    expect((await chests(s.id, "an")).map((c) => c.kind)).toEqual(["win"]);
    const dup = () =>
      psql(`insert into public.treasure_chests (session_id, participant_id, position, kind)
select s.id, p.id, 0, 'win' from public.live_sessions s join public.participants p on p.session_id = s.id
where s.id = '${s.id}' and p.nickname = 'an';`);
    dup();
    expect(() => dup()).toThrow(); // trùng (participant_id, position)
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);
});

describe("mở rương", () => {
  it("chỉ mở được ở pha hiện đáp án; không có rương thì báo không có", async () => {
    const t = await signUp("tre-ready");
    const s = await treasureSession(t, ["an", "binh"], 4);
    await hostOk(t, "host_open_question", { p_session: s.id });
    const early = await rpcStatus("open_chest", { p_token: s.tokens.an });
    expect(early).toMatchObject({ status: 409 });
    expect(early.message).toContain("chest_not_ready");
    await hostOk(t, "host_close_question", { p_session: s.id });
    const none = await rpcStatus("open_chest", { p_token: s.tokens.an });
    expect(none.status).toBe(404);
    expect(none.message).toContain("no_chest");
    expect((await rpcStatus("open_chest", { p_token: crypto.randomUUID() })).status).toBe(404);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 90_000);

  it("rương chưa mở chỉ lộ loại; mở xong thấy hiệu ứng khớp điểm; mở lần hai trả đúng kết quả cũ và không đổi điểm", async () => {
    const t = await signUp("tre-open");
    const s = await treasureSession(t, ["an", "binh"], 4);
    await playPatterns(t, s, { an: "CCC", binh: "WWW" });

    const before = await playerState(s.tokens.an);
    expect(before.chest).toEqual({ status: "pending", kind: "win" });
    // Không lộ hiệu ứng trước khi mở (cả trong chính trạng thái của người chơi).
    const keys = allKeys(before.chest);
    for (const secret of ["label", "op", "operand", "before", "after", "effect"]) expect(keys.has(secret), secret).toBe(false);

    const first = await openOk(s.tokens.an);
    expect(first).toMatchObject({ status: "opened", kind: "win" });
    expect(ALLOWED_WIN).toContain(`${first.op}:${first.operand}`);
    expect(first.before).toBe(3000);
    const expected = Number(psql(`select private.apply_effect(3000, '${first.op}', ${first.operand});`));
    expect(first.after).toBe(expected);

    const after = await playerState(s.tokens.an);
    expect(after.score).toBe(first.after);
    expect(after.chest).toEqual(first);

    const again = await openOk(s.tokens.an);
    expect(again).toEqual(first);
    expect((await playerState(s.tokens.an)).score).toBe(first.after); // điểm chỉ đổi một lần

    // Bạn còn lại (rương an ủi) mở độc lập; hiệu ứng của an không ảnh hưởng điểm của binh.
    const comfort = await openOk(s.tokens.binh);
    expect(comfort).toMatchObject({ kind: "comfort", before: 0 });
    expect(ALLOWED_COMFORT).toContain(`${comfort.op}:${comfort.operand}`);
    expect(comfort.after).toBeGreaterThanOrEqual(comfort.before);

    // Màn hình giáo viên thấy điểm đã gồm rương và bảng tin vui.
    const state = await hostState(t, s.id);
    expect(state.players.find((p: Json) => p.nickname === "an").score).toBe(first.after);
    expect(state.treasure_feed).toHaveLength(2);
    expect(state.treasure_feed[0]).toEqual({ nickname: "binh", label: comfort.label, kind: "comfort" });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("chỉ chủ rương mở được: mã sai bị từ chối; người bị loại bị từ chối; bạn khác không mở được rương của mình", async () => {
    const t = await signUp("tre-owner");
    const s = await treasureSession(t, ["an", "binh"], 4);
    await playPatterns(t, s, { an: "CCC", binh: "CCW" });
    // "binh" không có rương: dùng mã của binh không mở được rương của an.
    const stranger = await rpcStatus("open_chest", { p_token: s.tokens.binh });
    expect(stranger.status).toBe(404);
    expect(stranger.message).toContain("no_chest");
    expect((await chests(s.id, "an")).map((c) => c.status)).toEqual(["pending"]);

    await hostOk(t, "host_remove_participant", {
      p_session: s.id,
      p_participant: (await hostState(t, s.id)).players.find((p: Json) => p.nickname === "an").id,
    });
    const removed = await rpcStatus("open_chest", { p_token: s.tokens.an });
    expect(removed.status).toBe(409);
    expect(removed.message).toContain("participant_removed");
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("6 lời gọi mở rương cùng lúc cho một người: cùng kết quả, rương mở một lần, điểm đổi một lần", async () => {
    const t = await signUp("tre-race");
    const s = await treasureSession(t, ["an"], 4);
    await playPatterns(t, s, { an: "CCC" });
    const results = await Promise.all(Array.from({ length: 6 }, () => openChest(s.tokens.an)));
    expect(results.map((r) => r.error)).toEqual(Array(6).fill(null));
    const first = results[0].data as Json;
    for (const r of results) expect(r.data).toEqual(first);
    expect((await playerState(s.tokens.an)).score).toBe(first.after);
    expect(await chests(s.id, "an")).toHaveLength(1);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);
});

describe("đồng thời giữa học sinh mở rương và giáo viên chuyển pha", () => {
  /** Phiên có một rương thắng đang chờ ở pha hiện đáp án câu 3 (bốn câu). */
  async function sessionWithPendingChest(t: TestUser) {
    const s = await treasureSession(t, ["an"], 4);
    await playPatterns(t, s, { an: "CCC" });
    const chest = (await admin.from("treasure_chests").select("id, participant_id, status").eq("session_id", s.id).single()).data as {
      id: string;
      participant_id: string;
      status: string;
    };
    expect(chest.status).toBe("pending");
    return { s, chest };
  }

  it("khoá cùng thứ tự (người chơi rồi rương): học sinh đang giữ khoá người chơi mà giáo viên chốt rương thì chờ chứ không deadlock", async () => {
    const t = await signUp("tre-lock");
    const { s, chest } = await sessionWithPendingChest(t);

    // Học sinh: giữ khoá người chơi rồi mở rương bằng đúng hàm mà open_chest dùng, chậm 1,5 giây ở giữa.
    const student = psqlAsync(`begin;
select id from public.participants where id = '${chest.participant_id}' for update;
select pg_sleep(1.5);
select private.open_chest_row('${chest.id}');
commit;`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Giáo viên: mở câu kế (settle_chests) đúng lúc đó.
    const teacher = psqlAsync(`select private.settle_chests('${s.id}');`);
    const results = await Promise.allSettled([student, teacher]);
    expect(results.map((r) => (r.status === "rejected" ? String((r.reason as Error).message) : "ok"))).toEqual(["ok", "ok"]);

    // Rương mở đúng một lần, bởi học sinh (người giữ khoá trước), không bị tính là tự mở.
    const row = (await admin.from("treasure_chests").select("status, auto_opened, score_before, score_after").eq("id", chest.id).single()).data as {
      status: string;
      auto_opened: boolean;
      score_before: number;
      score_after: number;
    };
    expect(row).toMatchObject({ status: "opened", auto_opened: false, score_before: 3000 });
    const player = (await admin.from("participants").select("score").eq("id", chest.participant_id).single()).data as { score: number };
    expect(player.score).toBe(row.score_after);
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 60_000);

  it("qua API thật: giáo viên mở câu kế cùng lúc nhiều lời gọi mở rương, lặp nhiều lần, không lời gọi nào lỗi", async () => {
    const t = await signUp("tre-api-race");
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const names = ["an", "binh", "chau"];
      const s = await treasureSession(t, names, 4);
      await playPatterns(t, s, { an: "CCC", binh: "CCC", chau: "WWW" });
      const calls = [
        host(t, "host_next", { p_session: s.id }),
        ...names.flatMap((n) => [openChest(s.tokens[n]), openChest(s.tokens[n])]),
      ];
      const results = await Promise.all(calls);
      const errors = results.map((r) => r.error?.message).filter((m) => m && !m.includes("chest_not_ready"));
      expect(errors, `lần ${attempt}`).toEqual([]);
      // Dù ai thắng cuộc đua, mỗi rương chỉ mở một lần và điểm khớp.
      const rows = await chests(s.id);
      expect(rows.every((c) => c.status === "opened")).toBe(true);
      expect(rows).toHaveLength(3);
      await hostOk(t, "host_end_session", { p_session: s.id });
    }
  }, 240_000);
});

describe("học sinh biết rương đã tự mở cho mình", () => {
  it("sang câu kế mà chưa mở thì pha hỏi trả last_chest (auto) khớp điểm; tự mở bằng tay thì không có", async () => {
    const t = await signUp("tre-last");
    const s = await treasureSession(t, ["tu_mo", "tay"], 5);
    await playPatterns(t, s, { tu_mo: "CCC", tay: "CCC" });
    const manual = await openOk(s.tokens.tay); // "tay" tự bấm mở
    expect(manual.auto).toBe(false);

    await hostOk(t, "host_next", { p_session: s.id }); // mở câu 4: rương của "tu_mo" tự mở
    const auto = await playerState(s.tokens.tu_mo);
    expect(auto.phase).toBe("question");
    expect(auto.last_chest).toMatchObject({ status: "opened", kind: "win", auto: true, before: 3000 });
    expect(auto.last_chest.after).toBe(auto.score);
    expect(auto).not.toHaveProperty("chest"); // rương hiện tại chỉ có ở pha hiện đáp án
    expect(ALLOWED_WIN).toContain(`${auto.last_chest.op}:${auto.last_chest.operand}`);

    expect(await playerState(s.tokens.tay)).not.toHaveProperty("last_chest");
    // Sang câu sau nữa thì không còn nhắc lại.
    await submitOk(s.tokens.tu_mo, 0);
    await hostOk(t, "host_close_question", { p_session: s.id });
    await hostOk(t, "host_next", { p_session: s.id });
    expect(await playerState(s.tokens.tu_mo)).not.toHaveProperty("last_chest");
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("pha kết thúc: tổng số rương và tổng thay đổi điểm; rương cuối tự mở được trả lại; người không có rương thấy 0", async () => {
    const t = await signUp("tre-final");
    const s = await treasureSession(t, ["dai", "it"], 3);
    await playPatterns(t, s, { dai: "CCC", it: "CWC" });
    await hostOk(t, "host_next", { p_session: s.id }); // hết câu: kết thúc, rương cuối của "dai" tự mở

    const dai = await playerState(s.tokens.dai);
    expect(dai.phase).toBe("ended");
    expect(dai.treasure.opened).toBe(1);
    expect(dai.last_chest).toMatchObject({ status: "opened", kind: "win", auto: true, before: 3000 });
    expect(dai.treasure.delta).toBe(dai.last_chest.after - dai.last_chest.before);
    expect(dai.score).toBe(3000 + dai.treasure.delta);

    expect((await playerState(s.tokens.it)).treasure).toEqual({ opened: 0, delta: 0 });
    expect(await playerState(s.tokens.it)).not.toHaveProperty("last_chest");
  }, 120_000);

  it("tắt kho báu thì pha hỏi và pha kết thúc không có trường kho báu nào", async () => {
    const t = await signUp("tre-last-off");
    const s = await treasureSession(t, ["an"], 3, {});
    await playPatterns(t, s, { an: "CCC" });
    await hostOk(t, "host_next", { p_session: s.id });
    const ended = await playerState(s.tokens.an);
    for (const key of ["treasure", "last_chest", "chest", "streak"]) expect(ended).not.toHaveProperty(key);
  }, 60_000);
});

describe("hiệu ứng", () => {
  it("apply_effect: làm tròn, không âm, trần +2000, phép không hợp lệ giữ nguyên điểm", () => {
    const apply = (score: number, op: string, operand: number) => Number(psql(`select private.apply_effect(${score}, '${op}', ${operand});`));
    expect(apply(0, "mul", 2)).toBe(0);
    expect(apply(0, "sub", 300)).toBe(0);
    expect(apply(100, "sub", 300)).toBe(0); // không âm
    expect(apply(1000, "div", 2)).toBe(500);
    expect(apply(1001, "div", 2)).toBe(501); // làm tròn nửa lên
    expect(apply(3000, "add", 500)).toBe(3500);
    expect(apply(5000, "mul", 2)).toBe(7000); // trần +2000 (nhân đôi sẽ là 10000)
    expect(apply(3000, "mul", 1.5)).toBe(4500);
    expect(apply(4000, "mul", 1.5)).toBe(6000); // đúng bằng trần
    expect(apply(1001, "mul", 1.5)).toBe(1502);
    expect(apply(10_000, "add", 1000)).toBe(11_000);
    expect(apply(1234, "div", 0)).toBe(1234); // chia 0: giữ nguyên, không thành +2000
    expect(Number(psql("select private.apply_effect(1234, 'luỹ_thừa', 2);"))).toBe(1234);
  });

  it("pick_effect: mọi kết quả thuộc tập định trước, rương an ủi không bao giờ giảm điểm, trọng số gần đúng", () => {
    const sample = (kind: string) => {
      const out = psql(`select op || ':' || operand::text, count(*) from generate_series(1, 4000) g cross join lateral private.pick_effect(case when g > 0 then '${kind}' else 'comfort' end) group by 1 order by 1;`); // phụ thuộc g để mỗi dòng gọi lại hàm (không bị tính một lần)
      return Object.fromEntries(out.split("\n").map((line) => line.split("|")).map(([k, n]) => [k, Number(n)]));
    };
    const win = sample("win");
    const comfort = sample("comfort");
    expect(Object.keys(win).sort()).toEqual([...ALLOWED_WIN].sort());
    expect(Object.keys(comfort).sort()).toEqual([...ALLOWED_COMFORT].sort());
    const share = (counts: Record<string, number>, key: string) => counts[key] / 4000;
    const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThan(0.05);
    near(share(win, "add:500"), 0.25);
    near(share(win, "add:1000"), 0.2);
    near(share(win, "mul:2"), 0.15);
    near(share(win, "mul:1.5"), 0.1);
    near(share(win, "sub:300"), 0.15);
    near(share(win, "div:2"), 0.15);
    near(share(comfort, "add:500"), 0.4);
    near(share(comfort, "add:1000"), 0.35);
    near(share(comfort, "mul:2"), 0.25);
  }, 60_000);

  it("qua nhiều lần mở thật: điểm sau khớp apply_effect, không âm, tăng không quá 2000, an ủi không giảm", async () => {
    const t = await signUp("tre-many");
    const names = Array.from({ length: 12 }, (_, i) => `hs${i + 1}`);
    const s = await treasureSession(t, names, 3);
    // Nửa đầu đúng cả 3 câu (rương thắng), nửa sau sai cả 3 câu (rương an ủi).
    const patterns = Object.fromEntries(names.map((n, i) => [n, i < 6 ? "CCC" : "WWW"]));
    await playPatterns(t, s, patterns);
    const outcomes: Json[] = [];
    for (const name of names) outcomes.push(await openOk(s.tokens[name]));
    for (const [i, o] of outcomes.entries()) {
      const allowed = i < 6 ? ALLOWED_WIN : ALLOWED_COMFORT;
      expect(allowed, `${names[i]}`).toContain(`${o.op}:${o.operand}`);
      expect(o.after).toBeGreaterThanOrEqual(0);
      expect(o.after - o.before).toBeLessThanOrEqual(2000);
      if (i >= 6) expect(o.after).toBeGreaterThanOrEqual(o.before);
      expect(o.after).toBe(Number(psql(`select private.apply_effect(${o.before}, '${o.op}', ${o.operand});`)));
    }
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 180_000);
});

describe("chốt rương", () => {
  it("rương còn chờ tự mở khi câu kế mở; kết thúc phiên tự mở rương cuối trước khi chốt xếp hạng", async () => {
    const t = await signUp("tre-settle");
    const s = await treasureSession(t, ["dai"], 6);
    await playPatterns(t, s, { dai: "CCC" });
    expect((await chests(s.id, "dai")).map((c) => c.status)).toEqual(["pending"]);
    await hostOk(t, "host_next", { p_session: s.id }); // mở câu 4: rương của câu 3 tự mở
    expect((await chests(s.id, "dai")).map((c) => c.status)).toEqual(["opened"]);
    const afterOpen = await playerState(s.tokens.dai);
    expect(afterOpen.score).toBeGreaterThanOrEqual(0);

    // Câu 4-6: đúng cả ba để có rương ở câu 6 rồi sang câu cuối (host_next ở câu cuối kết thúc phiên).
    await submitOk(s.tokens.dai, 0);
    await hostOk(t, "host_close_question", { p_session: s.id });
    await round(t, s, 5, { dai: "C" });
    await round(t, s, 6, { dai: "C" });
    expect((await chests(s.id, "dai")).at(-1)).toMatchObject({ position: 5, status: "pending" });
    await hostOk(t, "host_next", { p_session: s.id }); // hết câu: kết thúc, rương cuối tự mở
    const rows = await chests(s.id, "dai");
    expect(rows.map((c) => c.status)).toEqual(["opened", "opened"]);
    const state = await hostState(t, s.id);
    expect(state.status).toBe("ended");
    const lastChest = await admin.from("treasure_chests").select("score_after").eq("session_id", s.id).eq("position", 5).single();
    expect(state.leaderboard[0].score).toBe((lastChest.data as { score_after: number }).score_after);
  }, 180_000);

  it("kết thúc phiên giữa lúc đang hỏi: câu đang mở được chấm, rương sinh ra được mở ngay và điểm cuối gồm cả nó", async () => {
    const t = await signUp("tre-end");
    const s = await treasureSession(t, ["dai"], 4);
    await playPatterns(t, s, { dai: "CC" });
    await hostOk(t, "host_next", { p_session: s.id });
    await submitOk(s.tokens.dai, 0); // câu 3 đúng, chưa đóng
    await hostOk(t, "host_end_session", { p_session: s.id });
    const rows = await chests(s.id, "dai");
    expect(rows).toEqual([expect.objectContaining({ position: 2, kind: "win", status: "opened" })]);
    const state = await hostState(t, s.id);
    const chest = await admin.from("treasure_chests").select("score_before, score_after").eq("session_id", s.id).single();
    expect((chest.data as { score_before: number }).score_before).toBe(3000);
    expect(state.leaderboard[0].score).toBe((chest.data as { score_after: number }).score_after);
  }, 120_000);

  it("trang kết quả có chênh lệch điểm do kho báu của từng bạn; xoá buổi xoá cả rương", async () => {
    const t = await signUp("tre-results");
    const s = await treasureSession(t, ["an", "binh"], 3);
    await playPatterns(t, s, { an: "CCC", binh: "CCW" });
    await hostOk(t, "host_next", { p_session: s.id }); // hết câu: kết thúc, rương của an tự mở
    const { data, error } = await t.client.rpc("host_results", { p_session: s.id });
    expect(error).toBeNull();
    const results = data as { treasure_mode: boolean; ranking: { nickname: string; score: number; treasure_delta: number; treasure_chests: number }[] };
    expect(results.treasure_mode).toBe(true);
    const an = results.ranking.find((r) => r.nickname === "an")!;
    const binh = results.ranking.find((r) => r.nickname === "binh")!;
    expect(an.treasure_chests).toBe(1);
    expect(an.score - an.treasure_delta).toBe(3000); // điểm gốc của 3 câu đúng
    expect(binh).toMatchObject({ treasure_chests: 0, treasure_delta: 0, score: 2000 });

    expect(await chests(s.id)).toHaveLength(1);
    expect((await t.client.rpc("delete_session", { p_session: s.id })).error).toBeNull();
    expect(await chests(s.id)).toEqual([]);
  }, 120_000);
});

describe("cấu hình và quyền", () => {
  it("tuỳ chọn treasure_mode được lưu; sai kiểu bị từ chối; bật cả tự động thì hiện đáp án tối thiểu 8 giây", async () => {
    const t = await signUp("tre-cfg");
    const quizId = await newQuiz(t, [simpleQuestion("Câu 1")]);
    const state = async (options: Record<string, unknown>) => {
      const s = await startSession(t, quizId, false, options);
      const st = await hostState(t, s.id);
      await hostOk(t, "host_end_session", { p_session: s.id });
      return st;
    };
    expect(await state({})).toMatchObject({ treasure_mode: false });
    expect(await state({ treasure_mode: true })).toMatchObject({ treasure_mode: true, auto_advance: false });
    expect(await state({ treasure_mode: true, auto_advance: true, reveal_seconds: 5 })).toMatchObject({ treasure_mode: true, reveal_seconds: 8 });
    expect(await state({ treasure_mode: true, auto_advance: true, reveal_seconds: 12 })).toMatchObject({ reveal_seconds: 12 });
    // Chỉ bật tự động (không có kho báu) vẫn được chọn 5 giây.
    expect(await state({ auto_advance: true, reveal_seconds: 5 })).toMatchObject({ treasure_mode: false, reveal_seconds: 5 });
    const bad = await rpcStatus("create_session", { p_quiz_id: quizId, p_speed_bonus: false, p_options: { treasure_mode: "yes" } }, t);
    expect(bad.status).toBe(400);
    expect(bad.message).toContain("invalid_options");
  }, 90_000);

  it("không ai đọc hay ghi trực tiếp bảng rương hay cột chuỗi; hàm nội bộ không gọi được qua API; giáo viên khác không thấy gì", async () => {
    const t = await signUp("tre-perm");
    const other = await signUp("tre-perm-other");
    const s = await treasureSession(t, ["an"], 4);
    await playPatterns(t, s, { an: "CCC" });
    await openOk(s.tokens.an);

    for (const client of [anon, t.client, other.client]) {
      expect((await client.from("treasure_chests").select("*")).error?.code).toBe("42501");
      expect((await client.from("treasure_chests").insert({})).error?.code).toBe("42501");
      expect((await client.from("treasure_chests").update({ score_after: 99_999 }).eq("session_id", s.id)).error?.code).toBe("42501");
      expect((await client.from("treasure_chests").delete().eq("session_id", s.id)).error?.code).toBe("42501");
    }
    // Giáo viên không đọc được cột chuỗi; cột đã cấp vẫn đọc được.
    expect((await t.client.from("participants").select("win_streak")).error?.code).toBe("42501");
    expect((await t.client.from("participants").select("id, nickname, score")).error).toBeNull();
    expect((await t.client.from("participants").update({ score: 99_999 }).eq("session_id", s.id)).error?.code).toBe("42501");

    for (const fn of ["apply_effect", "pick_effect", "open_chest_row", "settle_chests", "update_streaks", "chest_json"]) {
      expect((await anon.rpc(fn, {})).error, fn).not.toBeNull();
      expect((await t.client.rpc(fn, {})).error, `${fn} (giáo viên)`).not.toBeNull();
    }
    // Giáo viên khác không thấy phiên (kể cả bảng tin vui).
    expect((await other.client.rpc("host_state", { p_session: s.id })).error?.message).toContain("session_not_found");
    expect((await host(other, "host_results", { p_session: s.id })).error).not.toBeNull();
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);

  it("trạng thái của người chơi không chứa khoá đáp án khi đang hỏi dù bật kho báu; chỉ có chuỗi của chính mình", async () => {
    const t = await signUp("tre-leak");
    const s = await treasureSession(t, ["an", "binh"], 4);
    await playPatterns(t, s, { an: "CC", binh: "WW" });
    await hostOk(t, "host_next", { p_session: s.id });
    const state = await playerState(s.tokens.an);
    expect(state.streak).toEqual({ win: 2, lose: 0 });
    const keys = allKeys(state);
    for (const secret of ["is_correct", "correct", "accepted_answers", "ignore_diacritics", "quiz_snapshot", "token", "chest"]) {
      expect(keys.has(secret), secret).toBe(false);
    }
    expect((await playerState(s.tokens.binh)).streak).toEqual({ win: 0, lose: 2 });
    await hostOk(t, "host_end_session", { p_session: s.id });
  }, 120_000);
});
