import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("landing theo Figma", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 800 } });

  test("dùng chrome riêng và giới hạn cảnh 3D vào hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Điều hướng landing" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" })).toHaveCount(0);
    await expect(page.locator("[data-parallax-stage], [data-magnetic], [data-tilt]")).toHaveCount(0);
    await expect(page.locator("section:has(h1) [data-hero-classroom] canvas")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(await page.evaluate(() => document.getAnimations().some((item) => item.effect?.getComputedTiming().iterations === Infinity))).toBe(false);
  });

  test("hero, học liệu, game và FAQ đều hiện nội dung thật", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section:has(h1) [data-hero-classroom]")).toBeVisible();
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

  test("cảnh lớp học tạm dừng theo nút, vùng nhìn và tùy chọn giảm chuyển động", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator("[data-hero-classroom]");
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    await page.evaluate(() => document.fonts.ready);
    const ctaResting = await cta.boundingBox();
    await expect(stage).toHaveAttribute("data-scene", "running");
    expect(await cta.boundingBox()).toEqual(ctaResting);

    await page.getByRole("button", { name: "Tạm dừng chuyển động lớp học" }).press("Enter");
    await expect(stage).toHaveAttribute("data-scene", "paused");
    const scrollPastHero = () => stage.evaluate((el) => {
      const bottom = el.getBoundingClientRect().bottom + scrollY;
      scrollTo({ top: bottom + 200, behavior: "instant" });
    });
    await scrollPastHero();
    await expect(stage).not.toBeInViewport();
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(stage).toBeInViewport({ ratio: 0.25 });
    await expect(stage).toHaveAttribute("data-scene", "paused");
    await page.getByRole("button", { name: "Bật chuyển động lớp học" }).press("Enter");
    await expect(stage).toHaveAttribute("data-scene", "running");

    await scrollPastHero();
    await expect(stage).not.toBeInViewport();
    await expect(stage).toHaveAttribute("data-scene", "paused");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(stage).toHaveAttribute("data-scene", "running");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(stage).toHaveAttribute("data-scene", "poster");
    await expect(stage.locator("canvas")).toBeHidden();
  });

  test("trình duyệt thiếu WebGL giữ ảnh lớp học, CTA và nút quiz", async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        value(this: HTMLCanvasElement, type: string, options?: unknown) {
          if (type.startsWith("webgl")) return null;
          return Reflect.apply(getContext, this, [type, options]);
        },
      });
    });
    const poster = page.waitForResponse((response) => response.url().endsWith("/hero/classroom-poster.webp"));
    await page.goto("/");
    expect((await poster).ok()).toBe(true);
    await expect(page.locator("[data-hero-classroom] canvas")).toBeHidden();
    await expect(page.getByRole("link", { name: /Tạo lớp học miễn phí/ })).toBeVisible();
    await page.getByRole("button", { name: "Thử một câu quiz" }).click();
    await expect(page.getByRole("dialog", { name: "Thử một câu quiz" })).toBeVisible();
  });

  test("vật thể nhận thao tác kéo và thẻ 3D mở câu hỏi mẫu", async ({ page }, testInfo) => {
    await page.goto("/");
    const stage = page.locator("[data-hero-classroom]");
    await expect(stage).toHaveAttribute("data-scene", "running");
    const canvas = stage.locator("canvas");
    const { x, y, width, height } = (await canvas.boundingBox())!;
    await page.mouse.move(x + width * 0.14, y + height * 0.14);
    await expect(canvas).toHaveCSS("cursor", "grab");
    await page.mouse.down();
    await expect(canvas).toHaveCSS("cursor", "grabbing");
    await page.mouse.move(x + width * 0.2, y + height * 0.26, { steps: 8 });
    await page.mouse.up();
    await page.mouse.click(x + width * 0.738, y + height * 0.46);
    const dialog = page.getByRole("dialog", { name: "Thử một câu quiz" });
    await expect(dialog).toBeVisible();
    await expect(stage).toHaveAttribute("data-scene", "paused");
    await dialog.getByRole("button", { name: "1/2" }).click();
    await expect(dialog.getByRole("status")).toContainText("Chưa đúng");
    await dialog.getByRole("button", { name: "5/6" }).press("Enter");
    await expect(dialog.getByRole("status")).toContainText("Chính xác");
    await page.screenshot({ path: testInfo.outputPath("hero-quiz.png") });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Thử một câu quiz" })).toBeFocused();
    await expect(stage).toHaveAttribute("data-scene", "running");
    await page.screenshot({ path: testInfo.outputPath("hero-classroom-desktop.png") });
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
      const demo = (await page.locator("[data-hero-classroom]").boundingBox())!;
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
    await expect(page.locator("[data-hero-classroom]")).toHaveAttribute("data-scene", "poster");
    await expect(page.locator("[data-hero-classroom] canvas")).toBeHidden();
    expect(await page.evaluate(() => document.getAnimations().filter((item) => item.playState === "running").length)).toBe(0);
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    const durations = await cta.evaluate((el) => getComputedStyle(el).transitionDuration.split(",").map(Number.parseFloat));
    expect(Math.max(...durations)).toBeLessThan(0.001);
    await page.mouse.wheel(0, 520);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    expect((await page.locator("header").first().boundingBox())!.y).toBe(0);
  });
});
