import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { newTeacher, loginAs, cleanupLive } from "./helpers/live";
import { seedAdmin } from "../tests/db/admin-fixtures";
test.afterAll(cleanupLive);
const password = "Pilot-test-123!";
async function register(page: Page) {
  const email = `pilot-${crypto.randomUUID()}@example.test`;
  await page.goto("/login"); await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email); await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click(); await expect(page).toHaveURL(/\/dashboard$/); return email;
}
test("recovery error và form responsive", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 }); await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "Quên mật khẩu" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.goto("/auth/callback?code=bad&next=%2Freset-password");
  await expect(page.getByRole("link", { name: "Yêu cầu liên kết mới" })).toBeVisible();
});
test("đổi mật khẩu, gửi góp ý và giữ trạng thái sau reload", async ({ page }) => {
  const email = await register(page);
  await page.goto("/account/security");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill("Pilot-updated-123!");
  await page.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill("Pilot-updated-123!");
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã cập nhật" })).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất để đăng nhập lại" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(email); await page.getByLabel("Mật khẩu", { exact: true }).fill(password); await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
  await expect(page.getByRole("alert").filter({ hasText: "chưa đúng" })).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Pilot-updated-123!"); await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click(); await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/feedback"); await expect(page).toHaveTitle(/^Góp ý · /); await page.getByLabel("Nội dung", { exact: true }).filter({ visible: true }).fill("Góp ý thử nghiệm: cần hướng dẫn nhập tệp rõ hơn."); await page.getByRole("button", { name: "Gửi góp ý", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã gửi góp ý"); await page.reload(); await expect(page.getByText("Góp ý thử nghiệm: cần hướng dẫn nhập tệp rõ hơn.", { exact: true })).toBeVisible();
});
test("khôi phục nháp câu mới rồi dọn đúng khi lưu", async ({ page }) => {
  await register(page); await page.goto("/my-quizzes"); await page.getByLabel("Tên quiz").filter({ visible: true }).fill("Quiz nháp pilot"); await page.getByRole("button", { name: "Tạo quiz", exact: true }).click(); await expect(page).toHaveURL(/\/my-quizzes\/[a-f0-9-]+$/);
  await page.getByRole("button", { name: "Thêm: Trắc nghiệm một đáp án", exact: true }).click();
  await page.getByLabel("Câu hỏi", { exact: true }).fill("Thủ đô Việt Nam là gì?");
  await page.getByLabel("Lựa chọn A", { exact: true }).fill("Hà Nội"); await page.getByLabel("Lựa chọn B", { exact: true }).fill("Huế");
  await expect(page.getByText("Đã lưu nháp trên trình duyệt này.", { exact: true })).toBeVisible();
  page.once("dialog", d => d.accept()); await page.reload();
  await page.getByRole("button", { name: "Khôi phục nháp", exact: true }).click();
  await expect(page.getByLabel("Câu hỏi", { exact: true })).toHaveValue("Thủ đô Việt Nam là gì?"); await expect(page.getByLabel("Lựa chọn A", { exact: true })).toHaveValue("Hà Nội");
  await page.getByLabel("Lựa chọn C", { exact: true }).fill("Đà Nẵng"); await page.getByLabel("Lựa chọn D", { exact: true }).fill("Cần Thơ");
  await page.getByLabel("Lựa chọn A là đáp án đúng").check(); await page.getByRole("button", { name: "Thêm câu hỏi", exact: true }).click();
  await expect(page.getByText("Đã thêm câu hỏi.", { exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole("button", { name: "Khôi phục nháp", exact: true })).toHaveCount(0);
});
test("email recovery Mailpit thật, link chỉ dùng một lần", async ({ page, request }) => {
  const email = await register(page);
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/forgot-password"); await page.getByLabel("Email", { exact: true }).fill(email); await page.getByRole("button", { name: "Gửi liên kết khôi phục", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Nếu email này");
  let messageId = "";
  await expect.poll(async () => {
    const r = await request.get("http://127.0.0.1:54324/api/v1/messages");
    const listing = await r.json();
    const item = listing.messages.find((m: { ID: string; To: { Address: string }[] }) => m.To.some(t => t.Address === email));
    messageId = item?.ID ?? ""; return Boolean(messageId);
  }).toBe(true);
  const msg = await (await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`)).json();
  const html = String(msg.HTML);
  const href = /href="([^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&");
  expect(Boolean(href)).toBe(true);
  await page.goto(href!);
  await expect(page.getByRole("button", { name: "Đặt lại mật khẩu", exact: true })).toBeVisible();
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill("Recovered-pilot-123!"); await page.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill("Recovered-pilot-123!");
  await page.getByRole("button", { name: "Đặt lại mật khẩu", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Đã cập nhật" })).toBeVisible();
  await page.goto(href!); await expect(page.getByRole("link", { name: "Yêu cầu liên kết mới", exact: true })).toBeVisible();
});

test("giáo viên gửi góp ý, admin triage, giáo viên khác không đọc được", async ({ page, browser }) => {
  const a = await newTeacher("feedback-owner"), b = await newTeacher("feedback-other"), root = await newTeacher("feedback-root"); seedAdmin(root);
  const submitted = await a.client.rpc("submit_teacher_feedback", { p_request: crypto.randomUUID(), p_kind: "suggestion", p_body: "Góp ý riêng được chủ động gửi cho quản trị.", p_path: "/my-exams" }); expect(submitted.error).toBeNull();
  await loginAs(page, root, "/admin/feedback");
  const item = page.getByRole("listitem").filter({ hasText: "Góp ý riêng được chủ động gửi cho quản trị." });
  await item.getByRole("button", { name: "Đang xử lý", exact: true }).click(); await expect(item.getByRole("strong")).toContainText("Đang xử lý");
  await item.getByRole("button", { name: "Đã xử lý", exact: true }).click(); await expect(item.getByRole("strong")).toContainText("Đã xử lý");
  await page.getByLabel("Lọc trạng thái").selectOption("resolved"); await expect(item).toBeVisible();
  const context = await browser.newContext({ reducedMotion: "no-preference", viewport: { width: 768, height: 900 } }); const owner = await context.newPage();
  await loginAs(owner, a, "/feedback"); await expect(owner.getByRole("listitem").filter({ hasText: "Góp ý riêng được chủ động gửi" })).toContainText("Đã xử lý");
  for (const width of [375, 768, 1280]) {
    await owner.setViewportSize({ width, height: 900 });
    expect(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await owner.screenshot({ path: `artifacts/teacher-pilot/feedback-${width}.png`, fullPage: true });
  }
  expect((await new AxeBuilder({ page: owner }).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]); await context.close();
  const other = await browser.newContext(); const stranger = await other.newPage(); await loginAs(stranger, b, "/feedback"); await expect(stranger.getByText("Góp ý riêng được chủ động gửi cho quản trị.", { exact: true })).toHaveCount(0); await other.close();
});

test("worker nhập đề HTTP từ chối request thiếu bearer", async ({ request }) => {
  const response = await request.post("/api/internal/exams/jobs/run", { data: {} }); expect(response.status()).toBe(403);
  expect((await response.json()).error.code).toBe("forbidden");
});
