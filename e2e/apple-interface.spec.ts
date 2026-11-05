import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("vật liệu và phản hồi Apple-style", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 800 } });

  test("nền tĩnh không chặn thao tác và chrome nổi dùng blur có chủ đích", async ({ page }) => {
    await page.goto("/");
    const ambient = page.locator("body > div[aria-hidden='true']").first();
    await expect(ambient).toHaveCSS("position", "fixed");
    await expect(ambient).toHaveCSS("pointer-events", "none");
    await expect(ambient).toHaveCSS("animation-name", "none");

    const header = page.getByRole("banner");
    const card = page.locator('[data-glass="card"]').first();
    expect(await header.evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur");
    expect(await card.evaluate((el) => getComputedStyle(el).backdropFilter)).toBe("none");
  });

  test("parallax chỉ thuộc Lesson Launch Board, không mở rộng sang control hoặc surface khác", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-magnetic], [data-tilt], [data-reveal-on-scroll]")).toHaveCount(0);
    await expect(page.locator("[data-lesson-launch-board]")).toHaveCount(1);
    await expect(page.locator("[data-lesson-launch-board] [data-glass]")).toHaveCount(0);
    await expect(page.locator("[data-lesson-launch-board] [aria-hidden='true'][inert]")).toHaveCount(2);
    expect(await page.evaluate(() => document.getAnimations().some((item) => item.effect?.getComputedTiming().iterations === Infinity))).toBe(false);
  });

  test("Lesson Launch Board đổi tab bằng bàn phím và reset inertia khi rời stage", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator("[data-lesson-launch-board]");
    const compose = page.getByRole("tab", { name: "Chuẩn bị" });
    const play = page.getByRole("tab", { name: "Mở lớp" });

    await compose.focus();
    await page.keyboard.press("ArrowRight");
    await expect(play).toBeFocused();
    await expect(play).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("4286")).toBeVisible();

    await page.keyboard.press("Home");
    await expect(compose).toHaveAttribute("aria-selected", "true");
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    // Giữ toạ độ nằm trong hit area; mép phải/dưới có thể thuộc pixel bên ngoài.
    await page.mouse.move(box!.x + box!.width - 4, box!.y + box!.height - 4);
    await expect.poll(() => stage.locator("section").evaluate((el) => el.style.getPropertyValue("--pointer-x"))).not.toBe("0.000");
    await page.mouse.move(1, 1);
    await expect.poll(() => stage.locator("section").evaluate((el) => el.style.getPropertyValue("--pointer-x"))).toBe("0.000");
    await expect.poll(() => stage.locator("section").evaluate((el) => el.style.getPropertyValue("--pointer-y"))).toBe("0.000");
  });

  test("Lesson Launch Board chỉ thay state cục bộ, không phát sinh yêu cầu ghi quiz", async ({ page }) => {
    const writeRequests: string[] = [];
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writeRequests.push(request.url());
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Đọc lớp" }).click();
    await page.getByRole("tab", { name: "Chuẩn bị" }).click();
    expect(writeRequests).toEqual([]);
  });

  test("Lesson Launch Board tái cấu trúc ở 320px và tablet, không cuộn ngang", async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 768, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }

    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await expect(page.locator("[data-lesson-launch-board] > [aria-hidden='true']").first()).toBeHidden();
    await expect(page.locator("[data-lesson-launch-board] section")).toHaveCSS("transform", "none");
  });

  test("CTA phản hồi ngay khi nhấn rồi trở về trạng thái nghỉ", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Khám phá kho game" });
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    await cta.evaluate((el) => el.addEventListener("click", (event) => event.preventDefault(), { once: true }));
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    expect(await cta.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    const durations = await cta.evaluate((el) => getComputedStyle(el).transitionDuration.split(",").map(Number.parseFloat));
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.2);
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await expect(cta).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
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

test.describe("điện thoại 375px", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  for (const route of ["/", "/games", "/tools", "/tools/countdown", "/login"]) {
    test(`${route}: không tràn ngang`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }

  test("menu mở từ nút, đóng bằng Esc và trả focus đúng chỗ", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    const menu = page.locator("#site-menu");
    await expect(menu).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((el) => getComputedStyle(el).transformOrigin)).toMatch(/px 0px$/);

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
  });
});

test.describe("giảm chuyển động", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

  test("rút animation và transition về gần như tức thời", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Khám phá kho game" });
    const durations = await cta.evaluate((el) =>
      getComputedStyle(el)
        .transitionDuration.split(",")
        .map((value) => Number.parseFloat(value)),
    );
    expect(Math.max(...durations)).toBeLessThan(0.001);
    expect(await page.evaluate(() => document.getAnimations().filter((item) => item.playState === "running").length)).toBe(0);
    const stage = page.locator("[data-lesson-launch-board] section");
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width, box!.y + box!.height);
    await expect(stage).toHaveCSS("--pointer-x", "0.000");
  });
});
