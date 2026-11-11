import { expect, test } from "@playwright/test";
import { cleanupLive, fourKinds, loginAs, newQuiz, newTeacher, startSession } from "./helpers/live";

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

test("Phase 04: dashboard có dữ liệu thật rõ ràng ở ba breakpoint", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const teacher = await newTeacher("phase-04-visual");
  const createdClass = await teacher.client.rpc("create_class_with_students", {
    class_name: "Lớp minh hoạ 7A",
    student_names: ["An", "Bình", "Chi"],
  });
  expect(createdClass.error).toBeNull();
  const quizId = await newQuiz(teacher, fourKinds, "Quiz minh hoạ dashboard");
  const session = await startSession(teacher, quizId);
  await session.end();

  await loginAs(page, teacher, "/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();

  for (const viewport of [
    { width: 1280, height: 800, name: "1280" },
    { width: 768, height: 900, name: "768" },
    { width: 375, height: 812, name: "375" },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: `test-results/phase-04-dashboard-${viewport.name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `dashboard ${viewport.name}px: tràn ngang`).toBeLessThanOrEqual(0);
  }

  expect(consoleErrors).toEqual([]);
});
