import { test, expect } from "@playwright/test";
import { cleanupLive, grantPremiumForTest, loginAs, newTeacher } from "./helpers/live";
test.afterAll(cleanupLive);
test.skip(process.env.SMARTTEACH_LIVE_AI_UI !== "1", "Opt-in: một request Gemini thật với dữ liệu tổng hợp, cần worker local đã cấu hình.");
test("AI upload riêng → đóng tab → mở lại → review → apply qua browser và worker HTTP thật", async ({ page, context, request }) => {
  test.setTimeout(90000);
  const secret = process.env.EXAM_IMPORT_WORKER_SECRET || process.env.RAG_WORKER_SECRET;
  expect(Boolean(secret)).toBe(true);
  const step = () => request.post("/api/internal/exams/jobs/run", { headers: { Authorization: `Bearer ${secret}` }, data: {} });
  expect((await step()).status()).toBe(200);
  const teacher = await newTeacher("ai-ui-pilot"); await grantPremiumForTest(teacher); await loginAs(page, teacher, "/my-exams/import");
  await page.getByLabel("Tệp cho AI", { exact: true }).setInputFiles({ name: "de-ai-ui.csv", mimeType: "text/csv", buffer: Buffer.from('"Câu 1 (1 điểm): Thủ đô của Việt Nam là gì? A. Hà Nội B. Huế. Đáp án câu 1: A (Hà Nội)."') });
  await page.getByRole("checkbox", { name: /^Tôi có quyền sử dụng tài liệu/ }).check();
  await page.getByRole("button", { name: "Bắt đầu nhập bằng AI", exact: true }).click();
  await expect(page.getByText(/de-ai-ui · Đang chờ xử lý/)).toBeVisible(); await page.close();
  const reopened = await context.newPage(); await reopened.goto("/my-exams/import");
  const browserErrors: string[] = []; reopened.on("pageerror", e => browserErrors.push(e.message));
  for (let i = 0; i < 3; i++) {
    const response = await step(); expect(response.status()).toBe(200);
    const state = await response.json();
    expect(["failed", "waiting_quota"]).not.toContain(state.state);
    if (state.state === "needs_review") break;
  }
  await reopened.getByRole("button", { name: "Kiểm tra và sửa bản nhập", exact: true }).click();
  await reopened.screenshot({ path: "artifacts/teacher-pilot/ai-review-open.png", fullPage: true });
  await expect(reopened.getByLabel("Câu hỏi", { exact: true }), JSON.stringify({ errors: browserErrors, content: (await reopened.locator("main").innerText()).slice(-3000) })).toHaveValue(/Thủ đô.*Việt Nam/);
  await expect(reopened.getByRole("button", { name: "Lưu bản nhập đã đối chiếu", exact: true })).toBeDisabled();
  await reopened.getByRole("checkbox", { name: /^Tôi đã đối chiếu toàn bộ nội dung/ }).check();
  await reopened.screenshot({ path: "artifacts/teacher-pilot/ai-review.png", fullPage: true });
  await reopened.getByRole("button", { name: "Lưu bản nhập đã đối chiếu", exact: true }).click();
  await expect(reopened).toHaveURL(/\/my-exams\/[a-f0-9-]{36}$/);
  await expect(reopened.getByLabel("Câu hỏi", { exact: true })).toHaveValue(/Thủ đô.*Việt Nam/);
  expect((await step()).status()).toBe(200);
  const listing = await reopened.request.get("/api/exam-imports");
  const jobs = (await listing.json()).items;
  expect(jobs).toHaveLength(1); expect(jobs[0]).toMatchObject({ status: "applied", preview: null });
});
