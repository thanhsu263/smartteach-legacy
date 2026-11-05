import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("landing theo Figma", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 800 } });

  test("dùng chrome riêng và không có chuyển động nền vô hạn", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Điều hướng landing" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toHaveCount(0);
    await expect(page.locator("[data-parallax-stage], [data-magnetic], [data-tilt]")).toHaveCount(0);
    expect(await page.evaluate(() => document.getAnimations().some((item) => item.effect?.getComputedTiming().iterations === Infinity))).toBe(false);
  });

  test("hero, học liệu, game và FAQ đều hiện nội dung thật", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Minh họa quiz trực tiếp")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Một ý tưởng hay, ngàn cách bắt đầu." })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Cả lớp cùng bật mood/ })).toBeVisible();
    const question = page.getByText("Tôi có thể dùng SmartTeach miễn phí không?");
    await expect(question).toBeVisible();
  });

  test("landing không phát sinh yêu cầu ghi dữ liệu", async ({ page }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url());
    });
    await page.goto("/");
    await page.getByText("Học sinh có cần tạo tài khoản để chơi quiz không?").click();
    expect(writes).toEqual([]);
  });

  test("CTA phản hồi khi hover và nhấn", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    await cta.hover();
    expect(await cta.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    await cta.focus();
    expect(parseFloat(await cta.evaluate((el) => getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  });

  for (const route of ["/", "/games", "/tools"]) {
    test(`${route}: đạt WCAG A/AA`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});

test.describe("landing responsive", () => {
  for (const viewport of [{ width: 320, height: 700 }, { width: 375, height: 812 }, { width: 768, height: 900 }]) {
    test(`${viewport.width}px không tràn ngang`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});

test.describe("giảm chuyển động", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

  test("không giữ animation đang chạy", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => document.getAnimations().filter((item) => item.playState === "running").length)).toBe(0);
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    const durations = await cta.evaluate((el) => getComputedStyle(el).transitionDuration.split(",").map(Number.parseFloat));
    expect(Math.max(...durations)).toBeLessThan(0.001);
  });
});
