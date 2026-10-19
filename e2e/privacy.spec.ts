import { expect, test } from "@playwright/test";
import { siteConfig } from "../src/config/site";

test.describe("trang Quyền riêng tư", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("mở được từ chân trang và từ trang đăng nhập", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Liên kết cuối trang" }).getByRole("link", { name: "Quyền riêng tư" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "Quyền riêng tư" })).toBeVisible();

    await page.goto("/login");
    await page.getByRole("link", { name: "Xem cách ứng dụng dùng dữ liệu" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });

  test("nói rõ dữ liệu lưu, nơi lưu, cookie, game bên khác và cách xoá", async ({ page }) => {
    await page.goto("/privacy");
    for (const heading of [
      "Học sinh và khách",
      "Giáo viên có tài khoản",
      "Tên học sinh",
      "Dữ liệu được lưu ở đâu",
      "Cookie và theo dõi",
      "Game do bên khác cung cấp",
      "Xoá dữ liệu",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByText("không lưu ngày sinh, ảnh, điểm số")).toBeVisible();
  });

  test("hiện biểu ngữ bản nháp cho tới khi chủ dự án duyệt, và email liên hệ đúng cấu hình", async ({ page }) => {
    await page.goto("/privacy");
    const banner = page.getByRole("note");
    if (siteConfig.privacyReviewed) {
      await expect(banner).toHaveCount(0);
    } else {
      await expect(banner).toContainText("Bản nháp");
    }
    if (siteConfig.contactEmail) {
      await expect(page.getByRole("link", { name: siteConfig.contactEmail })).toHaveAttribute(
        "href",
        `mailto:${siteConfig.contactEmail}`,
      );
    } else {
      await expect(page.getByText("chưa có chức năng tự xoá tài khoản")).toBeVisible();
    }
  });
});
