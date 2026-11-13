import { expect, test, type Page } from "@playwright/test";
import { loginNav, mainNav } from "../src/config/navigation";
import { siteConfig } from "../src/config/site";

const viewports = [
  { name: "điện thoại 320px", width: 320, height: 700 },
  { name: "điện thoại 375px", width: 375, height: 812 },
  { name: "máy tính bảng 768px", width: 768, height: 900 },
  { name: "máy tính 1280px", width: 1280, height: 800 },
] as const;

async function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

for (const viewport of viewports) {
  test.describe(`trang chủ ở ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("hiển thị thương hiệu từ cấu hình và không cuộn ngang", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(new RegExp(siteConfig.name));
      await expect(page.locator("header").first().getByRole("link", { name: siteConfig.name })).toBeVisible();
      await expect(page.locator("footer").getByText(siteConfig.name).first()).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    test("chữ tiếng Việt có dấu hiển thị bằng Be Vietnam Pro", async ({ page }) => {
      await page.goto("/");
      const family = await page
        .getByRole("heading", { level: 1 })
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(family.toLowerCase()).toContain("be vietnam pro");
      const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].some(
          (font) => font.family.toLowerCase().includes("be vietnam pro") && font.status === "loaded",
        );
      });
      expect(loaded).toBe(true);
    });
  });
}

test.describe("điều hướng", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("mọi liên kết header mở được và có tiêu đề h1", async ({ page }) => {
    for (const item of [...mainNav, loginNav]) {
      const response = await page.goto(item.href);
      expect(response?.status(), item.href).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("liên kết trang hiện tại có aria-current", async ({ page }) => {
    await page.goto(mainNav[0].href);
    await expect(
      page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: mainNav[0].label }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("liên kết bỏ qua tới nội dung là phần tử focus đầu tiên", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Bỏ qua tới nội dung" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });

  test("focus bàn phím luôn có viền nhìn thấy", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  });

  test("anchor đặt nội dung dưới header, giữ focus, mục hiện tại và history", async ({ page }) => {
    await page.goto("/#hoc-lieu");
    const header = page.locator("header").first();
    const nav = header.getByRole("navigation", { name: "Điều hướng landing" });
    const assertAnchor = async (id: string) => {
      const section = page.locator(`#${id}`);
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect.poll(async () => {
        const offset = (await section.boundingBox())!.y - (await header.boundingBox())!.height;
        return Math.abs(offset - 12);
      }).toBeLessThanOrEqual(2);
      await expect(nav.locator(`a[href="#${id}"]`)).toHaveAttribute("aria-current", "location");
    };
    await assertAnchor("hoc-lieu");
    for (const id of ["tinh-nang", "giao-vien", "cach-dung", "hoc-lieu"]) {
      await nav.locator(`a[href="#${id}"]`).press("Enter");
      await assertAnchor(id);
      await expect(page.locator(`#${id} h2`)).toBeFocused();
      await expect(nav.locator('[aria-current="location"]')).toHaveCount(1);
    }
    await page.goBack();
    await assertAnchor("cach-dung");
    await page.goForward();
    await assertAnchor("hoc-lieu");
    const historyLength = await page.evaluate(() => history.length);
    await page.locator("#giao-vien").evaluate((el) => el.scrollIntoView());
    await expect(nav.locator('a[href="#giao-vien"]')).toHaveAttribute("aria-current", "location");
    await expect(page).toHaveURL(/#hoc-lieu$/);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
  });
});

test.describe("canvas quiz trực tiếp", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("trang người chơi dành toàn bộ không gian cho phiên quiz", async ({ page }) => {
    await page.goto("/play");

    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});

test.describe("landing trên điện thoại", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("giữ CTA chính dễ chạm và ẩn navigation desktop", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Điều hướng landing" })).toBeHidden();
    const cta = page.getByRole("link", { name: /Tạo lớp học miễn phí/ });
    await expect(cta).toBeVisible();
    expect((await cta.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });

  test("Escape đóng disclosure và resize chuyển focus sang nav desktop", async ({ page }, testInfo) => {
    await page.goto("/");
    const menu = page.getByLabel("Menu", { exact: true });
    const mobile = page.getByRole("navigation", { name: "Điều hướng landing trên điện thoại" });
    await menu.press("Enter");
    const link = mobile.getByRole("link", { name: "Kho học liệu" });
    await link.focus();
    await page.screenshot({ path: testInfo.outputPath("landing-mobile-menu.png"), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(mobile).toBeHidden();
    await expect(menu).toBeFocused();
    await menu.press("Enter");
    await link.focus();
    await page.setViewportSize({ width: 1280, height: 800 });
    const desktop = page.getByRole("navigation", { name: "Điều hướng landing", exact: true });
    await expect(desktop.getByRole("link", { name: "Kho học liệu" })).toBeFocused();
    await expect(mobile).toBeHidden();
  });
});

for (const width of [375, 768]) {
  test(`landing ${width}px dùng được bằng tap và hero tĩnh`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 812 }, hasTouch: true, reducedMotion: "no-preference" });
    try {
      const page = await context.newPage();
      await page.goto("/");
      const video = page.locator("video");
      await expect(video).toBeVisible();
      await expect(video).not.toHaveAttribute("src");
      await expect(video).toHaveJSProperty("paused", true);
      const menu = page.getByLabel("Menu", { exact: true });
      expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await menu.tap();
      const mobile = page.getByRole("navigation", { name: "Điều hướng landing trên điện thoại" });
      await mobile.getByRole("link", { name: "Cách hoạt động" }).tap();
      await expect(page).toHaveURL(/#cach-dung$/);
      await expect(page.locator("#cach-dung h2")).toBeFocused();
      await expect(mobile).toBeHidden();
      expect((await page.locator("header").first().boundingBox())!.y).toBe(0);
    } finally {
      await context.close();
    }
  });
}

test("landing vẫn hiển thị hero và dùng được menu khi tắt JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("video[poster]")).toBeVisible();
    await expect(page.locator("video")).not.toHaveAttribute("src");
    await page.getByLabel("Menu", { exact: true }).click();
    await page.getByRole("navigation", { name: "Điều hướng landing trên điện thoại" }).getByRole("link", { name: "Kho học liệu" }).click();
    await expect(page).toHaveURL(/#hoc-lieu$/);
  } finally {
    await context.close();
  }
});
