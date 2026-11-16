import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { games } from "../src/data/games";
import { tools } from "../src/data/tools";

/** Quy tắc WCAG 2.0/2.1 mức A và AA, theo yêu cầu trong PRODUCT.md. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page, label: string) {
  if (new URL(page.url()).pathname === "/") {
    // The heading is server rendered before AnimatedContent reveals CTA labels.
    // Audit the hydrated interface, and explicitly assert every CTA's name too.
    for (const link of await page.locator("main a:has([data-button-surface])").all()) {
      await expect(link).toHaveAccessibleName(/\S/);
    }
  }
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  expect(summary, `${label}: vi phạm WCAG`).toEqual([]);
}

/** Game thật là nội dung của bên khác nên thay bằng một trang tối giản khi rà soát giao diện của hub. */
async function stubGame(page: Page) {
  await page.route(games[0].embedUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><html lang='vi'><title>game</title><main>game</main></html>" }),
  );
}

const publicRoutes = [
  "/",
  "/games",
  `/games/${games[0].id}`,
  "/tools",
  ...tools.map((tool) => tool.href),
  "/login",
  "/privacy",
  "/duong-dan-khong-ton-tai",
];

for (const viewport of [
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA ở ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of publicRoutes) {
      test(`${route} không có vi phạm`, async ({ page }) => {
        await stubGame(page);
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoViolations(page, route);
      });
    }
  });
}

test.describe("WCAG AA ở các trạng thái tương tác", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("đăng nhập ở chế độ đăng ký", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expectNoViolations(page, "đăng ký");
  });

  test("khách bấm yêu thích: lời mời đăng nhập", async ({ page }) => {
    await page.goto("/games");
    await page.getByRole("button", { name: `Yêu thích ${games[0].title}` }).click();
    await expect(page.getByRole("status").filter({ hasText: "để lưu game yêu thích" })).toBeVisible();
    await expectNoViolations(page, "lời mời đăng nhập");
  });

  test("bộ lọc kho game không có kết quả", async ({ page }) => {
    await page.goto("/games");
    await page.getByLabel("Tìm trò chơi").fill("không có trò nào như vậy");
    await expect(page.getByText("Không có trò chơi nào khớp")).toBeVisible();
    await expectNoViolations(page, "không có kết quả");
  });

  test("đồng hồ: hết giờ và lỗi nhập thời gian", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-01-01T08:00:00") });
    await page.goto("/tools/countdown");
    await expect(page.getByRole("button", { name: "Toàn màn hình" })).toBeVisible();
    await page.clock.pauseAt(new Date("2026-01-01T08:00:10"));
    await page.getByLabel("Phút").fill("0");
    await page.getByLabel("Giây").fill("2");
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await page.clock.runFor(2500);
    await expect(page.getByRole("status")).toHaveText("Hết giờ!");
    // axe dùng bộ đếm giờ của trang, nên cho đồng hồ giả chạy lại trước khi quét.
    await page.clock.resume();
    await expectNoViolations(page, "hết giờ");

    await page.getByLabel("Giây").fill("0");
    await expect(page.locator("p[role='alert']")).toBeVisible();
    await expectNoViolations(page, "lỗi thời gian");
  });

  test("bốc thăm: có kết quả và đã bốc hết", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/tools/draw");
    await expect(page.getByRole("button", { name: "Toàn màn hình" })).toBeVisible();
    await page.getByLabel("Danh sách tên").fill("An\nBình");
    await page.getByRole("button", { name: "Bốc thăm" }).click();
    await page.getByRole("button", { name: "Bốc thăm" }).click();
    await expect(page.getByText("Đã bốc hết cả lớp")).toBeVisible();
    await expectNoViolations(page, "bốc thăm đã hết");
  });

  test("chia nhóm: có kết quả và có lỗi", async ({ page }) => {
    await page.goto("/tools/groups");
    await expect(page.getByRole("button", { name: "Toàn màn hình" })).toBeVisible();
    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.locator("p[role='alert']")).toBeVisible();
    await expectNoViolations(page, "chia nhóm lỗi");

    await page.getByLabel("Danh sách tên").fill("An\nBình\nChi\nDũng");
    await page.getByLabel("Số nhóm", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã chia 4 bạn" })).toBeVisible();
    await expectNoViolations(page, "chia nhóm có kết quả");
  });

  test("bảng trắng: nút công cụ và nét vẽ", async ({ page }) => {
    await page.goto("/tools/whiteboard");
    await expect(page.getByRole("button", { name: "Toàn màn hình" })).toBeVisible();
    await page.getByRole("button", { name: "Màu Đỏ" }).click();
    await page.getByRole("button", { name: "Tẩy" }).click();
    await expectNoViolations(page, "bảng trắng");
  });
});

test.describe("WCAG AA: menu trên điện thoại", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("menu đang mở", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Menu", { exact: true }).click();
    await expect(page.locator("#site-menu")).toBeVisible();
    await expectNoViolations(page, "menu mở");
  });
});
