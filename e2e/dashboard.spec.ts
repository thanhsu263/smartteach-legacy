import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cleanupLive, fourKinds, loginAs, newQuiz, newTeacher, startSession } from "./helpers/live";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

async function expectNoOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: tràn ngang`).toBeLessThanOrEqual(0);
}

async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, `${label}: vi phạm WCAG`).toEqual([]);
}

test.describe("dashboard giáo viên", () => {
  test("tài khoản mới có điểm bắt đầu rõ ràng, dùng được trên điện thoại", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const teacher = await newTeacher("dashboard-empty-e2e");
    await loginAs(page, teacher, "/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bắt đầu với một lớp hoặc một quiz" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tạo lớp đầu tiên" })).toHaveAttribute("href", "/my-classes");
    await expect(page.getByRole("link", { name: "Tạo quiz đầu tiên" })).toHaveAttribute("href", "/my-quizzes");
    await expectNoOverflow(page, "dashboard tài khoản mới 375px");
    await expectNoAxeViolations(page, "dashboard tài khoản mới");
  });

  test("hiển thị dữ liệu gần đây thật và các đường dẫn tiếp tục công việc", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const teacher = await newTeacher("dashboard-data-e2e");
    const createdClass = await teacher.client.rpc("create_class_with_students", {
      class_name: "Lớp dashboard 6A",
      student_names: ["An", "Bình"],
    });
    expect(createdClass.error).toBeNull();

    const quizId = await newQuiz(teacher, fourKinds, "Quiz dashboard gần đây");
    const session = await startSession(teacher, quizId);
    await session.end();

    await loginAs(page, teacher, "/dashboard");

    await expect(page.getByRole("heading", { name: "Lớp gần đây" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Lớp dashboard 6A/ })).toHaveAttribute("href", /\/my-classes\//);
    await expect(page.getByRole("link", { name: /Quiz dashboard gần đây/ }).first()).toHaveAttribute("href", `/my-quizzes/${quizId}`);
    await expect(page.getByRole("heading", { name: "Phiên gần đây" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Quiz dashboard gần đây/ }).last()).toHaveAttribute("href", `/host/${session.id}/results`);
    await expect(page.getByRole("link", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-current", "page");
    await expectNoOverflow(page, "dashboard có dữ liệu 1280px");
    await expectNoAxeViolations(page, "dashboard có dữ liệu");
  });

  test("không tràn ngang trên tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const teacher = await newTeacher("dashboard-tablet-e2e");
    await loginAs(page, teacher, "/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();
    await expectNoOverflow(page, "dashboard tài khoản mới 768px");
    await expectNoAxeViolations(page, "dashboard tablet");
  });

  test("một khối chờ hoặc lỗi không thay trạng thái những khối khác", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const teacher = await newTeacher("dashboard-pending-e2e");
    const quizId = await newQuiz(teacher, fourKinds, "Quiz vẫn hiển thị");
    const release = Promise.withResolvers<void>();
    await page.route((url) => url.pathname.endsWith("/rest/v1/classes"), async (route) => {
      await release.promise;
      await route.fulfill({ status: 400, json: { message: "Lỗi dữ liệu trong kiểm thử", code: "P0001" } });
    });
    const classes = page.getByRole("region", { name: "Lớp gần đây" });
    const quiz = page.getByRole("link", { name: /Quiz vẫn hiển thị/ });
    try {
      await loginAs(page, teacher, "/dashboard");
      await expect(classes.getByRole("status")).toHaveText("Đang tải…");
      await expect(quiz).toHaveAttribute("href", `/my-quizzes/${quizId}`);
      await page.screenshot({ path: testInfo.outputPath("dashboard-pending-768.png"), animations: "disabled" });
    } finally {
      release.resolve();
    }
    await expect(classes.getByRole("alert")).toBeVisible();
    await expect(quiz).toBeVisible();
    await expectNoOverflow(page, "dashboard khối lớp gặp lỗi 768px");
  });

  test("drawer mobile đóng bằng Escape và trả focus về nút mở", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const teacher = await newTeacher("dashboard-drawer-e2e");
    await loginAs(page, teacher, "/dashboard");

    const menu = page.getByRole("button", { name: "Mở menu điều hướng" });
    await menu.click();
    await expect(page.locator("#teacher-navigation")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#teacher-navigation")).not.toBeVisible();
    await expect(menu).toBeFocused();
  });
});
