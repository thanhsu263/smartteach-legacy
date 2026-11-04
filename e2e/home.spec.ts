import { expect, test, type Page } from "@playwright/test";
import { loginNav, mainNav } from "../src/config/navigation";
import { siteConfig } from "../src/config/site";

const viewports = [
  { name: "điện thoại 375px", width: 375, height: 812 },
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
      await expect(page.locator("header").getByText(siteConfig.name)).toBeVisible();
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

test.describe("menu trên điện thoại", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mở, đóng bằng nút và bằng Esc, và điều hướng khi chọn liên kết", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    const list = page.locator("#site-menu");

    await expect(list).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(list).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await list.getByRole("link", { name: mainNav[1].label }).click();
    await expect(page).toHaveURL(new RegExp(`${mainNav[1].href}$`));
    await expect(list).toBeHidden();
  });
});
