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
    expect(await page.evaluate(() => document.getAnimations().some((item) =>
      item.effect instanceof KeyframeEffect &&
      item.effect.getComputedTiming().iterations === Infinity &&
      !item.effect.target?.hasAttribute("data-gradient-text") &&
      !(item.effect.pseudoElement === "::before" && item.effect.target?.hasAttribute("data-button-rim"))
    ))).toBe(false);
  });

  test("hero, học liệu, game và FAQ đều hiện nội dung thật", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section:has(h1) [data-hero-classroom]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Một ý tưởng hay, ngàn cách bắt đầu." })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Cả lớp cùng bật mood/ })).toBeVisible();
    const resource = page.getByRole("heading", { name: "Chinh phục phân số" });
    await expect(resource.locator("[data-scroll-float] [aria-hidden='true'] > span > span").first()).toHaveCSS("font-size", "20px");
    const question = page.getByText("Tôi có thể dùng SmartTeach miễn phí không?");
    await expect(question).toBeVisible();
  });

  test("Rubber Segment co giãn, điều hướng bằng kéo và chuyển tức thì khi giảm chuyển động", async ({ page }) => {
    await page.goto("/#tinh-nang");
    const nav = page.getByRole("navigation", { name: "Điều hướng landing", exact: true });
    const features = nav.getByRole("link", { name: "Tính năng" });
    const library = nav.getByRole("link", { name: "Kho học liệu" });
    const howItWorks = nav.getByRole("link", { name: "Cách hoạt động" });
    const thumb = nav.locator("span[aria-hidden='true']");
    const thumbWidth = () => thumb.evaluate((element) => {
      const insets = getComputedStyle(element).clipPath.match(/^inset\(([^)]+)\)/)?.[1].split(" round ")[0];
      if (!insets) return 0;
      const [top, right = top, , left = right] = insets.split(" ").map(parseFloat);
      return element.getBoundingClientRect().width - left - right;
    });

    await expect(features).toHaveAttribute("aria-current", "location");
    const libraryWidth = (await library.boundingBox())!.width;
    await library.click();
    await expect.poll(thumbWidth, { intervals: [30, 30, 50] }).toBeGreaterThan(libraryWidth + 12);
    await expect(library).toHaveAttribute("aria-current", "location");
    await expect(library).toHaveCSS("text-decoration-line", "none");
    await expect.poll(thumbWidth).toBeCloseTo(libraryWidth, 0);

    const source = (await library.boundingBox())!;
    const target = (await howItWorks.boundingBox())!;
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page).toHaveURL("/");
    await expect(howItWorks).toHaveAttribute("aria-current", "location");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await features.focus();
    await features.press("ArrowRight");
    await expect(library).toBeFocused();
    await library.press("Enter");
    await expect(page.locator("#hoc-lieu h2")).toBeFocused();
    await expect.poll(thumbWidth).toBeCloseTo(libraryWidth, 0);
  });

  test("CountUp và ScrollFloat phát lại khi cuộn rồi đứng yên khi giảm chuyển động", async ({ page }) => {
    await page.goto("/");
    const trust = page.getByRole("region", { name: "Lợi ích nền tảng" });
    const count = trust.locator("b [aria-hidden='true']").filter({ hasText: "%" });
    const title = page.getByRole("heading", { name: "Mọi điều lớp học cần. Trong một nơi." });
    const word = title.locator("[data-scroll-float] [aria-hidden='true'] > span > span").first();
    const teacherTitle = page.getByRole("heading", { name: "Nắm nhịp cả lớp. Chạm tới từng em." });
    const teacherWord = teacherTitle.locator("[data-scroll-float] [aria-hidden='true'] > span > span").first();
    const scrollTo = (heading: typeof title, fraction: number) => heading.evaluate((element, fraction) => {
      const top = element.getBoundingClientRect().top + scrollY;
      window.scrollTo({ top: top - innerHeight * fraction, behavior: "instant" });
    }, fraction);
    await expect(word).toHaveCSS("opacity", "0");
    await expect(teacherWord).toHaveCSS("transform", /^matrix\(1, 0, 0, 1\.14,/);
    for (let pass = 0; pass < 2; pass++) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect(count).not.toBeInViewport();
      await scrollTo(count, 0.82);
      await expect.poll(() => count.textContent(), { intervals: [30, 50, 100] }).not.toBe("100%");
      await expect(count).toHaveText("100%");
    }
    await scrollTo(title, 0.98);
    await expect(word).toHaveCSS("opacity", "0");
    await scrollTo(title, 0.93);
    await expect(word).toHaveCSS("opacity", "1");
    await scrollTo(title, 0.75);
    await scrollTo(title, 0.90);
    await expect(word).toBeInViewport();
    await expect(word).toHaveCSS("opacity", "0");
    await scrollTo(title, 0.80);
    await expect(word).toHaveCSS("opacity", "1");

    await scrollTo(teacherTitle, 0.75);
    await expect(teacherWord).toHaveCSS("opacity", "1");
    await scrollTo(teacherTitle, -0.3);
    await scrollTo(teacherTitle, 0.4);
    await expect(teacherWord).toHaveCSS("opacity", "1");
    await scrollTo(teacherTitle, 0.90);
    await expect(teacherWord).toBeInViewport();
    await expect(teacherWord).toHaveCSS("opacity", "0");
    await scrollTo(teacherTitle, 0.80);
    await expect(teacherWord).toHaveCSS("opacity", "1");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(word).toHaveCSS("transform", "none");
    await expect(word).toHaveCSS("opacity", "1");
    await expect(teacherWord).toHaveCSS("transform", "none");
    await expect(teacherWord).toHaveCSS("opacity", "1");
    await expect(count).toHaveText("100%");
  });

  test("CTA dịch chuyển cả nút và sáng viền khi chuột đến gần, với bề mặt theo màu", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    const glass = page.getByRole("link", { name: "Khám phá bản demo" });
    const quiz = page.getByRole("button", { name: "Thử một câu quiz" });
    const badge = page.locator("p").filter({ hasText: "Một không gian. Muôn cách học hay." });
    const gradient = page.getByRole("heading", { level: 1 }).locator("[data-gradient-text='cobalt']");
    const navyGradient = page.getByRole("heading", { level: 1 }).locator("[data-gradient-text='navy']");
    await expect(gradient).toHaveText("Mở tri thức.");
    await expect(navyGradient).toHaveText("Bật hứng khởi.");
    await expect(navyGradient).toHaveCSS("background-image", /rgb\(20, 43, 80\)/);
    const initialPosition = await gradient.evaluate((element) => getComputedStyle(element).backgroundPosition);
    await expect.poll(() => gradient.evaluate((element) => getComputedStyle(element).backgroundPosition)).not.toBe(initialPosition);
    const rim = cta.locator("[data-button-rim]");
    const orbit = () => rim.evaluate((element) => getComputedStyle(element, "::before").rotate);
    const shine = () => rim.evaluate((element) => Number(getComputedStyle(element, "::after").opacity));
    await page.evaluate(() => document.fonts.ready);
    const bounds = (await cta.boundingBox())!;
    await expect(rim).toHaveCSS("display", "block");
    await expect.poll(orbit).not.toBe("none");
    const orbitStart = await orbit();
    await expect.poll(orbit).not.toBe(orbitStart);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 85);
    await expect(cta).toHaveAttribute("data-magnet-active", "");
    await expect.poll(shine).toBeGreaterThan(0.35);
    expect(await cta.boundingBox()).toEqual(bounds);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 12);
    await expect(cta).toHaveAttribute("data-magnet-active", "");
    expect(await cta.evaluate((element) => element.matches(":hover"))).toBe(false);
    await expect.poll(shine).toBeGreaterThan(0.5);
    await expect.poll(async () => (await cta.boundingBox())!.y).toBeLessThan(bounds.y - 2);
    expect(await cta.evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("linear-gradient");
    await expect(glass).toHaveCSS("backdrop-filter", "blur(8px)");
    await expect(glass).toHaveCSS("background-color", "rgba(255, 255, 255, 0.05)");
    const readSurface = (control: typeof glass) => control.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.color, style.backgroundColor, style.borderTopColor, style.borderRadius, style.boxShadow, style.transform];
    });
    expect(await readSurface(glass)).toEqual(await readSurface(quiz));
    await expect(glass.locator("[data-button-rim]")).toHaveCSS("display", "block");
    await expect(badge.locator("[data-button-rim]")).toHaveCSS("display", "block");
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 105);
    await expect(cta).not.toHaveAttribute("data-magnet-active");
    await expect.poll(shine).toBe(0);
    const resumedOrbit = await orbit();
    await expect.poll(orbit).not.toBe(resumedOrbit);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(cta).not.toHaveAttribute("data-magnet-active");
    await expect(cta).toHaveCSS("translate", "none");
    await expect(rim).toHaveCSS("display", "none");
    await expect(badge.locator("[data-button-rim]")).toHaveCSS("display", "none");
    await expect(gradient).toHaveCSS("background-image", /linear-gradient/);
    await expect(gradient).toHaveCSS("animation-name", "none");
    expect(await cta.boundingBox()).toEqual(bounds);

    await quiz.hover();
    await expect(quiz).toHaveCSS("background-color", "rgba(255, 255, 255, 0.1)");
    const quizHover = await readSurface(quiz);
    await glass.hover();
    await expect.poll(() => readSurface(glass)).toEqual(quizHover);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.mouse.down();
    await expect(glass).toHaveCSS("transform", "matrix(0.97, 0, 0, 0.97, 0, 0)");
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(glass).toBeFocused();
    await expect(glass).toHaveCSS("outline-style", "solid");
    await glass.press("Enter");
    await expect(page.locator("#tinh-nang h2")).toBeFocused();
    await expect(page).toHaveURL("/");
  });

  test("parallax bù 60% quãng cuộn và tắt hoàn toàn khi giảm chuyển động", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator("[data-hero-classroom]");
    const scenery = page.locator("[data-hero-scenery]");
    const heading = page.getByRole("heading", { level: 1 });
    await page.evaluate(() => document.fonts.ready);
    await expect(stage).toHaveAttribute("data-scene", "running");
    const sceneryStart = (await scenery.boundingBox())!.y;
    const headingStart = (await heading.boundingBox())!.y;

    const scrollBy = 300;
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), sceneryStart);
    await expect.poll(async () => (await scenery.boundingBox())!.y).toBeCloseTo(0, 0);
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), sceneryStart + scrollBy);
    await expect.poll(async () => (await scenery.boundingBox())!.y).toBeCloseTo(-scrollBy * 0.4, 0);
    expect((await heading.boundingBox())!.y - headingStart).toBeCloseTo(-sceneryStart - scrollBy, 0);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(scenery).toHaveCSS("transform", "none");
    await expect(stage).toHaveAttribute("data-scene", "paused");
    expect((await scenery.boundingBox())!.y).toBeCloseTo(-scrollBy, 0);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(async () => (await scenery.boundingBox())!.y).toBeCloseTo(sceneryStart);
  });

  test("con lăn hãm dần, còn giảm chuyển động hủy quán tính và cuộn trực tiếp", async ({ page }) => {
    await page.goto("/");
    const root = page.locator("html");
    await expect(root).toHaveClass(/\blenis\b/);
    await page.mouse.move(660, 520);
    await page.mouse.wheel(0, 400);
    await expect(root).toHaveClass(/\blenis-smooth\b/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(400);
    await expect(root).not.toHaveClass(/\blenis-smooth\b/);

    await page.mouse.wheel(0, 500);
    await expect(root).toHaveClass(/\blenis-smooth\b/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(root).not.toHaveClass(/\blenis\b/);
    await expect(root).toHaveCSS("scroll-behavior", "auto");
    const start = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(start + 200);
    await expect(page.locator("[data-hero-scenery]")).toHaveCSS("transform", "none");
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

  test("cảnh lớp học tự chạy và dừng theo vùng nhìn hoặc tùy chọn giảm chuyển động", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator("[data-hero-classroom]");
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    await page.evaluate(() => document.fonts.ready);
    const ctaResting = await cta.boundingBox();
    await expect(stage).toHaveAttribute("data-scene", "running");
    expect(await cta.boundingBox()).toEqual(ctaResting);

    await expect(stage.getByRole("button", { name: /chuyển động lớp học/ })).toHaveCount(0);
    const scrollPastHero = () => stage.evaluate((el) => {
      const bottom = el.getBoundingClientRect().bottom + scrollY;
      scrollTo({ top: bottom + 200, behavior: "instant" });
    });
    await scrollPastHero();
    await expect(stage).not.toBeInViewport();
    await expect(stage).toHaveAttribute("data-scene", "paused");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(stage).toHaveAttribute("data-scene", "running");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(stage).toHaveAttribute("data-scene", "paused");
    await expect(stage.locator("canvas")).toBeVisible();
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
    await expect(header).toHaveCSS("height", "56px");
    await expect(header).toHaveCSS("backdrop-filter", "blur(8px)");
    await expect(header).toHaveCSS("background-color", "rgba(255, 255, 255, 0.72)");
    await expect(header.locator("[data-button-rim]")).toHaveCSS("display", "none");
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
    await expect.poll(headerBottom).toBeGreaterThanOrEqual(55);
    await page.mouse.wheel(0, 120);
    await expect.poll(headerBottom).toBeLessThanOrEqual(1);
    await page.mouse.move(120, 4);
    await expect.poll(headerBottom).toBeGreaterThanOrEqual(55);
    await page.screenshot({ path: testInfo.outputPath("landing-header-visible.png") });
    await page.mouse.move(100, 430);
    await page.mouse.wheel(0, 180);
    await expect.poll(headerBottom).toBeLessThanOrEqual(1);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(header.getByRole("link", { name: "SmartTeach" })).toBeFocused();
    await expect.poll(headerBottom).toBeGreaterThanOrEqual(55);
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
      const stage = page.locator("[data-hero-classroom]");
      const demo = (await stage.boundingBox())!;
      const hero = (await page.locator("section:has(h1)").boundingBox())!;
      expect(demo.x).toBeGreaterThanOrEqual(0);
      expect(demo.x + demo.width).toBeLessThanOrEqual(viewport.width);
      expect(demo).toEqual(hero);
      expect(demo.y + demo.height).toBeGreaterThanOrEqual(viewport.height - 1);
      await expect(stage).toHaveAttribute("data-scene", "paused");
      await page.evaluate(() => document.fonts.ready);
      const heading = page.getByRole("heading", { level: 1 });
      const titleFit = await heading.evaluate((element) => {
        const lines = Array.from(element.querySelectorAll("span"), (line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return Array.from(range.getClientRects(), (rect) => rect.width);
        });
        return { lines, width: element.getBoundingClientRect().width };
      });
      expect(titleFit.lines.map((line) => line.length)).toEqual([1, 1]);
      expect(titleFit.lines[0][0] / titleFit.width).toBeGreaterThan(0.88);
      expect(titleFit.lines[0][0]).toBeLessThanOrEqual(titleFit.width);
      await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.width}.png`), animations: "disabled" });
    });
  }
});

test.describe("giảm chuyển động", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

  test("không giữ animation đang chạy", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero-classroom]")).toHaveAttribute("data-scene", "paused");
    await expect(page.locator("[data-hero-classroom] canvas")).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().filter((item) => item.playState === "running").length)).toBe(0);
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    const durations = await cta.evaluate((el) => getComputedStyle(el).transitionDuration.split(",").map(Number.parseFloat));
    expect(Math.max(...durations)).toBeLessThan(0.001);
    await page.mouse.wheel(0, 520);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    expect((await page.locator("header").first().boundingBox())!.y).toBe(0);
  });
});
