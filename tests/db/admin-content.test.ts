import { beforeAll, afterAll, it, expect } from "vitest";
import {
  signUp,
  cleanupUsers,
  admin,
  anon,
  buildQuiz,
  simpleQuestion,
  type TestUser,
  run,
} from "./helpers";
import { seedAdmin } from "./admin-fixtures";
let root: TestUser, teacher: TestUser;
let settings: { data: Record<string, unknown>; version: number };
const id = "test-game-" + run;
const payload = {
  title: "Game kiểm thử",
  description: "Trò chơi",
  subjects: ["toan"],
  grades: ["6"],
  embedUrl: "https://www.quyentran.online/",
  featured: false,
};
beforeAll(async () => {
  root = await signUp("content-admin");
  teacher = await signUp("content-teacher");
  seedAdmin(root);
  settings = (await admin.from("site_settings").select("data,version").single())
    .data!;
});
afterAll(async () => {
  await admin.from("game_catalog").delete().eq("id", id);
  // Restore only the settings fields this isolated suite changed; keep monotonic revisions.
  await admin
    .from("site_settings")
    .update({ data: settings.data })
    .eq("id", true);
  await cleanupUsers();
});
it("catalog permissions, trusted URLs, new IDs and hidden state", async () => {
  const args = {
    p_id: id,
    p_payload: payload,
    p_published: true,
    p_expected_version: 0,
  };
  expect((await teacher.client.rpc("admin_save_game", args)).error?.code).toBe(
    "42501",
  );
  expect(
    (
      await root.client.rpc("admin_save_game", {
        ...args,
        p_payload: {
          ...payload,
          embedUrl: "https://www.quyentran.online.evil.test/",
        },
      })
    ).error?.code,
  ).toBe("PT400");
  expect(
    (
      await root.client.rpc("admin_save_game", {
        ...args,
        p_payload: { ...payload, subjects: ["unknown"] },
      })
    ).error,
  ).not.toBeNull();
  expect((await root.client.rpc("admin_save_game", args)).error).toBeNull();
  expect(
    (await anon.from("game_catalog").select("id").eq("id", id)).data,
  ).toHaveLength(1);
  expect(
    (
      await root.client.rpc("admin_save_game", {
        ...args,
        p_published: false,
        p_expected_version: 1,
      })
    ).error,
  ).toBeNull();
  expect(
    (await anon.from("game_catalog").select("id").eq("id", id)).data,
  ).toEqual([]);
  expect(
    (
      await root.client.rpc("admin_save_game", {
        ...args,
        p_expected_version: 1,
      })
    ).error?.code,
  ).toBe("PT409");
});
it("settings are allowlisted, CAS and submissions flag is enforced at RPC", async () => {
  const args = {
    p_data: { ...settings.data, librarySubmissionsEnabled: false },
    p_expected_version: settings.version,
  };
  expect(
    (
      await root.client.rpc("admin_save_settings", {
        ...args,
        p_data: { ...args.p_data, secret: "CANARY_SECRET" },
      })
    ).error?.code,
  ).toBe("PT400");
  expect((await root.client.rpc("admin_save_settings", args)).error).toBeNull();
  expect((await root.client.rpc("admin_save_settings", args)).error?.code).toBe(
    "PT409",
  );
  const quiz = await buildQuiz(teacher.client, "Privé", [simpleQuestion()]);
  const submit = await teacher.client.rpc("submit_quiz_publication", {
    p_quiz_id: quiz,
    p_title: "Toán",
    p_description: "",
    p_subject: "toan",
    p_grades: ["6"],
  });
  expect(submit.error?.code).toBe("PT403");
  const row = (await admin.from("site_settings").select("version").single())
    .data!;
  expect(
    (
      await root.client.rpc("admin_save_settings", {
        p_data: settings.data,
        p_expected_version: row.version,
      })
    ).error,
  ).toBeNull();
});
it("moderation uses submitted snapshot only; withdrawal fences a stale approval", async () => {
  const quiz = await buildQuiz(teacher.client, "CANARY_PRIVATE_TITLE", [
    simpleQuestion("Bản gửi"),
  ]);
  const pub = await teacher.client.rpc("submit_quiz_publication", {
    p_quiz_id: quiz,
    p_title: "Học liệu công khai",
    p_description: "Mô tả",
    p_subject: "toan",
    p_grades: ["6"],
  });
  expect(pub.error).toBeNull();
  const list = await root.client.rpc("admin_library");
  expect(list.error).toBeNull();
  const item = list.data.items.find((x: { id: string }) => x.id === pub.data);
  expect(item.questions[0]).toEqual({
    kind: "single",
    prompt: "Bản gửi",
    options: [{ label: "A" }, { label: "B" }],
  });
  expect(JSON.stringify(list.data)).not.toContain("CANARY_PRIVATE_TITLE");
  expect(JSON.stringify(item)).not.toContain("is_correct");
  const args = {
    p_id: pub.data,
    p_status: "approved",
    p_reason: "Đã kiểm tra",
    p_expected_version: item.version,
  };
  expect(
    (await teacher.client.rpc("admin_moderate_publication", args)).error?.code,
  ).toBe("42501");
  expect(
    (await root.client.rpc("admin_moderate_publication", args)).error,
  ).toBeNull();
  expect(
    (await anon.rpc("library_browse")).data.items.some(
      (x: { id: string }) => x.id === pub.data,
    ),
  ).toBe(true);
  expect(
    (
      await root.client.rpc("admin_moderate_publication", {
        ...args,
        p_status: "hidden",
        p_expected_version: item.version + 1,
      })
    ).error,
  ).toBeNull();
  expect(
    (await anon.rpc("library_browse")).data.items.some(
      (x: { id: string }) => x.id === pub.data,
    ),
  ).toBe(false);
  const second = await teacher.client.rpc("submit_quiz_publication", {
    p_quiz_id: quiz,
    p_title: "Bản rút",
    p_description: "",
    p_subject: "toan",
    p_grades: ["6"],
  });
  expect(second.error).toBeNull();
  expect(
    (
      await teacher.client.rpc("withdraw_quiz_publication", {
        p_publication: second.data,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await root.client.rpc("admin_moderate_publication", {
        ...args,
        p_id: second.data,
        p_expected_version: 1,
      })
    ).error?.code,
  ).toBe("PT409");
});
