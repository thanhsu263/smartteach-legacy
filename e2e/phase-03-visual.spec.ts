import { expect, test } from "@playwright/test";
import { cleanupLive, fourKinds, newQuiz, newTeacher, loginAs } from "./helpers/live";

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

test("Phase 03: host và học sinh giữ layout rõ, không lỗi console", async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const teacher = await newTeacher("phase-03-visual");
  await newQuiz(teacher, fourKinds, "Quiz kiểm tra trình chiếu");
  await loginAs(page, teacher, "/host");
  await expect(page.getByRole("heading", { name: "Chọn quiz để bắt đầu" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("host-picker-1280.png"), fullPage: true });

  await page.getByRole("button", { name: "Chơi ngay" }).click();
  await page.getByRole("button", { name: "Bắt đầu phiên" }).click();
  await expect(page.getByRole("heading", { name: /Phòng chờ/ })).toBeVisible();
  const pin = (await page.getByLabel(/^PIN:/).textContent())?.trim() ?? "";
  expect(pin).toMatch(/^\d{6}$/);
  await page.screenshot({ path: testInfo.outputPath("host-lobby-1280.png"), fullPage: true });

  const phone = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const phoneErrors: string[] = [];
  phone.on("console", (message) => {
    if (message.type() === "error") phoneErrors.push(message.text());
  });
  await phone.goto(`/play?pin=${pin}`);
  await expect(phone.getByRole("heading", { name: "Vào phòng chơi" })).toBeVisible();
  await phone.screenshot({ path: testInfo.outputPath("play-join-375.png"), fullPage: true });
  await phone.close();

  expect(errors).toEqual([]);
  expect(phoneErrors).toEqual([]);
});
