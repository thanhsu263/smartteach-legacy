import { test, expect } from "@playwright/test";
import { newTeacher, loginAs, cleanupLive } from "./helpers/live";
test.afterAll(cleanupLive);
test("các trang biểu mẫu giữ hydration khi mở lại trực tiếp", async ({ page }) => {
  const teacher = await newTeacher("pilot-hydration"); await loginAs(page, teacher, "/my-quizzes");
  for (const path of ["/my-quizzes", "/my-exams/import", "/feedback", "/my-exams/new"]) {
    const errors: string[] = []; const capture = (e: Error) => errors.push(e.message); page.on("pageerror", capture);
    const consoleCapture = (m: { type: () => string; text: () => string }) => { if (m.type() === "error" && /hydration|hydrated|server rendered/i.test(m.text())) errors.push(m.text()); }; page.on("console", consoleCapture);
    await page.goto(path); await expect(page.locator("main h1").filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Tài khoản", exact: true }).waitFor();
    page.off("pageerror", capture); page.off("console", consoleCapture); expect(errors, path).toEqual([]);
  }
});
