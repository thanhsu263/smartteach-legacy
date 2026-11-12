import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("sidebar cuộn độc lập và đưa mục hiện tại vào vùng nhìn ở cửa sổ thấp", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/tools");
  const sidebar = page.getByRole("complementary", { name: "Thanh điều hướng giáo viên" });
  const nav = sidebar.getByRole("navigation");
  const active = nav.getByRole("link", { name: "Tiện ích" });
  const scrollPosition = () => nav.evaluate((el) => el.scrollTop);
  await expect(active).toHaveAttribute("aria-current", "page");
  await expect.poll(scrollPosition).toBeGreaterThan(0);
  const isInsideNav = async () => {
    const bounds = (await nav.boundingBox())!;
    const item = (await active.boundingBox())!;
    return item.y >= bounds.y && item.y + item.height <= bounds.y + bounds.height;
  };
  await expect.poll(isInsideNav).toBe(true);
  const bodyY = await page.evaluate(() => scrollY);
  await nav.hover();
  await page.mouse.wheel(0, -600);
  await expect.poll(scrollPosition).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(bodyY);
  await nav.getByRole("link", { name: "Kho game" }).press("Tab");
  await expect(active).toBeFocused();
  await expect.poll(isInsideNav).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("sidebar-short-viewport.png") });
});

test.describe("sidebar desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "no-preference" });

  test("hover và focus mở tạm, nút ghim giữ mở và Escape đóng", async ({ page }, testInfo) => {
    await page.goto("/tools/countdown");
    const sidebar = page.getByRole("complementary", { name: "Thanh điều hướng giáo viên" });
    const link = sidebar.getByRole("link", { name: "Kho game" });
    const label = link.getByText("Kho game");
    const main = page.locator("main#main");
    await sidebar.getByRole("button", { name: "Thu gọn menu" }).click();
    await expect(label).toBeHidden();
    const mainRail = await main.boundingBox();
    await page.mouse.move(430, 250);
    await page.screenshot({ path: testInfo.outputPath("sidebar-rail.png") });
    await link.hover();
    await expect(label).toBeVisible();
    expect(await main.boundingBox()).toEqual(mainRail);
    await page.screenshot({ path: testInfo.outputPath("sidebar-peek.png"), animations: "disabled" });
    await page.mouse.move(430, 250);
    await expect(label).toBeHidden();

    await page.getByRole("link", { name: "Bỏ qua tới nội dung" }).focus();
    await page.keyboard.press("Tab");
    await expect(sidebar.getByRole("link", { name: "SmartTeach — Tổng quan" })).toBeFocused();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(label).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(link).toBeFocused();
    await expect(label).toBeHidden();
    const pin = sidebar.getByRole("button", { name: "Mở rộng menu" });
    await pin.press("Enter");
    await expect(sidebar.getByRole("button", { name: "Thu gọn menu" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(label).toBeVisible();
    expect((await main.boundingBox())!.x).toBeGreaterThan(mainRail!.x);
    await page.screenshot({ path: testInfo.outputPath("sidebar-pinned.png"), animations: "disabled" });
    await link.click();
    await expect(page).toHaveURL(/\/games$/);
  });
});

test("tablet hiện nhãn và điều hướng trực tiếp ở 720–959px", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/tools/countdown");
  await page.getByRole("button", { name: "Thu gọn menu" }).click();
  const sidebar = page.getByRole("complementary", { name: "Thanh điều hướng giáo viên" });
  const link = sidebar.getByRole("link", { name: "Kho game" });
  for (const width of [720, 768, 959]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(link.getByText("Kho game")).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Mở rộng menu" })).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect.poll(async () => {
      const timer = (await page.getByRole("timer").boundingBox())!;
      return timer.x + timer.width;
    }).toBeLessThanOrEqual(width);
    if (width === 768) {
      await page.screenshot({ path: testInfo.outputPath("sidebar-tablet-768.png") });
      expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 960, height: 900 });
  await expect(sidebar.getByRole("button", { name: "Mở rộng menu" })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await link.click();
  await expect(page).toHaveURL(/\/games$/);
});

test.describe("drawer giáo viên trên điện thoại", () => {
  test.use({ viewport: { width: 375, height: 500 }, hasTouch: true, reducedMotion: "no-preference" });

  test("tap, Escape, focus và resize vẫn dùng được với viewport thấp", async ({ page }, testInfo) => {
    await page.goto("/tools");
    const menu = page.getByRole("button", { name: "Mở menu điều hướng" });
    const dialog = page.getByRole("dialog", { name: "Điều hướng giáo viên" });
    await menu.tap();
    await expect(dialog.getByRole("button", { name: "Đóng menu" })).toBeFocused();
    await expect(dialog.getByRole("link", { name: "Tiện ích" })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath("sidebar-mobile-drawer.png"), animations: "disabled" });
    expect((await new AxeBuilder({ page }).withTags(wcagTags).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
    await menu.press("Enter");
    await page.setViewportSize({ width: 720, height: 800 });
    await expect(dialog).toBeHidden();
    const sidebar = page.getByRole("complementary", { name: "Thanh điều hướng giáo viên" });
    await expect(sidebar.getByRole("link", { name: "Tiện ích" })).toBeFocused();
    await page.setViewportSize({ width: 320, height: 500 });
    await menu.tap();
    await dialog.getByRole("link", { name: "Kho game" }).tap();
    await expect(page).toHaveURL(/\/games$/);
    await expect(dialog).toBeHidden();
  });
});
