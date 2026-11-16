import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { cleanupLive, localConfig, loginAs, newTeacher } from "./helpers/live";
import { seedAdmin, localSql } from "../tests/db/admin-fixtures";
test.afterAll(cleanupLive);
test.describe.configure({ mode: "serial" });
for (const width of [375, 768, 1280]) {
  test(
    "admin shell, real data and forms at " + width + "px",
    async ({ page }) => {
      const root = await newTeacher("admin-ui");
      seedAdmin(root);
      await page.setViewportSize({ width, height: 900 });
      await loginAs(page, root, "/admin");
      await expect(
        page.getByRole("heading", { name: "Tổng quan hệ thống" }),
      ).toBeVisible();
      for (const [path, title] of [
        ["users", "Tài khoản & phân quyền"],
        ["games", "Danh mục game"],
        ["settings", "Cấu hình website"],
        ["ai", "AI và API"],
        ["rag/documents", "Tài liệu RAG"],
        ["memberships", "Thành viên và đơn"],
        ["library", "Duyệt học liệu"],
        ["audit", "Nhật ký quản trị"],
        ["operations", "Vận hành"],
      ]) {
        await page.goto("/admin/" + path);
        await expect(
          page.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(page.locator("main [role=alert]")).toHaveCount(0);
        if(path==="rag/documents"&&!process.env.AI_KEYRING_JSON){
          await page.getByLabel("Tệp PDF hoặc DOCX").filter({visible:true}).setInputFiles("tests/fixtures/rag/smartteach-vietnamese.pdf");
          await expect(page.getByRole("button",{name:"Tải và nạp tài liệu"})).toBeDisabled();
          await expect(page.getByRole("status").filter({hasText:"Chưa sẵn sàng nạp tài liệu."})).toBeVisible();
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(0);
      }
      await page.goto("/admin/settings");
      await expect(page.getByLabel("Email liên hệ")).toBeVisible();
      await page.screenshot({
        path: "artifacts/admin-rag/admin-settings-" + width + ".png",
        fullPage: true,
      });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    },
  );
}
test("teacher/guest cannot call admin, stale version and origin are rejected", async ({
  page,
  request,
  baseURL,
}) => {
  expect((await request.get("/api/admin/users")).status()).toBe(401);
  const teacher = await newTeacher("teacher-deny");
  await loginAs(page, teacher, "/dashboard");
  expect((await page.request.get("/api/admin/users")).status()).toBe(403);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Không có quyền quản trị" }),
  ).toBeVisible();
  expect(
    (
      await page.request.post("/api/chat/threads", {
        data: {},
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/internal/rag/jobs/run", {
        data: {},
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(403);
});
test("runtime game new ID, hide, metadata HTTP 404 and settings invalidation", async ({
  page,
  request,
  baseURL,
}) => {
  const root = await newTeacher("catalog-ui");
  seedAdmin(root);
  await loginAs(page, root, "/admin/games");
  const slug = "e2e-catalog-" + Date.now().toString(36);
  const headers = { Origin: baseURL! };
  const original = (await (
    await page.request.get("/api/admin/settings")
  ).json()) as { data: Record<string, unknown>; version: number };
  try {
    await page.getByRole("button", { name: "Thêm game", exact: true }).click();
    await page.getByLabel("Đường dẫn ngắn").fill(slug);
    await page.getByLabel("Tên game", { exact: true }).fill("Game từ quản trị");
    await page.getByLabel("Mô tả", { exact: true }).fill("Dữ liệu runtime");
    await page.getByRole("button", { name: "Lưu game", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Sửa Game từ quản trị/ }),
    ).toBeVisible();
    const fresh = await request.get("/games/" + slug);
    expect(fresh.status()).toBe(200);
    expect(await fresh.text()).toContain("Game từ quản trị");
    const catalog = await (await page.request.get("/api/admin/games")).json();
    const row = catalog.items.find((g: { id: string }) => g.id === slug);
    expect(
      (
        await page.request.patch("/api/admin/games/" + slug, {
          data: {
            payload: row.payload,
            published: false,
            expectedVersion: row.version,
          },
          headers,
        })
      ).status(),
    ).toBe(200);
    expect((await request.get("/games/" + slug)).status()).toBe(404);
    expect((await request.get("/games/unknown-game-123")).status()).toBe(404);
    await page.goto("/admin/settings");
    await page
      .getByLabel("Thông báo", { exact: true })
      .fill("Thông báo kiểm thử runtime");
    await page
      .getByRole("button", { name: "Lưu cấu hình", exact: true })
      .click();
    await expect(
      page
        .getByRole("status", { name: "" })
        .filter({ hasText: "Đã cập nhật cấu hình." }),
    ).toBeVisible();
    const html = await (await request.get("/")).text();
    expect(html).toContain("Thông báo kiểm thử runtime");
    const stale = await page.request.patch("/api/admin/settings", {
      headers,
      data: { data: original.data, expectedVersion: original.version },
    });
    expect(stale.status()).toBe(409);
  } finally {
    const current = await (
      await page.request.get("/api/admin/settings")
    ).json();
    await page.request.patch("/api/admin/settings", {
      headers,
      data: { data: original.data, expectedVersion: current.version },
    });
    const cfg = localConfig();
    await createClient(cfg.url, cfg.serviceRoleKey)
      .from("game_catalog")
      .delete()
      .eq("id", slug);
  }
});
for (const width of [375, 768, 1280]) {
  test(
    "chat UI with fixture SSE, real owner history/source/delete at " +
      width +
      "px",
    async ({ page }) => {
      const teacher = await newTeacher("chat-ui"),
        source = crypto.randomUUID(),
        version = crypto.randomUUID(),
        chunk = crypto.randomUUID();
      localSql(
        "insert into private.rag_sources(id,kind,title) values('" +
          source +
          "','document','Hướng dẫn SmartTeach');insert into private.rag_versions(id,source_id,generation,format,status,chunk_count) values('" +
          version +
          "','" +
          source +
          "',1,'pdf','ready',1);insert into private.rag_chunks(id,version_id,position,body,locator) values('" +
          chunk +
          "','" +
          version +
          "',0,'Chọn Quiz của tôi để bắt đầu.','{\"page\":1}');update private.rag_sources set active_version='" +
          version +
          "' where id='" +
          source +
          "';",
      );
      try {
        await page.route("**/api/chat/config", (route) =>
          route.fulfill({
            json: {
              enabled: true,
              available: true,
              retentionDays: 30,
              message: "Fixture UI; không gọi Gemini.",
            },
          }),
        );
        await page.route("**/api/chat/threads/*/messages", async (route) => {
          const body = route.request().postDataJSON(),
            thread = route.request().url().split("/").at(-2)!;
          const cfg = localConfig(),
            db = createClient(cfg.url, cfg.serviceRoleKey);
          expect(
            (
              await db.from("chat_messages").insert({
                owner_id: teacher.id,
                thread_id: thread,
                request_id: body.requestId,
                role: "user",
                body: body.text,
              })
            ).error,
          ).toBeNull();
          expect(
            (
              await db.from("chat_messages").insert({
                owner_id: teacher.id,
                thread_id: thread,
                request_id: body.requestId,
                role: "assistant",
                body: "Chọn Quiz của tôi. <script>window.__unsafe=1</script>",
                citations: [
                  {
                    id: chunk,
                    versionId: version,
                    title: "Hướng dẫn SmartTeach",
                    locator: { page: 1 },
                    kind: "document",
                    publicationId: null,
                  },
                ],
              })
            ).error,
          ).toBeNull();
          await route.fulfill({
            contentType: "text/event-stream",
            body: 'event: state\ndata: {"state":"retrieving"}\n\nevent: state\ndata: {"state":"generating"}\n\nevent: done\ndata: {}\n\n',
          });
        });
        await page.setViewportSize({ width, height: 900 });
        await loginAs(page, teacher, "/dashboard");
        const launcher = page.getByRole("button", {
          name: "Hỏi SmartTeach",
          exact: true,
        });
        await launcher.click();
        const panel = page.getByRole("dialog", { name: "Hỏi SmartTeach" });
        await expect(panel).toBeVisible();
        await panel
          .getByLabel("Câu hỏi của thầy cô")
          .fill("Hướng dẫn tạo quiz");
        await panel
          .getByRole("button", { name: "Gửi câu hỏi", exact: true })
          .click();
        await expect(
          panel.getByText("Chọn Quiz của tôi.", { exact: false }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => (window as Window & { __unsafe?: number }).__unsafe,
          ),
        ).toBeUndefined();
        await expect(
          panel.getByRole("link", { name: /Hướng dẫn SmartTeach/ }),
        ).toHaveAttribute("href", "/help/sources/" + chunk);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(0);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: "artifacts/admin-rag/chat-" + width + ".png",
          fullPage: true,
        });
        await page.keyboard.press("Escape");
        await expect(panel).not.toBeVisible();
        await expect(launcher).toBeFocused();
        await launcher.click();
        page.once("dialog", (d) => d.accept());
        await panel.getByRole("button", { name: "Xóa", exact: true }).click();
        await expect(
          panel.getByText("Chọn Quiz của tôi.", { exact: false }),
        ).toHaveCount(0);
        if (width === 1280) {
          await page.evaluate(() => {
            const other = document.createElement("dialog");
            other.id = "test-other-modal";
            document.body.append(other);
            other.showModal();
          });
          await expect(launcher).not.toBeVisible();
          await page.evaluate(() =>
            document.getElementById("test-other-modal")?.remove(),
          );
          await expect(launcher).toBeVisible();
          await expect(panel).not.toBeVisible();
          await launcher.click();
          await page.evaluate(() =>
            document.documentElement.requestFullscreen(),
          );
          await expect(launcher).not.toBeVisible();
          await page.evaluate(() => document.exitFullscreen());
          await expect(launcher).toBeVisible();
          await expect(panel).not.toBeVisible();
        }
        await page.goto("/help/sources/" + chunk);
        await expect(page.getByRole("blockquote")).toContainText(
          "Chọn Quiz của tôi",
        );
        localSql(
          "update private.rag_sources set deleted_at=now() where id='" +
            source +
            "';",
        );
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Nguồn không còn truy cập được" }),
        ).toBeVisible();
      } finally {
        localSql("delete from private.rag_sources where id='" + source + "';");
      }
    },
  );
}
