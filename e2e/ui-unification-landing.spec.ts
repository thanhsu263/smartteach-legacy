import { test, expect } from "@playwright/test";
import { captureUi, uiViewports } from "./helpers/ui-unification";
import { cleanupLive, loginAs, newTeacher } from "./helpers/live";

test.afterAll(cleanupLive);

test("landing giữ bố cục sau khi đi qua app", async ({ page }) => {
  test.setTimeout(90_000);
  for (const viewport of uiViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("[data-hero-classroom]")).toHaveAttribute("data-scene", /paused|running|poster/);
    await page.locator("#goi-thanh-vien").scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, 0));
    await captureUi(page, "landing-direct", "/");
    await page.locator('#tinh-nang a[href="/games"]').click();
    await expect(page).toHaveURL(/\/games$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await captureUi(page, "landing-return", "/");
  }
});

test("landing đã đăng nhập giữ launcher và panel chat riêng", async ({ page }) => {
  test.setTimeout(60_000);
  const teacher = await newTeacher("ui-home-chat");
  await page.route("**/api/chat/config", route => route.fulfill({ json: { enabled: true, available: false, retentionDays: 30, message: "Trợ lý chưa sẵn sàng trả lời." } }));
  await loginAs(page, teacher, "/dashboard");
  for (const viewport of uiViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Hỏi SmartTeach", exact: true });
    await expect(launcher).toBeVisible();
    await captureUi(page, "landing-signed-in", "/");
    await launcher.click();
    await expect(page.getByRole("dialog", { name: "Hỏi SmartTeach" })).toBeVisible();
    await captureUi(page, "landing-chat-open", "/");
    await page.getByRole("button", { name: "Thu nhỏ trợ lý" }).click();
    await expect(launcher).toBeFocused();
  }
});
