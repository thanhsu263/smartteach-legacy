import { expect, it } from "vitest";
import { anon, run } from "./helpers";
import { localSql } from "./admin-fixtures";

it("service runtime orders eligible credentials without an aggregate GROUP BY error", () => {
  const project = "runtime-" + run;
  const ids = Array.from({ length: 5 }, () => crypto.randomUUID()).sort();
  // All fixture rows are uncommitted and rolled back, so a running worker cannot
  // observe fake credentials and no existing configuration needs to be changed.
  const result = localSql(`
    begin;
    insert into private.ai_credentials
      (id,label,project_ref,ciphertext,last4,enabled,state,free_verified_at,created_at)
    values
      ('${ids[1]}','Runtime fixture','${project}','{"v":"fixture","iv":"x","tag":"x","data":"FAKE"}','1234',true,'healthy',now(),'2020-01-02'),
      ('${ids[2]}','Runtime fixture','${project}','{"v":"fixture","iv":"x","tag":"x","data":"FAKE"}','1234',true,'untested',now(),'2020-01-01'),
      ('${ids[0]}','Runtime fixture','${project}','{"v":"fixture","iv":"x","tag":"x","data":"FAKE"}','1234',true,'untested',now(),'2020-01-02'),
      ('${ids[3]}','Runtime fixture','${project}','{"v":"fixture","iv":"x","tag":"x","data":"FAKE"}','1234',false,'healthy',now(),'2019-01-01'),
      ('${ids[4]}','Runtime fixture','${project}','{"v":"fixture","iv":"x","tag":"x","data":"FAKE"}','1234',true,'invalid',now(),'2019-01-01');
    set local request.jwt.claims = '{"role":"service_role"}';
    with runtime as (select public.ai_runtime() as value)
    select jsonb_build_object(
      'settingsPresent',jsonb_typeof(value->'settings')='object',
      'ids',(select jsonb_agg(entry->>'id' order by ordinal)
        from jsonb_array_elements(value->'credentials') with ordinality as rows(entry,ordinal)
        where entry->>'project_ref'='${project}'),
      'credentialsIncludeCiphertext',(select bool_and(entry ? 'ciphertext')
        from jsonb_array_elements(value->'credentials') as rows(entry)
        where entry->>'project_ref'='${project}')
    ) from runtime;
    rollback;
  `);
  const line = result.split(/\r?\n/).find((row) => row.startsWith("{"));
  expect(line).toBeDefined();
  expect(JSON.parse(line!)).toEqual({
    settingsPresent: true,
    ids: [ids[2], ids[0], ids[1]],
    credentialsIncludeCiphertext: true,
  });
});

it("runtime remains unavailable to anonymous callers", async () => {
  expect((await anon.rpc("ai_runtime")).error?.code).toBe("42501");
});

it("current model can be configured and reserve quota through the actual RPCs", () => {
  const userId = crypto.randomUUID(), credentialId = crypto.randomUUID();
  const project = "current-model-" + run;
  const result = localSql(`
    begin;
    insert into auth.users(id,email) values('${userId}','runtime-${run}@example.test');
    insert into private.account_controls(user_id,app_role) values('${userId}','admin');
    insert into private.ai_credentials(id,label,project_ref,ciphertext,last4,free_verified_at)
      values('${credentialId}','Current model fixture','${project}','{"v":"fixture","iv":"x","tag":"x","data":"FAKE"}','1234',now());
    set local request.jwt.claims = '{"role":"authenticated","sub":"${userId}"}';
    select public.admin_save_ai_settings(jsonb_build_object(
      'model','gemini-3.5-flash-lite','outputTokens',output_tokens,
      'userDailyCap',user_daily_cap,'rpm',rpm,'tpm',tpm,'rpd',rpd
    ),version) from private.ai_settings;
    set local request.jwt.claims = '{"role":"service_role"}';
    select jsonb_build_object(
      'model',(select chat_model from private.ai_settings),
      'reserved',public.ai_reserve_quota('${credentialId}','gemini-3.5-flash-lite',200)
    );
    rollback;
  `);
  const line = result.split(/\r?\n/).find((row) => row.startsWith("{"));
  expect(line).toBeDefined();
  expect(JSON.parse(line!)).toEqual({ model: "gemini-3.5-flash-lite", reserved: true });
});
