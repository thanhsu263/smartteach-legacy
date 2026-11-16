import { beforeAll, afterAll, it, expect } from "vitest";
import { signUp, cleanupUsers, admin, type TestUser } from "./helpers";
import { seedAdmin } from "./admin-fixtures";
let root: TestUser, teacher: TestUser;
beforeAll(async () => {
  root = await signUp("membership-admin");
  teacher = await signUp("membership-target");
  seedAdmin(root);
});
afterAll(cleanupUsers);
it("manual adjustment is privileged, versioned and idempotent; money stays unchanged", async () => {
  const args = {
    p_user: teacher.id,
    p_action: "month",
    p_reason: "Hỗ trợ triển khai",
    p_expected_version: 0,
    p_request_id: crypto.randomUUID(),
  };
  expect(
    (await teacher.client.rpc("admin_membership", { p_user: root.id })).error
      ?.code,
  ).toBe("42501");
  expect(
    (await teacher.client.rpc("admin_adjust_membership", args)).error?.code,
  ).toBe("42501");
  const first = await root.client.rpc("admin_adjust_membership", args);
  expect(first.error).toBeNull();
  expect((await root.client.rpc("admin_adjust_membership", args)).data).toBe(
    first.data,
  );
  expect(
    (
      await root.client.rpc("admin_adjust_membership", {
        ...args,
        p_request_id: crypto.randomUUID(),
      })
    ).error?.code,
  ).toBe("PT409");
  const row = await root.client.rpc("admin_membership", { p_user: teacher.id });
  expect(row.data.version).toBe(1);
  expect(row.data.orders).toEqual([]);
  expect(row.data.adjustments).toHaveLength(1);
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      root.client.rpc("admin_adjust_membership", {
        ...args,
        p_action: "year",
        p_expected_version: 1,
        p_request_id: crypto.randomUUID(),
      }),
    ),
  );
  expect(concurrent.filter((x) => !x.error)).toHaveLength(1);
  expect(concurrent.find((x) => x.error)?.error?.code).toBe("PT409");
  const revoke = await root.client.rpc("admin_adjust_membership", {
    ...args,
    p_action: "revoke",
    p_expected_version: 2,
    p_request_id: crypto.randomUUID(),
  });
  expect(revoke.error).toBeNull();
  expect(
    (await teacher.client.rpc("membership_status")).data.isPremium,
  ).not.toBe(true);
  expect(
    (
      await admin
        .from("membership_orders")
        .select("id")
        .eq("user_id", teacher.id)
    ).data,
  ).toEqual([]);
});
it("overview only aggregates", async () => {
  expect((await teacher.client.rpc("admin_overview")).error?.code).toBe(
    "42501",
  );
  const value = await root.client.rpc("admin_overview");
  expect(value.error).toBeNull();
  expect(Object.keys(value.data).sort()).toEqual(
    [
      "users",
      "quizzes",
      "approved",
      "pending",
      "reports",
      "adjustments",
      "orders",
    ].sort(),
  );
});
