import { expect, test, type Page } from "@playwright/test";
import { games } from "../src/data/games";
import { tools } from "../src/data/tools";

const routes = [
  "/",
  "/games",
  ...games.map((game) => `/games/${game.id}`),
  "/tools",
  ...tools.map((tool) => tool.href),
  "/login",
  "/privacy",
];

/** Cấp của từng tiêu đề theo thứ tự xuất hiện trên trang. */
async function headingLevels(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
      Number(heading.tagName.slice(1)),
    ),
  );
}

test.describe("cấp tiêu đề", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const route of routes) {
    test(`${route} có đúng một h1 và không nhảy cấp`, async ({ page }) => {
      await page.goto(route);
      const levels = await headingLevels(page);
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(levels[0]).toBe(1);
      levels.forEach((level, index) => {
        if (index === 0) return;
        // Một tiêu đề chỉ được sâu hơn tiêu đề trước đó tối đa một cấp.
        expect(level, `${route}: h${level} sau h${levels[index - 1]} (vị trí ${index})`).toBeLessThanOrEqual(
          levels[index - 1] + 1,
        );
      });
    });
  }

  test("trang chủ: thẻ trong từng khu vực nằm dưới h2 của khu vực đó", async ({ page }) => {
    await page.goto("/");
    const levels = await headingLevels(page);
    // h1, h2 (công cụ), 4 x h3 (thẻ tiện ích), h2 (game nổi bật), h3 (thẻ game), h2 (tài khoản)
    expect(levels).toEqual([1, 2, 3, 3, 3, 3, 2, 3, 2]);
  });
});
