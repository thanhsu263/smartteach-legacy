import { beforeAll, afterAll, it, expect } from "vitest";
import { signUp, cleanupUsers, admin, type TestUser, run } from "./helpers";
import { seedAdmin, localSql } from "./admin-fixtures";
let root: TestUser, teacher: TestUser;
const project = "quota-" + run,
  ids = [crypto.randomUUID(), crypto.randomUUID()];
beforeAll(async () => {
  root = await signUp("ai-admin");
  teacher = await signUp("ai-teacher");
  seedAdmin(root);
});
afterAll(async () => {
  for (const id of ids)
    await root.client.rpc("admin_control_ai_credential", {
      p_id: id,
      p_operation: "delete",
      p_expected_version: 1,
    });
  localSql("delete from private.ai_quota where project_ref='" + project + "';");
  await cleanupUsers();
});
it("only masked credential DTO is exposed, private runtime is service only", async () => {
  for (const id of ids)
    expect(
      (
        await root.client.rpc("admin_save_ai_credential", {
          p_id: id,
          p_label: "Fixture",
          p_project: project,
          p_ciphertext: {
            v: "fixture",
            iv: "x",
            tag: "x",
            data: "CANARY_CIPHERTEXT",
          },
          p_last4: "1234",
          p_free_verified: true,
          p_expected_version: 0,
        })
      ).error,
    ).toBeNull();
  const metadata = await root.client.rpc("admin_ai_config");
  expect(metadata.error).toBeNull();
  expect(JSON.stringify(metadata.data)).not.toContain("CANARY_CIPHERTEXT");
  expect((await teacher.client.rpc("admin_ai_config")).error?.code).toBe(
    "42501",
  );
  expect((await root.client.rpc("ai_runtime")).error?.code).toBe("42501");
});
it("concurrent reservations share RPM between keys and cooldown stops both", async () => {
  const calls = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      admin.rpc("ai_reserve_quota", {
        p_credential: ids[i % 2],
        p_model: "gemini-embedding-001",
        p_tokens: 100,
      }),
    ),
  );
  expect(calls.every((x) => !x.error)).toBe(true);
  expect(calls.filter((x) => x.data === true)).toHaveLength(5);
  expect(
    (
      await admin.rpc("ai_record_result", {
        p_credential: ids[0],
        p_model: "gemini-2.5-flash-lite",
        p_result: "quota",
        p_cooldown_seconds: 60,
      })
    ).error,
  ).toBeNull();
  // Quota record must exist for the group before a provider result can update it.
  await admin.rpc("ai_reserve_quota", {
    p_credential: ids[0],
    p_model: "gemini-2.5-flash-lite",
    p_tokens: 100,
  });
  await admin.rpc("ai_record_result", {
    p_credential: ids[0],
    p_model: "gemini-2.5-flash-lite",
    p_result: "quota",
    p_cooldown_seconds: 60,
  });
  expect(
    (
      await admin.rpc("ai_reserve_quota", {
        p_credential: ids[1],
        p_model: "gemini-2.5-flash-lite",
        p_tokens: 100,
      })
    ).data,
  ).toBe(false);
  expect(
    (
      await admin.rpc("ai_reserve_quota", {
        p_credential: ids[0],
        p_model: "paid-model",
        p_tokens: 100,
      })
    ).error?.code,
  ).toBe("PT400");
});
