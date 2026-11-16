import { beforeAll, afterAll, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  signUp,
  cleanupUsers,
  admin,
  anon,
  type TestUser,
  run,
} from "./helpers";
import { seedAdmin, localSql } from "./admin-fixtures";
let root: TestUser, a: TestUser, b: TestUser;
const source = crypto.randomUUID(),
  version = crypto.randomUUID(),
  chunk = crypto.randomUUID(),
  credential = crypto.randomUUID();
const vector = JSON.stringify([1, ...Array(767).fill(0)]);
let settings: Record<string, unknown>,
  ai: Record<string, unknown>,
  thread: string;
beforeAll(async () => {
  root = await signUp("rag-admin");
  a = await signUp("chat-a");
  b = await signUp("chat-b");
  seedAdmin(root);
  settings = (await admin.from("site_settings").select("data").single()).data!
    .data;
  ai = (await root.client.rpc("admin_ai_config")).data.settings;
  localSql(
    "insert into private.rag_sources(id,kind,title) values('" +
      source +
      "','document','Hướng dẫn SmartTeach');insert into private.rag_versions(id,source_id,generation,format,status,chunk_count) values('" +
      version +
      "','" +
      source +
      "',1,'pdf','ready',1);insert into private.rag_chunks(id,version_id,position,body,locator,embedding) values('" +
      chunk +
      "','" +
      version +
      "',0,'Giáo viên mở Quiz của tôi để tạo quiz.','{\"page\":1}','" +
      vector +
      "'::extensions.vector);update private.rag_sources set active_version='" +
      version +
      "' where id='" +
      source +
      "';",
  );
  await root.client.rpc("admin_save_ai_credential", {
    p_id: credential,
    p_label: "Chat fixture",
    p_project: "chat-" + run,
    p_ciphertext: { v: "fixture", iv: "x", tag: "x", data: "x" },
    p_last4: "1234",
    p_free_verified: true,
    p_expected_version: 0,
  });
  await admin.rpc("ai_record_result", {
    p_credential: credential,
    p_model: "gemini-2.5-flash-lite",
    p_result: "healthy",
    p_cooldown_seconds: 0,
  });
  const config = (await root.client.rpc("admin_ai_config")).data.settings;
  const { version: rev, ...data } = config;
  data.model = "gemini-2.5-flash-lite";
  expect(
    (
      await root.client.rpc("admin_save_ai_settings", {
        p_data: data,
        p_expected_version: rev,
      })
    ).error,
  ).toBeNull();
  const s = (await admin.from("site_settings").select("version").single())
    .data!;
  expect(
    (
      await root.client.rpc("admin_save_settings", {
        p_data: { ...settings, chatbotEnabled: true },
        p_expected_version: s.version,
      })
    ).error,
  ).toBeNull();
});
afterAll(async () => {
  await root.client.rpc("admin_control_ai_credential", {
    p_id: credential,
    p_operation: "delete",
    p_expected_version: 1,
  });
  await admin.from("site_settings").update({ data: settings }).eq("id", true);
  const data = { ...ai };
  delete data.version;
  const current = (await root.client.rpc("admin_ai_config")).data.settings
    .version;
  await root.client.rpc("admin_save_ai_settings", {
    p_data: data,
    p_expected_version: current,
  });
  localSql("delete from private.rag_sources where id='" + source + "';");
  await cleanupUsers();
});
it("retrieval and source DTO require active user and only active versions", async () => {
  expect((await anon.rpc("rag_source", { p_id: chunk })).error?.code).toBe(
    "42501",
  );
  const found = await a.client.rpc("rag_retrieve", { p_embedding: vector });
  expect(found.error).toBeNull();
  expect(found.data.some((c: { id: string }) => c.id === chunk)).toBe(true);
  expect(
    (await root.client.rpc("rag_source", { p_id: chunk })).data.body,
  ).toContain("Quiz của tôi");
  localSql(
    "update private.rag_sources set deleted_at=now() where id='" +
      source +
      "';",
  );
  expect((await a.client.rpc("rag_source", { p_id: chunk })).data).toBeNull();
  localSql(
    "update private.rag_sources set deleted_at=null where id='" + source + "';",
  );
});
it("owner history and idempotency, sources checked again before final output", async () => {
  const config = await a.client.rpc("chat_config");
  expect(config.error).toBeNull();
  expect(config.data.available).toBe(true);
  const created = await a.client.rpc("chat_create_thread");
  expect(created.error).toBeNull();
  thread = created.data;
  const request = crypto.randomUUID(),
    text = "Hướng dẫn tạo quiz?";
  const args = {
    p_thread: thread,
    p_request: request,
    p_text: text,
    p_hash: createHash("sha256").update(text).digest("hex"),
  };
  const begin = await a.client.rpc("chat_begin", args);
  expect(begin.error).toBeNull();
  expect(begin.data.state).toBe("started");
  expect((await a.client.rpc("chat_begin", args)).data.state).toBe(
    "processing",
  );
  expect(
    (await b.client.rpc("chat_thread_messages", { p_id: thread })).error?.code,
  ).toBe("PT404");
  expect(
    (await root.client.rpc("chat_thread_messages", { p_id: thread })).error
      ?.code,
  ).toBe("PT404");
  expect(
    (
      await root.client
        .from("chat_messages")
        .select("body")
        .eq("thread_id", thread)
    ).data,
  ).toEqual([]);
  localSql(
    "update private.rag_sources set deleted_at=now() where id='" +
      source +
      "';",
  );
  const finish = {
    p_owner: a.id,
    p_request: request,
    p_lease: begin.data.lease,
    p_body: "Mở Quiz của tôi.",
    p_citations: [{ id: chunk, versionId: version }],
    p_outcome: "answer",
  };
  expect((await admin.rpc("chat_finish", finish)).error?.code).toBe("PT409");
  localSql(
    "update private.rag_sources set deleted_at=null where id='" + source + "';",
  );
  expect((await admin.rpc("chat_finish", finish)).error).toBeNull();
  expect((await a.client.rpc("chat_begin", args)).data.state).toBe("completed");
  expect(
    (await a.client.rpc("chat_thread_messages", { p_id: thread })).data.items,
  ).toHaveLength(2);
});
it("delete fences in-flight answer, hard deletes messages immediately", async () => {
  const request = crypto.randomUUID(),
    text = "Tìm học liệu Toán lớp 6";
  const begin = await a.client.rpc("chat_begin", {
    p_thread: thread,
    p_request: request,
    p_text: text,
    p_hash: createHash("sha256").update(text).digest("hex"),
  });
  expect(begin.error).toBeNull();
  expect(
    (await a.client.rpc("chat_delete_thread", { p_id: thread })).error,
  ).toBeNull();
  expect(
    (
      await admin.rpc("chat_finish", {
        p_owner: a.id,
        p_request: request,
        p_lease: begin.data.lease,
        p_body: "Nội dung",
        p_citations: [],
        p_outcome: "no_source",
      })
    ).error?.code,
  ).toBe("PT409");
  expect(
    (await admin.from("chat_messages").select("id").eq("thread_id", thread))
      .data,
  ).toEqual([]);
  expect(
    (await a.client.rpc("chat_thread_messages", { p_id: thread })).error?.code,
  ).toBe("PT404");
});
it("expiry is filtered without traffic and SQL purge deletes messages and empty threads", async () => {
  const t = (await a.client.rpc("chat_create_thread")).data;
  localSql(
    "insert into public.chat_messages(owner_id,thread_id,request_id,role,body,created_at,expires_at) values('" +
      a.id +
      "','" +
      t +
      "',gen_random_uuid(),'user','CANARY_EXPIRED',now()-interval '31 days',now()-interval '1 day');",
  );
  expect(
    (await a.client.rpc("chat_thread_messages", { p_id: t })).data.items,
  ).toEqual([]);
  expect(
    (await a.client.from("chat_messages").select("body").eq("thread_id", t))
      .data,
  ).toEqual([]);
  localSql("select private.purge_expired_chat();");
  expect(
    (await admin.from("chat_messages").select("id").eq("thread_id", t)).data,
  ).toEqual([]);
  expect(
    localSql(
      "select count(*) from cron.job where jobname='smartteach-chat-retention' and active;",
    ).trim(),
  ).toBe("1");
});
