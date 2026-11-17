import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { games } from "../src/data/games";

// Cần stack Supabase cục bộ: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const game = games[0];

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  expect(summary, `${label}: vi phạm WCAG`).toEqual([]);
}

async function registerAndSeed(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await page.getByLabel("Email").fill(`a11y-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@example.test`);
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.getByLabel("Họ và tên").fill("Cô Lan E2E");
  await page.getByLabel("Số điện thoại").fill("0912 345 678");
  await page.getByRole("checkbox", { name: /Tôi đồng ý/ }).check();
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/my-classes");
  await expect(page).toHaveURL(/\/my-classes$/);

  await page.getByLabel("Tên lớp").filter({ visible: true }).fill("10A1");
  await page.getByLabel(/Danh sách học sinh/).filter({ visible: true }).fill("Minh Anh\nGia Huy\nThảo My");
  await page.getByRole("button", { name: "Tạo lớp" }).click();
  await expect(page.getByRole("link", { name: "10A1" })).toBeVisible();
}

for (const viewport of [
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA khi đã đăng nhập, ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("Lớp của tôi, chi tiết lớp, chọn lớp trong tiện ích và game yêu thích", async ({ page }) => {
      await registerAndSeed(page);

      // Lớp của tôi: có lớp, có xác nhận xoá, có game yêu thích.
      await page.goto(`/games/${game.id}`);
      await page.getByRole("button", { name: `Yêu thích ${game.title}` }).click();
      await expect(page.getByRole("button", { name: `Yêu thích ${game.title}` })).toHaveAttribute("aria-pressed", "true");
      await page.goto("/my-classes");
      await expect(page.getByRole("region", { name: "Game yêu thích" }).getByRole("link", { name: game.title })).toBeVisible();
      await expectNoViolations(page, "Lớp của tôi");

      await page.getByRole("button", { name: "Xoá lớp 10A1" }).click();
      await expect(page.getByRole("button", { name: "Giữ lại" })).toBeVisible();
      await expectNoViolations(page, "xác nhận xoá lớp");
      await page.getByRole("button", { name: "Giữ lại" }).click();

      // Chi tiết lớp: danh sách, sửa tên học sinh, đổi tên lớp.
      await page.getByRole("link", { name: "10A1" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "10A1" })).toBeVisible();
      await expectNoViolations(page, "chi tiết lớp");

      await page.getByRole("button", { name: "Sửa tên Gia Huy" }).click();
      await expectNoViolations(page, "sửa tên học sinh");
      await page.getByRole("button", { name: "Huỷ" }).click();

      await page.getByRole("button", { name: "Đổi tên lớp" }).click();
      await expectNoViolations(page, "đổi tên lớp");
      await page.getByRole("button", { name: "Huỷ" }).click();

      // Ô chọn lớp đã lưu trong tiện ích.
      await page.goto("/tools/draw");
      await page.getByLabel("Dùng lớp đã lưu").selectOption({ index: 1 });
      await expect(page.getByText(/Đã điền 3 học sinh/)).toBeVisible();
      await expectNoViolations(page, "chọn lớp trong bốc thăm");

      // Thanh điều hướng khi đã đăng nhập (trên điện thoại cần mở menu).
      await expect(page.getByRole("button", { name: "Tài khoản", exact: true })).toBeVisible();
      if (viewport.width < 720) await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
      await expect(page.getByRole("link", { name: "Góp ý", exact: true }).filter({ visible: true })).toBeVisible();
      await expectNoViolations(page, "điều hướng đã đăng nhập");
    });
  });
}
