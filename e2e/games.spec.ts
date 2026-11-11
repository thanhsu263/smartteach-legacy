import { expect, test, type Page } from "@playwright/test";
import { games } from "../src/data/games";

const game = games[0];

async function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

for (const viewport of [
  { name: "điện thoại hẹp 320px", width: 320, height: 640 },
  { name: "điện thoại 375px", width: 375, height: 812 },
  { name: "máy tính bảng 768px", width: 768, height: 900 },
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "màn hình rộng 1440px", width: 1440, height: 900 },
] as const) {
  test.describe(`kho game ở ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("liệt kê game trong danh mục và không cuộn ngang", async ({ page }) => {
      await page.goto("/games");
      await expect(page.getByRole("heading", { level: 1, name: "Kho game" })).toBeVisible();
      await expect(page.getByRole("status")).toHaveText(`Có ${games.length} trò chơi`);
      await expect(page.getByRole("link", { name: game.title })).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    test("mở trang chơi nhúng game từ thẻ và không cuộn ngang", async ({ page }) => {
      await page.goto("/games");
      await page.getByRole("link", { name: game.title }).click();
      await expect(page).toHaveURL(new RegExp(`/games/${game.id}$`));
      await expect(page.getByRole("heading", { level: 1, name: game.title })).toBeVisible();
      const frame = page.locator("iframe");
      await expect(frame).toHaveAttribute("src", game.embedUrl);
      await expect(frame).toHaveAttribute("allow", /fullscreen/);
      await expect(frame).toBeVisible();
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  });
}

test.describe("bộ lọc kho game", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("game không giới hạn môn và lớp vẫn hiện khi lọc, tìm không dấu được", async ({ page }) => {
    await page.goto("/games");
    await page.getByLabel("Môn học").selectOption("toan");
    await page.getByLabel("Lớp", { exact: true }).selectOption("5");
    await expect(page.getByRole("link", { name: game.title })).toBeVisible();

    await page.getByRole("button", { name: "Xoá bộ lọc" }).click();
    await page.getByLabel("Tìm trò chơi").fill("xi trum");
    await expect(page.getByRole("link", { name: game.title })).toBeVisible();
  });

  test("không khớp thì hiện trạng thái trống và xoá bộ lọc đưa danh sách trở lại", async ({ page }) => {
    await page.goto("/games");
    await page.getByLabel("Tìm trò chơi").fill("không có trò nào như vậy");
    await expect(page.getByText("Không có trò chơi nào khớp")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Không có trò chơi nào");
    await expect(page.getByRole("link", { name: game.title })).toHaveCount(0);

    await page.getByRole("button", { name: "Xoá bộ lọc" }).last().click();
    await expect(page.getByRole("link", { name: game.title })).toBeVisible();
    await expect(page.getByLabel("Tìm trò chơi")).toHaveValue("");
  });
});

test.describe("trang chơi", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("luôn có đường dẫn mở tab mới, ghi nguồn và đường dẫn về kho game", async ({ page }) => {
    await page.goto(`/games/${game.id}`);
    const newTab = page.getByRole("link", { name: "Mở trong tab mới" });
    await expect(newTab).toHaveAttribute("href", game.embedUrl);
    await expect(newTab).toHaveAttribute("target", "_blank");
    await expect(newTab).toHaveAttribute("rel", /noopener/);
    if (game.credits) await expect(page.getByText(game.credits)).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Đường dẫn" }).getByRole("link", { name: "Kho game" }),
    ).toBeVisible();
  });

  test("hiện trạng thái đang tải rồi ẩn khi game tải xong", async ({ page }) => {
    // Chặn game thật để kiểm thử độc lập với mạng: trả về một trang tối giản.
    await page.route(game.embedUrl, (route) =>
      route.fulfill({ contentType: "text/html", body: "<!doctype html><title>ok</title><p>game</p>" }),
    );
    await page.goto(`/games/${game.id}`);
    await expect(page.getByText("Đang tải trò chơi…")).toBeHidden();
    await expect(page.locator("iframe").locator("..")).toHaveAttribute("aria-busy", "false");
    await expect(page.frameLocator("iframe").getByText("game")).toBeVisible();
  });

  test("game tải quá lâu thì gợi ý mở tab mới", async ({ page }) => {
    await page.clock.install();
    await page.route(game.embedUrl, () => {
      /* không trả lời: mô phỏng tải treo */
    });
    // Iframe treo thì sự kiện load của trang không bao giờ bắn, nên chỉ chờ tới khi có phản hồi đầu tiên.
    await page.goto(`/games/${game.id}`, { waitUntil: "commit" });
    await expect(page.getByText("Đang tải trò chơi…")).toBeVisible();
    // Iframe chỉ được dựng sau khi hydrate, lúc đó bộ đếm thời gian mới được đặt.
    await expect(page.locator("iframe")).toBeAttached();
    await expect(page.locator("iframe").locator("..")).toHaveAttribute("aria-busy", "true");
    await page.clock.fastForward(9000);
    await expect(page.getByText(/Tải lâu hơn dự kiến/)).toBeVisible();
  });

  test("id không có trong danh mục trả về 404", async ({ page }) => {
    const response = await page.goto("/games/khong-ton-tai");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Về trang chủ" })).toBeVisible();
  });

  test("trang chủ hiện game nổi bật và dẫn tới trang chơi trong tối đa 2 lần bấm", async ({ page }) => {
    await page.goto("/");
    const featured = games.filter((g) => g.featured)[0];
    await page.getByRole("link", { name: "Thử một trò chơi" }).click();
    await expect(page).toHaveURL(/\/games$/);
    await page.getByRole("link", { name: featured.title }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${featured.id}$`));
  });
});
