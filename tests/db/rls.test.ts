import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readLocalSupabase } from "../../scripts/supabase-local.mjs";

/**
 * Kiểm thử row level security trên stack Supabase cục bộ, đi qua đúng đường mà ứng dụng dùng
 * (PostgREST với JWT của từng người). Cần `npm run supabase:start` đã chạy.
 */

type Config = { url: string; anonKey: string; serviceRoleKey: string };
const config: Config = readLocalSupabase();

const run = Date.now().toString(36);
const password = "test-password-123";
const emails = { a: `rls-a-${run}@example.test`, b: `rls-b-${run}@example.test` };

function newClient(key = config.anonKey): SupabaseClient {
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const admin = newClient(config.serviceRoleKey);
const anon = newClient();
let a: SupabaseClient;
let b: SupabaseClient;
let userA = "";
let userB = "";

async function signUp(email: string) {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("không tạo được người dùng");
  const client = newClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { client, id: created.data.user.id };
}

async function makeClass(client: SupabaseClient, name: string) {
  const { data, error } = await client.from("classes").insert({ name }).select().single();
  expect(error).toBeNull();
  return data as { id: string; owner_id: string; name: string };
}

beforeAll(async () => {
  const first = await signUp(emails.a);
  const second = await signUp(emails.b);
  a = first.client;
  userA = first.id;
  b = second.client;
  userB = second.id;
}, 60_000);

afterAll(async () => {
  // Xoá người dùng kéo theo xoá lớp, học sinh và yêu thích nhờ khoá ngoại on delete cascade.
  await admin.auth.admin.deleteUser(userA);
  await admin.auth.admin.deleteUser(userB);
});

describe("khách chưa đăng nhập", () => {
  it("không đọc hay ghi được bảng nào", async () => {
    for (const table of ["classes", "students", "favorites"] as const) {
      const read = await anon.from(table).select("*");
      expect(read.error?.code, `đọc ${table}`).toBe("42501");
    }
    const write = await anon.from("classes").insert({ name: "x" });
    expect(write.error?.code).toBe("42501");
  });
});

describe("chủ sở hữu", () => {
  it("tạo lớp mà không cần tự điền owner_id, và owner_id là chính mình", async () => {
    const created = await makeClass(a, "Lớp 10A1");
    expect(created.owner_id).toBe(userA);
  });

  it("thêm học sinh và đọc lại đúng thứ tự", async () => {
    const klass = await makeClass(a, "Lớp có học sinh");
    const inserted = await a.from("students").insert([
      { class_id: klass.id, name: "Minh Anh", position: 0 },
      { class_id: klass.id, name: "Gia Huy", position: 1 },
    ]);
    expect(inserted.error).toBeNull();
    const { data } = await a.from("students").select("name").eq("class_id", klass.id).order("position");
    expect(data?.map((row) => row.name)).toEqual(["Minh Anh", "Gia Huy"]);
  });

  it("xoá lớp thì học sinh của lớp cũng mất", async () => {
    const klass = await makeClass(a, "Lớp sẽ xoá");
    await a.from("students").insert({ class_id: klass.id, name: "An" });
    const removed = await a.from("classes").delete().eq("id", klass.id).select();
    expect(removed.data).toHaveLength(1);
    const left = await admin.from("students").select("id").eq("class_id", klass.id);
    expect(left.data).toEqual([]);
  });

  it("từ chối tên rỗng hoặc dài hơn 100 ký tự", async () => {
    expect((await a.from("classes").insert({ name: "   " })).error?.code).toBe("23514");
    expect((await a.from("classes").insert({ name: "x".repeat(101) })).error?.code).toBe("23514");
    const klass = await makeClass(a, "Lớp kiểm tên");
    expect((await a.from("students").insert({ class_id: klass.id, name: "" })).error?.code).toBe("23514");
    expect(
      (await a.from("students").insert({ class_id: klass.id, name: "y".repeat(101) })).error?.code,
    ).toBe("23514");
  });
});

describe("hai giáo viên không thấy dữ liệu của nhau", () => {
  let classA: { id: string };
  let studentId: string;

  beforeAll(async () => {
    classA = await makeClass(a, "Lớp riêng của A");
    const { data } = await a.from("students").insert({ class_id: classA.id, name: "Bạn của A" }).select().single();
    studentId = (data as { id: string }).id;
    await a.from("favorites").insert({ game_id: "game-cua-a" });
  });

  it("B không đọc được lớp, học sinh và yêu thích của A", async () => {
    expect((await b.from("classes").select("id").eq("id", classA.id)).data).toEqual([]);
    expect((await b.from("students").select("id").eq("class_id", classA.id)).data).toEqual([]);
    expect((await b.from("favorites").select("game_id").eq("game_id", "game-cua-a")).data).toEqual([]);
  });

  it("B không sửa hay xoá được dữ liệu của A (không dòng nào bị ảnh hưởng)", async () => {
    const renamed = await b.from("classes").update({ name: "bị chiếm" }).eq("id", classA.id).select();
    expect(renamed.data).toEqual([]);
    const removedClass = await b.from("classes").delete().eq("id", classA.id).select();
    expect(removedClass.data).toEqual([]);
    const renamedStudent = await b.from("students").update({ name: "bị chiếm" }).eq("id", studentId).select();
    expect(renamedStudent.data).toEqual([]);
    const removedStudent = await b.from("students").delete().eq("id", studentId).select();
    expect(removedStudent.data).toEqual([]);

    const intact = await a.from("classes").select("name").eq("id", classA.id).single();
    expect(intact.data?.name).toBe("Lớp riêng của A");
  });

  it("B không thêm được học sinh vào lớp của A", async () => {
    const result = await b.from("students").insert({ class_id: classA.id, name: "kẻ lạ" });
    expect(result.error?.code).toBe("42501");
  });

  it("B không tạo được lớp hay yêu thích mang tên A", async () => {
    expect((await b.from("classes").insert({ name: "giả mạo", owner_id: userA })).error?.code).toBe("42501");
    expect((await b.from("favorites").insert({ owner_id: userA, game_id: "gia-mao" })).error?.code).toBe("42501");
  });

  it("A không chuyển được lớp cho B và không chuyển học sinh sang lớp của B", async () => {
    const give = await a.from("classes").update({ owner_id: userB }).eq("id", classA.id);
    expect(give.error).not.toBeNull();

    const classB = await makeClass(b, "Lớp của B");
    const move = await a.from("students").update({ class_id: classB.id }).eq("id", studentId);
    expect(move.error).not.toBeNull();
  });

  it("mỗi người có tập yêu thích riêng và không trùng game được hai lần", async () => {
    await b.from("favorites").insert({ game_id: "game-cua-b" });
    const mine = await a.from("favorites").select("game_id");
    expect(mine.data?.map((row) => row.game_id)).toEqual(["game-cua-a"]);
    const duplicate = await a.from("favorites").insert({ game_id: "game-cua-a" });
    expect(duplicate.error?.code).toBe("23505");
  });
});

describe("giới hạn số lượng", () => {
  it("không cho vượt 100 học sinh mỗi lớp, kể cả khi thêm nhiều dòng một lần", async () => {
    const klass = await makeClass(a, "Lớp đông");
    const rows = (count: number, from = 0) =>
      Array.from({ length: count }, (_, i) => ({ class_id: klass.id, name: `HS ${from + i}`, position: from + i }));

    expect((await a.from("students").insert(rows(100))).error).toBeNull();
    const over = await a.from("students").insert({ class_id: klass.id, name: "thứ 101" });
    expect(over.error?.message).toContain("student_limit_exceeded");

    const other = await makeClass(a, "Lớp thêm cả loạt");
    const bulk = await a.from("students").insert(rows(101).map((row) => ({ ...row, class_id: other.id })));
    expect(bulk.error?.message).toContain("student_limit_exceeded");
    const stored = await a.from("students").select("id", { count: "exact", head: true }).eq("class_id", other.id);
    expect(stored.count).toBe(0);
  }, 60_000);

  it("không cho vượt 20 lớp, kể cả khi tạo song song", async () => {
    const { client, id } = await signUp(`rls-limit-${run}@example.test`);
    try {
      const attempts = await Promise.all(
        Array.from({ length: 25 }, (_, i) => client.from("classes").insert({ name: `Lớp ${i}` })),
      );
      const succeeded = attempts.filter((result) => !result.error).length;
      const rejected = attempts.filter((result) => result.error?.message.includes("class_limit_exceeded"));
      expect(succeeded).toBe(20);
      expect(rejected).toHaveLength(5);
      const stored = await client.from("classes").select("id", { count: "exact", head: true });
      expect(stored.count).toBe(20);
    } finally {
      await admin.auth.admin.deleteUser(id);
    }
  }, 60_000);
});
