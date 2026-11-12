import { expect, test } from "@playwright/test";
import { siteConfig } from "../src/config/site";

test.describe("trang Quyền riêng tư", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("mở được từ chân trang và từ trang đăng nhập", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Quyền riêng tư", exact: true }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "Quyền riêng tư" })).toBeVisible();

    await page.goto("/login");
    await page.getByRole("link", { name: "Xem cách ứng dụng dùng dữ liệu" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });

  test("có mục lục dẫn tới từng phần của chính sách", async ({ page }) => {
    await page.goto("/privacy");
    const toc = page.getByRole("navigation", { name: "Mục lục quyền riêng tư" });
    await expect(toc).toBeVisible();
    await expect(toc.getByRole("link")).toHaveCount(11);
    await expect(toc.getByRole("link", { name: "Quiz chơi trực tiếp" })).toHaveAttribute("href", "#quiz");
    await expect(toc.getByRole("link", { name: "Bài được giao" })).toHaveAttribute("href", "#assignment");
    await expect(toc.getByRole("link", { name: "Kho học liệu" })).toHaveAttribute("href", "#library");
    await expect(toc.getByRole("link", { name: "Xoá dữ liệu" })).toHaveAttribute("href", "#delete");
  });

  test("nói rõ dữ liệu lưu, nơi lưu, cookie, game bên khác và cách xoá", async ({ page }) => {
    await page.goto("/privacy");
    for (const heading of [
      "Học sinh và khách",
      "Giáo viên có tài khoản",
      "Tên học sinh",
      "Quiz chơi trực tiếp",
      "Bài được giao",
      "Kho học liệu",
      "Nhập quiz từ tệp",
      "Dữ liệu được lưu ở đâu",
      "Cookie và theo dõi",
      "Game do bên khác cung cấp",
      "Xoá dữ liệu",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByText("không lưu ngày sinh, ảnh hay thông tin nào khác")).toBeVisible();
  });

  test("mô tả đúng boundary, thời hạn và quyền riêng tư của bài được giao và kho học liệu", async ({ page }) => {
    await page.goto("/privacy");
    const assignment = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Bài được giao" }) });
    await expect(assignment).toContainText("không cần tài khoản");
    await expect(assignment).toContainText("mã truy cập riêng");
    await expect(assignment).toContainText("365 ngày");
    await expect(assignment).toContainText("học sinh không xem dữ liệu của bạn khác");
    const library = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Kho học liệu" }) });
    await expect(library).toContainText("đã duyệt");
    await expect(library).toContainText("không có đáp án đúng");
  });

  test("mục quiz chơi trực tiếp nêu đủ dữ liệu lưu, mục đích, ai xem, thời hạn 90 ngày và cách xoá", async ({ page }) => {
    await page.goto("/privacy");
    const quiz = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Quiz chơi trực tiếp" }) });
    await expect(quiz).toContainText("không cần tài khoản");
    for (const stored of ["Biệt danh", "câu trả lời", "điểm", "thời gian", "thứ hạng"]) {
      await expect(quiz).toContainText(stored);
    }
    await expect(quiz).toContainText("chỉ giáo viên chủ phiên");
    await expect(quiz).toContainText("giữ tối đa khoảng 90 ngày");
    await expect(quiz).toContainText("kể cả buổi của quiz đã xoá");
    await expect(quiz).toContainText("xoá ngay được từng buổi");
    await expect(quiz).toContainText("không ghi lại địa chỉ mạng");
    await expect(quiz).not.toContainText("băm có muối");
    // Các mục khác không còn khẳng định ứng dụng không lưu điểm số.
    await expect(page.getByText("không lưu ngày sinh, ảnh, điểm số")).toHaveCount(0);
    // Giáo viên được nêu là có lưu quiz và các buổi đã chơi; mục xoá nhắc cả buổi chơi.
    await expect(page.getByRole("heading", { level: 2, name: "Giáo viên có tài khoản" }).locator("..")).toContainText("các buổi đã chơi");
    await expect(page.getByRole("heading", { level: 2, name: "Xoá dữ liệu" }).locator("..")).toContainText("Các buổi đã chơi");
    await expect(page.getByRole("heading", { level: 2, name: "Xoá dữ liệu" }).locator("..")).toContainText("khoảng 90 ngày");
  });

  test("nêu rõ rương kho báu, mã QR và việc nhập tệp chỉ đọc trong trình duyệt", async ({ page }) => {
    await page.goto("/privacy");
    const quiz = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Quiz chơi trực tiếp" }) });
    await expect(quiz).toContainText("chế độ kho báu");
    await expect(quiz).toContainText("điểm trước và sau khi mở");
    await expect(quiz).toContainText("được giữ và xoá cùng buổi chơi, kể cả khi thầy cô xoá buổi đó");
    await expect(quiz).toContainText("chỉ chứa địa chỉ vào phòng kèm mã PIN, không chứa thông tin cá nhân");
    const imported = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Nhập quiz từ tệp" }) });
    await expect(imported).toContainText("hoàn toàn trong trình duyệt");
    await expect(imported).toContainText("tệp không được tải lên máy chủ");
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
