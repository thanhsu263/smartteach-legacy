import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { cleanupLive, loginAs, newTeacher } from "./helpers/live";
import { seedAdmin } from "../tests/db/admin-fixtures";

test.afterAll(cleanupLive);
test.describe.configure({ mode: "serial" });

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const routes = [
  ["/admin", "Tổng quan"],
  ["/admin/users", "Tài khoản"],
  ["/admin/memberships", "Thành viên/đơn"],
  ["/admin/feedback", "Góp ý"],
  ["/admin/library", "Duyệt học liệu"],
  ["/admin/games", "Danh mục game"],
  ["/admin/rag/documents", "Tài liệu RAG"],
  ["/admin/ai", "AI/API"],
  ["/admin/settings", "Cấu hình website"],
  ["/admin/operations", "Vận hành"],
  ["/admin/audit", "Nhật ký"],
] as const;

test("mọi route /admin/* nằm trong shell quản trị ở desktop", async ({ page }) => {
  test.setTimeout(120_000);
  const admin = await newTeacher("admin-shell");
  seedAdmin(admin);
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAs(page, admin, "/admin");
  const nav = page.locator("main #admin-sidebar").getByRole("navigation", { name: "Điều hướng quản trị" });
  for (const [path, label] of routes) {
    await page.goto(path);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    // Breadcrumb: mục hiện tại nằm trong <strong> của topbar.
    await expect(page.locator("main header[data-surface] > p strong")).toHaveText(label);
    await expect(page.locator("main h1").first()).toBeVisible();
    // Không còn SiteHeader/TeacherShell trong khu quản trị.
    await expect(page.locator("#teacher-sidebar")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }

  // Soft navigation qua sidebar giữ shell và cập nhật mục hiện tại.
  await nav.getByRole("link", { name: "Tài liệu RAG", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/rag\/documents$/);
  await expect(nav.getByRole("link", { name: "Tài liệu RAG", exact: true })).toHaveAttribute("aria-current", "page");

  // Thu gọn: nhãn vẫn có tên truy cập, mở lại trả về trạng thái cũ.
  const collapse = page.getByRole("button", { name: "Thu gọn menu" });
  await collapse.click();
  await expect(page.getByRole("button", { name: "Mở rộng menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("link", { name: "Tài khoản", exact: true })).toBeVisible();
  await expect.poll(async () => (await page.locator("main #admin-sidebar").boundingBox())?.width ?? 0).toBeLessThanOrEqual(80);
  await page.getByRole("button", { name: "Mở rộng menu" }).click();

  // Menu Tài khoản: mở/đóng bằng Escape, focus trả về nút.
  const account = page.getByRole("button", { name: "Tài khoản", exact: true });
  await account.click();
  await expect(account).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Về không gian dạy học" }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Thoát tài khoản" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toHaveAttribute("aria-expanded", "false");
  await expect(account).toBeFocused();

  expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);
});

for (const width of [375, 768]) {
  test(`shell quản trị ở ${width}px`, async ({ page }) => {
    const admin = await newTeacher(`admin-shell-${width}`);
    seedAdmin(admin);
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, admin, "/admin/users");
    await expect(page.locator("main h1").first()).toBeVisible();
    if (width >= 720) {
      // Tablet giữ nhãn, không có nút thu gọn.
      await expect(page.locator("main #admin-sidebar").getByRole("link", { name: "Tài khoản", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Thu gọn menu" })).toBeHidden();
    } else {
      await expect(page.locator("main #admin-sidebar")).toBeHidden();
      const open = page.getByRole("button", { name: "Mở menu quản trị" });
      await open.click();
      const drawer = page.getByRole("dialog", { name: "Điều hướng quản trị" });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("link", { name: "Tài khoản", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(open).toBeFocused();
      await open.click();
      await drawer.getByRole("link", { name: "Danh mục game", exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/games$/);
      await expect(drawer).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);
  });
}
