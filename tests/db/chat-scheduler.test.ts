import { afterAll, it, expect } from "vitest";
import { signUp, cleanupUsers, run } from "./helpers";
import { localSql } from "./admin-fixtures";
const job = "test-chat-purge-" + run;
afterAll(async () => {
  localSql(
    "select cron.unschedule(jobid) from cron.job where jobname='" + job + "';",
  );
  await cleanupUsers();
});
it("pg_cron hard-deletes expired chat without HTTP requests", async () => {
  const user = await signUp("purge-cron"),
    thread = (await user.client.rpc("chat_create_thread")).data;
  localSql(
    "update public.chat_threads set created_at=now()-interval '31 days' where id='" +
      thread +
      "';insert into public.chat_messages(owner_id,thread_id,request_id,role,body,created_at,expires_at) values('" +
      user.id +
      "','" +
      thread +
      "',gen_random_uuid(),'user','Expired fixture',now()-interval '31 days',now()-interval '1 day');select cron.schedule('" +
      job +
      "','* * * * *','select private.purge_expired_chat();');",
  );
  const deadline = Date.now() + 80000;
  let count = "1";
  while (Date.now() < deadline) {
    count = localSql(
      "select count(*) from public.chat_threads where id='" + thread + "';",
    ).trim();
    if (count === "0") break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  expect(count).toBe("0");
  expect(
    localSql(
      "select count(*) from public.chat_messages where thread_id='" +
        thread +
        "';",
    ).trim(),
  ).toBe("0");
  expect(
    localSql(
      "select count(*) from cron.job where jobname='smartteach-chat-retention' and schedule='0 * * * *' and active;",
    ).trim(),
  ).toBe("1");
}, 85000);
