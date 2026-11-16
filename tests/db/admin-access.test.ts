import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  signUp,
  cleanupUsers,
  admin,
  anon,
  buildQuiz,
  simpleQuestion,
  type TestUser,
} from "./helpers";
import { localSql, seedAdmin } from "./admin-fixtures";
let root: TestUser, teacher: TestUser;
beforeAll(async () => {
  root = await signUp("admin-root");
  teacher = await signUp("admin-teacher");
  seedAdmin(root);
});
afterAll(cleanupUsers);
async function change(
  action: string,
  version: number,
  role: string | null = null,
) {
  return root.client.rpc("admin_update_user", {
    p_user: teacher.id,
    p_action: action,
    p_role: role,
    p_reason: "Kiểm thử phân quyền",
    p_expected_version: version,
    p_request_id: crypto.randomUUID(),
  });
}
describe("admin and account boundaries", () => {
  it("role metadata không nâng quyền; admin chỉ nhận DTO tài khoản", async () => {
    await teacher.client.auth.updateUser({
      data: { role: "admin", app_role: "admin" },
    });
    expect((await teacher.client.rpc("account_session")).data.role).toBe(
      "teacher",
    );
    expect((await teacher.client.rpc("admin_users")).error?.code).toBe("42501");
    expect((await anon.rpc("admin_users")).error?.code).toBe("42501");
    const users = await root.client.rpc("admin_users", {
      p_query: "admin-teacher",
    });
    expect(users.error).toBeNull();
    expect(Object.keys(users.data.items[0]).sort()).toEqual(
      [
        "createdAt",
        "email",
        "lastSignInAt",
        "premiumUntil",
        "role",
        "status",
        "userId",
        "version",
      ].sort(),
    );
    expect(
      (await teacher.client.rpc("bootstrap_admin", { p_user: teacher.id }))
        .error?.code,
    ).toBe("42501");
    expect(
      (await admin.rpc("bootstrap_admin", { p_user: teacher.id })).error?.code,
    ).toBe("PT409");
  });
  it("token cũ bị chặn direct tables, SQL RPC, host helper; anon student vẫn join", async () => {
    const quiz = await buildQuiz(teacher.client, "Quiz quyền", [
      simpleQuestion(),
    ]);
    const session = await teacher.client.rpc("create_session", {
      p_quiz_id: quiz,
      p_speed_bonus: false,
      p_options: {},
    });
    expect(session.error).toBeNull();
    const live = session.data[0] as { session_id: string; pin: string };
    expect((await change("block", 0)).error).toBeNull();
    expect(
      (await teacher.client.from("quizzes").select("id").eq("id", quiz)).data,
    ).toEqual([]);
    expect(
      (await teacher.client.from("quizzes").insert({ title: "Không được tạo" }))
        .error,
    ).not.toBeNull();
    expect((await teacher.client.rpc("membership_status")).error?.code).toBe(
      "42501",
    );
    expect(
      (
        await teacher.client.rpc("host_set_locked", {
          p_session: live.session_id,
          p_locked: true,
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await anon.rpc("join_session", {
          p_pin: live.pin,
          p_nickname: "Người chơi",
        })
      ).error,
    ).toBeNull();
    expect((await change("unblock", 1)).error).toBeNull();
    expect(
      (await teacher.client.from("quizzes").select("id").eq("id", quiz)).data
        ?.length,
    ).toBe(1);
  });
  it("thu hồi role áp dụng ngay, version chống ghi đè và last admin không bị mất", async () => {
    expect((await change("set_role", 2, "admin")).error).toBeNull();
    expect((await teacher.client.rpc("admin_users")).error).toBeNull();
    expect((await change("set_role", 2, "teacher")).error?.code).toBe("PT409");
    expect((await change("set_role", 3, "teacher")).error).toBeNull();
    expect((await teacher.client.rpc("admin_users")).error?.code).toBe("42501");
    const id = root.id;
    localSql(
      "begin; delete from private.account_controls where app_role='admin' and user_id<>'" +
        id +
        "'; select set_config('request.jwt.claims','{\"sub\":\"" +
        id +
        '","role":"authenticated"}\',true); do $$ begin perform public.admin_update_user(\'' +
        id +
        "','block','Kiểm thử admin cuối',1,gen_random_uuid(),null); raise exception 'missing_last_admin_guard'; exception when sqlstate 'PT409' then null; end $$; rollback;",
    );
  });
  it("audit retry không nhân thao tác và admin không đọc quiz riêng", async () => {
    const version = (await teacher.client.rpc("account_session")).data.version;
    const requestId = crypto.randomUUID();
    const args = {
      p_user: teacher.id,
      p_action: "unblock",
      p_reason: "Kiểm thử lặp",
      p_expected_version: version,
      p_request_id: requestId,
      p_role: null,
    };
    expect((await root.client.rpc("admin_update_user", args)).error).toBeNull();
    expect((await root.client.rpc("admin_update_user", args)).error).toBeNull();
    const audit = await root.client.rpc("admin_audit_list", { p_limit: 50 });
    expect(audit.error).toBeNull();
    expect(
      audit.data.items.filter(
        (item: { actorId: string; metadata: { reason: string } }) =>
          item.actorId === root.id && item.metadata.reason === "Kiểm thử lặp",
      ).length,
    ).toBe(1);
    expect(
      (
        await root.client
          .from("quizzes")
          .select("title")
          .eq("owner_id", teacher.id)
      ).data,
    ).toEqual([]);
  });
  it("hai admin đồng thời thu hồi nhau vẫn kiểm lại actor sau khóa",async()=>{
    const before=(await teacher.client.rpc("account_session")).data.version;
    expect((await change("set_role",before,"admin")).error).toBeNull();
    const teacherVersion=(await teacher.client.rpc("account_session")).data.version;
    const rootVersion=(await root.client.rpc("account_session")).data.version;
    const update=(user:string,version:number)=>({p_user:user,p_action:"set_role",p_role:"teacher",p_reason:"Kiểm thử thu hồi đồng thời",p_expected_version:version,p_request_id:crypto.randomUUID()});
    const results=await Promise.all([
      root.client.rpc("admin_update_user",update(teacher.id,teacherVersion)),
      teacher.client.rpc("admin_update_user",update(root.id,rootVersion)),
    ]);
    expect(results.filter(r=>!r.error)).toHaveLength(1);
    const sessions=await Promise.all([root.client.rpc("account_session"),teacher.client.rpc("account_session")]);
    expect(sessions.filter(r=>r.data.role==="admin")).toHaveLength(1);
  });
});
