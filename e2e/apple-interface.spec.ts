import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("landing theo Figma", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 800 } });

  test("dùng chrome riêng và giới hạn video nền vào hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Điều hướng landing" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toHaveCount(0);
    await expect(page.locator("[data-parallax-stage], [data-magnetic], [data-tilt]")).toHaveCount(0);
    await expect(page.locator("section:has(h1) video")).toHaveCount(1);
    await expect(page.locator("video")).toHaveCount(1);
    expect(await page.evaluate(() => document.getAnimations().some((item) => item.effect?.getComputedTiming().iterations === Infinity))).toBe(false);
  });

  test("hero, học liệu, game và FAQ đều hiện nội dung thật", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section:has(h1) video")).toBeVisible();
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
    await page.evaluate(() => document.fonts.ready);
    const resting = await cta.boundingBox();
    const background = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    await cta.hover();
    await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(background);
    expect(await cta.boundingBox()).toEqual(resting);
    const { x, y, width, height } = resting!;
    await page.mouse.move(x + width / 2, y + height / 2);
    await page.mouse.down();
    await expect(cta).toBeFocused();
    expect(await cta.boundingBox()).toEqual(resting);
    await page.mouse.move(4, 100);
    await page.mouse.up();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    expect(parseFloat(await cta.evaluate((el) => getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await cta.press("Enter");
    await expect(page).toHaveURL(/\/(my-classes|login)(\?|$)/);
  });

  test("video hero phát lặp, hỗ trợ tạm dừng và dừng khi cuộn ra ngoài", async ({ page }) => {
    await page.goto("/");
    const video = page.locator("video");
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    await page.evaluate(() => document.fonts.ready);
    const ctaResting = await cta.boundingBox();
    await expect(video).toHaveJSProperty("loop", true);
    await expect(video).toHaveJSProperty("muted", true);
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);
    expect(await cta.boundingBox()).toEqual(ctaResting);

    await page.getByRole("button", { name: "Tạm dừng video nền" }).press("Enter");
    await expect(video).toHaveJSProperty("paused", true);
    const scrollPastHero = () => video.evaluate((el) => {
      const bottom = el.getBoundingClientRect().bottom + scrollY;
      scrollTo({ top: bottom + 200, behavior: "instant" });
    });
    await scrollPastHero();
    await expect(video).not.toBeInViewport();
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(video).toBeInViewport({ ratio: 0.25 });
    await expect(video).toHaveJSProperty("paused", true);
    await page.getByRole("button", { name: "Phát video nền" }).press("Enter");
    await expect(video).toHaveJSProperty("paused", false);

    await scrollPastHero();
    await expect(video).not.toBeInViewport();
    await expect(video).toHaveJSProperty("paused", true);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(video).toHaveJSProperty("paused", false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(video).not.toHaveAttribute("src");
    await expect(video).toHaveJSProperty("paused", true);
  });

  test("lỗi tải video giữ ảnh lớp học và CTA", async ({ page }) => {
    await page.route("**/hero/classroom-loop.mp4", (route) => route.abort());
    const poster = page.waitForResponse((response) => response.url().endsWith("/hero/classroom-poster.webp"));
    await page.goto("/");
    expect((await poster).ok()).toBe(true);
    await expect(page.locator("video")).toBeHidden();
    await expect(page.getByRole("link", { name: /Tạo lớp học miễn phí/ })).toBeVisible();
  });

  test("header ẩn khi cuộn xuống và hiện bằng cuộn lên, chuột hoặc bàn phím", async ({ page }, testInfo) => {
    await page.goto("/");
    const header = page.locator("header").first();
    const heading = page.getByRole("heading", { level: 1 });
    await page.evaluate(() => document.fonts.ready);
    const headingTop = (await heading.boundingBox())!.y;
    const headerBottom = async () => (await header.boundingBox())!.y + (await header.boundingBox())!.height;
    await page.mouse.move(100, 430);
    await page.mouse.wheel(0, 550);
    await expect.poll(headerBottom).toBeLessThanOrEqual(1);
    const documentTop = await heading.evaluate((element) => element.getBoundingClientRect().top + scrollY);
    expect(documentTop).toBeCloseTo(headingTop);
    await page.screenshot({ path: testInfo.outputPath("landing-header-hidden.png") });
    await page.mouse.wheel(0, -90);
    await expect.poll(headerBottom).toBeGreaterThan(70);
    await page.mouse.wheel(0, 120);
    await expect.poll(headerBottom).toBeLessThanOrEqual(1);
    await page.mouse.move(120, 4);
    await expect.poll(headerBottom).toBeGreaterThan(70);
    await page.screenshot({ path: testInfo.outputPath("landing-header-visible.png") });
    await page.mouse.move(100, 430);
    await page.mouse.wheel(0, 180);
    await expect.poll(headerBottom).toBeLessThanOrEqual(1);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(header.getByRole("link", { name: "SmartTeach" })).toBeFocused();
    await expect.poll(headerBottom).toBeGreaterThan(70);
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
  for (const viewport of [{ width: 320, height: 700 }, { width: 375, height: 812 }, { width: 768, height: 900 }, { width: 1280, height: 800 }]) {
    test(`${viewport.width}px không tràn ngang`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const demo = (await page.locator("video").boundingBox())!;
      expect(demo.x).toBeGreaterThanOrEqual(0);
      expect(demo.x + demo.width).toBeLessThanOrEqual(viewport.width);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.width}.png`), animations: "disabled" });
    });
  }
});

test.describe("giảm chuyển động", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

  test("không giữ animation đang chạy", async ({ page }) => {
    await page.goto("/");
    const video = page.locator("video");
    await expect(video).not.toHaveAttribute("src");
    await expect(video).toHaveJSProperty("paused", true);
    expect(await page.evaluate(() => document.getAnimations().filter((item) => item.playState === "running").length)).toBe(0);
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    const durations = await cta.evaluate((el) => getComputedStyle(el).transitionDuration.split(",").map(Number.parseFloat));
    expect(Math.max(...durations)).toBeLessThan(0.001);
    await page.mouse.wheel(0, 520);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    expect((await page.locator("header").first().boundingBox())!.y).toBe(0);
  });
});
