import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, cleanupUsers, signUp, type TestUser } from "./helpers";
import {
  clearJoinAttempts,
  hostOk,
  joinOk,
  newQuiz,
  psql,
  questions,
  rpcStatus,
  startSession,
  submitOk,
} from "./live-helpers";

/**
 * Kết quả sau buổi chơi, xoá một buổi và xoá dữ liệu người chơi sau 90 ngày (phase 7 giai đoạn 2).
 * Cần `npm run supabase:start`. Chạy các hàm `private.*` bằng `psql` (vai trò postgres) vì API không mở schema private.
 */

afterAll(async () => {
  await clearJoinAttempts();
  await cleanupUsers();
});

/** Chơi trọn một phiên có hai người với đáp án biết trước: Lan 3000 điểm, Huy 2000 điểm (không tính điểm tốc độ). */
async function playFullSession(t: TestUser) {
  const quizId = await newQuiz(t);
  const s = await startSession(t, quizId, false);
  const lan = await joinOk(s.pin, "Lan");
  const huy = await joinOk(s.pin, "Huy");
  const plan: [unknown, unknown][] = [
    [0, 1],
    [1, 1],
    [[0], [2, 0]],
    ["Mèo", "chó"],
  ];
  for (let q = 0; q < plan.length; q += 1) {
    await hostOk(t, q === 0 ? "host_open_question" : "host_next", { p_session: s.id });
    await submitOk(lan, plan[q][0]);
    await submitOk(huy, plan[q][1]);
    await hostOk(t, "host_close_question", { p_session: s.id });
  }
  await hostOk(t, "host_next", { p_session: s.id });
  return { ...s, quizId };
}

type Results = {
  quiz_title: string;
  question_total: number;
  player_count: number;
  average_score: number;
  ranking: { nickname: string; rank: number | null; score: number; correct: number; answered: number; removed: boolean; avg_response_ms: number | null }[];
  questions: {
    index: number;
    correct: number;
    wrong: number;
    unanswered: number;
    option_counts: number[];
    key: unknown;
    avg_response_ms: number | null;
  }[];
  answers: { player: string; q: number; ok: boolean; points: number; ms: number }[];
};

describe("7.1 kết quả sau buổi chơi", () => {
  let a: TestUser;
  let b: TestUser;
  let session: Awaited<ReturnType<typeof playFullSession>>;

  beforeAll(async () => {
    a = await signUp("ret-a");
    b = await signUp("ret-b");
    session = await playFullSession(a);
  }, 90_000);

  it("khớp với điểm tính tay: xếp hạng, thống kê từng câu và đáp án từng người", async () => {
    const { data, error } = await a.client.rpc("host_results", { p_session: session.id });
    expect(error).toBeNull();
    const results = data as Results;
    expect(results).toMatchObject({ quiz_title: "Quiz phiên chơi", question_total: 4, player_count: 2, average_score: 2500 });

    expect(results.ranking.map((r) => [r.nickname, r.rank, r.score, r.correct, r.answered])).toEqual([
      ["Lan", 1, 3000, 3, 4],
      ["Huy", 2, 2000, 2, 4],
    ]);
    expect(results.ranking.every((r) => typeof r.avg_response_ms === "number")).toBe(true);

    expect(results.questions.map((q) => [q.index, q.correct, q.wrong, q.unanswered])).toEqual([
      [1, 1, 1, 0],
      [2, 2, 0, 0],
      [3, 1, 1, 0],
      [4, 1, 1, 0],
    ]);
    expect(results.questions[0].option_counts).toEqual([1, 1, 0, 0]);
    expect(results.questions[1].option_counts).toEqual([0, 2]);
    expect(results.questions[2].option_counts).toEqual([2, 0, 1, 0]);
    expect(results.questions[3].option_counts).toEqual([]);
    expect(results.questions[0].key).toEqual({ correct: [0] });
    expect(results.questions[3].key).toMatchObject({ accepted_answers: ["con mèo", "mèo"] });

    // Đáp án của từng người ở từng câu: 2 người x 4 câu, tổng điểm khớp điểm xếp hạng.
    expect(results.answers).toHaveLength(8);
    const byPlayer = new Map<string, number>();
    for (const row of results.answers) byPlayer.set(row.player, (byPlayer.get(row.player) ?? 0) + row.points);
    expect([...byPlayer.values()].sort()).toEqual([2000, 3000]);
    expect(results.answers.filter((row) => row.ok)).toHaveLength(5);
  });

  it("người chơi bị loại không có thứ hạng và không tính vào thống kê", async () => {
    const t = await signUp("ret-removed");
    const s = await startSession(t, await newQuiz(t, [questions[0]]), false);
    const keep = await joinOk(s.pin, "Ở lại");
    const gone = await joinOk(s.pin, "Bị loại");
    await hostOk(t, "host_open_question", { p_session: s.id });
    await submitOk(keep, 0);
    await submitOk(gone, 0);
    const players = (await t.client.rpc("host_state", { p_session: s.id })).data.players as { id: string; nickname: string }[];
    await hostOk(t, "host_remove_participant", { p_session: s.id, p_participant: players.find((p) => p.nickname === "Bị loại")!.id });
    await hostOk(t, "host_close_question", { p_session: s.id });
    await hostOk(t, "host_next", { p_session: s.id });

    const results = (await t.client.rpc("host_results", { p_session: s.id })).data as Results;
    expect(results.player_count).toBe(1);
    expect(results.ranking.map((r) => [r.nickname, r.rank, r.removed])).toEqual([
      ["Ở lại", 1, false],
      ["Bị loại", null, true],
    ]);
    expect(results.questions[0]).toMatchObject({ correct: 1, wrong: 0, unanswered: 0, option_counts: [1, 0, 0, 0] });
  });

  it("chỉ chủ phiên xem được; giáo viên khác 404, khách 401; phiên chưa kết thúc thì từ chối", async () => {
    expect((await b.client.rpc("host_results", { p_session: session.id })).error?.message).toContain("session_not_found");
    expect((await rpcStatus("host_results", { p_session: session.id }, b)).status).toBe(404);
    expect((await anon.rpc("host_results", { p_session: session.id })).error?.code).toBe("42501");

    const running = await startSession(b, await newQuiz(b, [questions[0]]));
    const notEnded = await b.client.rpc("host_results", { p_session: running.id });
    expect(notEnded.error?.message).toContain("session_not_ended");
    expect((await rpcStatus("host_results", { p_session: running.id }, b)).status).toBe(409);
    await hostOk(b, "host_end_session", { p_session: running.id });
    expect((await b.client.rpc("host_results", { p_session: running.id })).error).toBeNull();
  });

  it("danh sách các buổi đã chơi: chỉ của mình, mới nhất trước, kèm số người và điểm trung bình", async () => {
    const t = await signUp("ret-history");
    const first = await playFullSession(t);
    const running = await startSession(t, await newQuiz(t, [questions[0]], "Quiz đang chạy"));
    // Phiên đang chạy không nằm trong danh sách.
    const midway = await t.client.rpc("session_history", {});
    expect((midway.data as { session_id: string }[]).map((r) => r.session_id)).toEqual([first.id]);
    await hostOk(t, "host_end_session", { p_session: running.id });

    const forQuiz = await t.client.rpc("session_history", { p_quiz_id: first.quizId });
    expect(forQuiz.error).toBeNull();
    expect(forQuiz.data).toEqual([
      expect.objectContaining({ session_id: first.id, quiz_id: first.quizId, player_count: 2, average_score: 2500 }),
    ]);
    const all = (await t.client.rpc("session_history", {})).data as { session_id: string; created_at: string }[];
    expect(all.map((r) => r.session_id)).toEqual([running.id, first.id]);

    expect(((await b.client.rpc("session_history", {})).data as unknown[]).every((r) => (r as { session_id: string }).session_id !== first.id)).toBe(true);
    expect((await anon.rpc("session_history", {})).error?.code).toBe("42501");
  });
});

describe("7.1 xoá một buổi đã chơi", () => {
  it("phiên đang chạy thì từ chối; đã kết thúc thì xoá cả người chơi và câu trả lời; người khác không xoá được", async () => {
    const t = await signUp("ret-del");
    const other = await signUp("ret-del2");
    const s = await playFullSession(t);
    const rows = async (table: "participants" | "answers") =>
      (await admin.from(table).select("*", { count: "exact", head: true }).eq("session_id", s.id)).count;
    expect(await rows("participants")).toBe(2);
    expect(await rows("answers")).toBe(8);

    expect((await other.client.rpc("delete_session", { p_session: s.id })).error?.message).toContain("session_not_found");
    expect((await anon.rpc("delete_session", { p_session: s.id })).error?.code).toBe("42501");

    const running = await startSession(t, await newQuiz(t, [questions[0]]));
    const refused = await t.client.rpc("delete_session", { p_session: running.id });
    expect(refused.error?.message).toContain("session_active");
    expect((await rpcStatus("delete_session", { p_session: running.id }, t)).status).toBe(409);
    await hostOk(t, "host_end_session", { p_session: running.id });

    const deleted = await t.client.rpc("delete_session", { p_session: s.id });
    expect(deleted.error).toBeNull();
    expect(await rows("participants")).toBe(0);
    expect(await rows("answers")).toBe(0);
    expect((await t.client.rpc("host_results", { p_session: s.id })).error?.message).toContain("session_not_found");
    expect(((await t.client.rpc("session_history", {})).data as { session_id: string }[]).map((r) => r.session_id)).not.toContain(s.id);
  }, 90_000);
});

describe("7.2 xoá dữ liệu sau 90 ngày", () => {
  async function ageSession(id: string, days: number) {
    const aged = await admin.from("live_sessions").update({ created_at: new Date(Date.now() - days * 86_400_000).toISOString() }).eq("id", id);
    expect(aged.error).toBeNull();
  }
  const exists = async (id: string) => (await admin.from("live_sessions").select("id").eq("id", id)).data?.length === 1;
  const playerRows = async (id: string) =>
    (await admin.from("participants").select("*", { count: "exact", head: true }).eq("session_id", id)).count;

  it("xoá phiên quá 90 ngày cùng người chơi và câu trả lời, giữ phiên mới hơn (ranh giới 89 và 91 ngày)", async () => {
    const t = await signUp("ret-purge");
    const old = await playFullSession(t);
    const edge = await playFullSession(t);
    const fresh = await playFullSession(t);
    await ageSession(old.id, 91);
    await ageSession(edge.id, 89);

    const removed = Number(psql("select private.purge_old_sessions();"));
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await exists(old.id)).toBe(false);
    expect(await playerRows(old.id)).toBe(0);
    expect((await admin.from("answers").select("*", { count: "exact", head: true }).eq("session_id", old.id)).count).toBe(0);
    expect(await exists(edge.id)).toBe(true);
    expect(await exists(fresh.id)).toBe(true);
    expect(await playerRows(fresh.id)).toBe(2);
  }, 120_000);

  it("chỉ xoá của một giáo viên khi cho p_owner, và tôn trọng giới hạn số phiên mỗi lần", async () => {
    const mine = await signUp("ret-owner1");
    const theirs = await signUp("ret-owner2");
    const a = await playFullSession(mine);
    const b = await playFullSession(theirs);
    const c = await playFullSession(theirs);
    for (const s of [a, b, c]) await ageSession(s.id, 120);

    expect(Number(psql(`select private.purge_old_sessions(90, '${mine.id}');`))).toBe(1);
    expect(await exists(a.id)).toBe(false);
    expect(await exists(b.id)).toBe(true);

    expect(Number(psql(`select private.purge_old_sessions(90, '${theirs.id}', 1);`))).toBe(1);
    expect((await exists(b.id)) !== (await exists(c.id))).toBe(true);
    expect(Number(psql(`select private.purge_old_sessions(90, '${theirs.id}', 1);`))).toBe(1);
    expect(await exists(b.id)).toBe(false);
    expect(await exists(c.id)).toBe(false);
  }, 120_000);

  it("số ngày không hợp lệ bị từ chối (tránh vô tình xoá hết); xoá cả lần nhập sai PIN quá 10 phút", async () => {
    expect(() => psql("select private.purge_old_sessions(0);")).toThrow();
    expect(() => psql("select private.purge_old_sessions(-5);")).toThrow();
    await admin.from("join_attempts").insert({ ip_hash: "cu-ret", attempted_at: new Date(Date.now() - 30 * 60_000).toISOString() });
    await admin.from("join_attempts").insert({ ip_hash: "moi-ret", attempted_at: new Date().toISOString() });
    psql("select private.purge_old_sessions();");
    expect(psql("select count(*) from public.join_attempts where ip_hash = 'cu-ret';")).toBe("0");
    expect(psql("select count(*) from public.join_attempts where ip_hash = 'moi-ret';")).toBe("1");
  });

  it("xoá cơ hội: giáo viên tạo phiên mới thì phiên quá hạn của chính họ và một mẻ của người khác bị xoá", async () => {
    const mine = await signUp("ret-opp1");
    const theirs = await signUp("ret-opp2");
    const mineOld = await playFullSession(mine);
    const theirsOld = await playFullSession(theirs);
    await ageSession(mineOld.id, 100);
    await ageSession(theirsOld.id, 100);

    const next = await startSession(mine, await newQuiz(mine, [questions[0]]));
    expect(await exists(mineOld.id)).toBe(false);
    expect(await exists(theirsOld.id)).toBe(false);
    expect(await exists(next.id)).toBe(true);
    await hostOk(mine, "host_end_session", { p_session: next.id });
  }, 120_000);

  it("API không gọi được hàm xoá: khách và giáo viên đều bị từ chối", async () => {
    const t = await signUp("ret-api");
    for (const client of [anon, t.client]) {
      for (const fn of ["purge_old_sessions"]) {
        expect((await client.rpc(fn, {})).error, fn).not.toBeNull();
      }
    }
    // Quyền thực thi của hàm private không mở cho vai trò API.
    const acl = psql("select has_function_privilege('anon', 'private.purge_old_sessions(integer,uuid,integer)', 'execute'), has_function_privilege('authenticated', 'private.purge_old_sessions(integer,uuid,integer)', 'execute');");
    expect(acl).toBe("f|f");
    expect(psql("select has_schema_privilege('anon', 'private', 'usage'), has_schema_privilege('authenticated', 'private', 'usage');")).toBe("f|f");
  });

  it("migration lập lịch pg_cron có điều kiện: chạy được cả khi không có pg_cron hoặc lập lịch lỗi", () => {
    const file = readFileSync(joinPath(process.cwd(), "supabase/migrations/20261023090000_results_retention.sql"), "utf8").replace(/\r\n/g, "\n");
    const block = /do \$cron\$[\s\S]*?\$cron\$;/.exec(file)?.[0];
    expect(block, "không tìm thấy khối lập lịch").toBeTruthy();
    // Bản gốc chạy được.
    expect(() => psql(block!)).not.toThrow();
    // Không có tiện ích pg_cron: rơi vào nhánh báo, không lỗi.
    expect(() => psql(block!.replace("name = 'pg_cron'", "name = 'pg_cron_khong_co'"))).not.toThrow();
    // Có tiện ích nhưng lập lịch lỗi: ngoại lệ được bắt, không lỗi.
    expect(() => psql(block!.replace("cron.schedule(", "cron.khong_co_ham("))).not.toThrow();
    // Công việc đã được lập lịch (nếu pg_cron có sẵn trên stack cục bộ).
    const jobs = psql("select count(*) from cron.job where jobname = 'smartteach-purge-old-sessions';");
    expect(["0", "1"]).toContain(jobs);
  });
});
