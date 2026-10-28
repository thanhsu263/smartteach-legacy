import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Lớp Liquid Glass: nền động, ánh sáng theo chuột, magnetic, ngăn kéo menu và giảm chuyển động.
 * Các test khác chạy với giảm chuyển động (xem playwright.config.ts); file này bật chuyển động thật để kiểm đường đó.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Chờ mọi animation hữu hạn (vào trang, stagger) chạy xong; animation vô hạn của nền động thì bỏ qua. */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
      .every((animation) => animation.playState === "finished"),
  );
}

function rootVar(page: Page, name: string) {
  return page.evaluate((prop) => document.documentElement.style.getPropertyValue(prop), name);
}

test.describe("với chuyển động bật", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 800 } });

  test("nền động có mặt, không chắn chuột và ẩn khỏi trình đọc màn hình", async ({ page }) => {
    await page.goto("/");
    const ambient = page.locator("body > div[aria-hidden='true']").first();
    await expect(ambient).toHaveCSS("position", "fixed");
    await expect(ambient).toHaveCSS("pointer-events", "none");
    await expect(ambient).toHaveCSS("z-index", "-1");
    // Ba đốm màu đang trôi.
    const animated = await ambient.evaluate(
      (el) => Array.from(el.children).filter((child) => getComputedStyle(child).animationName !== "none").length,
    );
    expect(animated).toBe(3);
  });

  test("con trỏ ghi --mx --my --spot-o và ánh sáng cục bộ lên phần tử data-glass", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Khám phá kho game" });
    await expect(cta).toHaveAttribute("data-glass", "btn");
    const box = (await cta.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height / 2);

    await expect.poll(() => rootVar(page, "--spot-o")).toBe("1");
    expect(await rootVar(page, "--mx")).toMatch(/^\d+(\.\d+)?px$/);
    await expect.poll(() => cta.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--gx"))).toMatch(/px$/);
  });

  test("nút chính nhích theo con trỏ (magnetic) rồi trở về khi chuột rời", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Khám phá kho game" });
    await settle(page);
    const box = (await cta.boundingBox())!;
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
    await expect.poll(() => cta.evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue("--tx")))).toBeGreaterThan(2);

    await page.mouse.move(5, 790);
    await expect.poll(() => cta.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--tx"))).toBe("0px");
  });

  test("lưới chấm và đốm sáng của nền tắt khi chuột rời cửa sổ", async ({ page }) => {
    await page.goto("/");
    await page.mouse.move(300, 300);
    await expect.poll(() => rootVar(page, "--spot-o")).toBe("1");
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerout", { relatedTarget: null })));
    await expect.poll(() => rootVar(page, "--spot-o")).toBe("0");
  });

  for (const route of ["/", "/games", "/tools"]) {
    test(`${route}: không vi phạm WCAG AA sau khi animation vào trang xong`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await settle(page);
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations.map((v) => ({ rule: v.id, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }))).toEqual([]);
    });
  }
});

test.describe("điện thoại 375px", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  for (const route of ["/", "/games", "/tools", "/tools/countdown", "/login"]) {
    test(`${route}: không tràn ngang khi bật chuyển động`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("ngăn kéo menu mở bằng chuyển động, đóng bằng Esc và trả focus về nút Menu", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    const drawer = page.locator("#site-menu");
    await expect(drawer).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Kho game" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(drawer).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("cảm ứng: không có đốm sáng theo con trỏ trên nền", async ({ page }) => {
    await page.goto("/");
    const hidden = await page.evaluate(() => {
      const dots = document.querySelector("body > div[aria-hidden='true'] > span:nth-child(4)");
      return dots ? getComputedStyle(dots).display : "missing";
    });
    expect(hidden).toBe("none");
  });
});

test.describe("giảm chuyển động", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

  test("tắt blob trôi, magnetic và transition", async ({ page }) => {
    await page.goto("/");
    const ambient = page.locator("body > div[aria-hidden='true']").first();
    const animated = await ambient.evaluate(
      (el) => Array.from(el.children).filter((child) => getComputedStyle(child).animationName !== "none").length,
    );
    expect(animated).toBe(0);

    const cta = page.getByRole("link", { name: "Khám phá kho game" });
    const box = (await cta.boundingBox())!;
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
    await page.waitForTimeout(150);
    expect(await cta.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--tx"))).toBe("");
    const duration = await cta.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(duration).toBeLessThan(0.001);
  });
});
