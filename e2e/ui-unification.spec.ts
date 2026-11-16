import { test, expect } from "@playwright/test";
import { cleanupLive, loginAs } from "./helpers/live";
import { captureUi, uiFixtures, uiViewports } from "./helpers/ui-unification";
import AxeBuilder from "@axe-core/playwright";
import { newQuiz, newTeacher } from "./helpers/live";

test.describe.configure({ mode: "serial" });
test.afterAll(cleanupLive);
test("toàn bộ route app có nội dung thật ở ba kích thước", async ({ browser }) => {
  test.setTimeout(360_000);
  const fixture = await uiFixtures();
  const teacherContext = await browser.newContext({ reducedMotion: "reduce" });
  const teacher = await teacherContext.newPage();
  await loginAs(teacher, fixture.teacher, "/dashboard");
  const teacherRoutes = ["/dashboard", "/my-classes", `/my-classes/${fixture.classId}`, "/my-quizzes", `/my-quizzes/${fixture.quiz}`, "/my-quizzes/import", "/my-exams", "/my-exams/new", `/my-exams/${fixture.exam}`, "/my-exams/import", "/assignments", "/assignments/new", `/assignments/${fixture.assignment}`, "/feedback", "/membership", "/account/security", "/library", `/library/${fixture.publication}`, `/shared/quiz/${fixture.shared}`, "/games", "/games/gargamel-bat-xi-trum", "/tools", "/tools/countdown", "/tools/draw", "/tools/groups", "/tools/whiteboard", "/host", `/host/${fixture.live.id}`, `/host/${fixture.ended.id}/results`, "/help/sources/00000000-0000-4000-8000-000000000000"];
  for (const [index, route] of teacherRoutes.entries()) {
    for (const viewport of uiViewports) {
      await teacher.setViewportSize(viewport);
      await teacher.goto(route);
      await captureUi(teacher, `teacher-${index}`, route);
    }
  }
  const adminContext = await browser.newContext({ reducedMotion: "reduce" });
  const admin = await adminContext.newPage();
  await loginAs(admin, fixture.administrator, "/admin");
  for (const suffix of ["", "/users", "/ai", "/audit", "/feedback", "/games", "/library", "/memberships", "/operations", "/rag/documents", "/settings"]) {
    for (const viewport of uiViewports) {
      await admin.setViewportSize(viewport); await admin.goto(`/admin${suffix}`);
      await captureUi(admin, `admin${suffix.replaceAll("/", "-")}`, `/admin${suffix}`);
    }
  }
  const guestContext = await browser.newContext({ reducedMotion: "reduce" });
  const guest = await guestContext.newPage();
  await guest.goto("/learn");
  await guest.getByLabel("Mã bài", { exact: true }).fill(fixture.code);
  await guest.getByLabel("Mã truy cập riêng", { exact: true }).fill(fixture.credential);
  await guest.getByRole("button", { name: "Vào làm bài", exact: true }).click();
  await expect(guest).toHaveURL(new RegExp(`/learn/${fixture.code}`));
  for (const route of ["/login", "/forgot-password", "/reset-password", "/account-disabled", "/privacy", "/learn", "/play", `/learn/${fixture.code}`, "/missing-ui-page"]) {
    for (const viewport of uiViewports) {
      await guest.setViewportSize(viewport); await guest.goto(route);
      await captureUi(guest, route.startsWith("/learn/") ? "learn-runner" : route.slice(1), route);
    }
  }
  await expect(teacher.getByRole("heading", { level: 1 })).toBeVisible();
  await teacherContext.close(); await adminContext.close(); await guestContext.close();
});

test("ba vùng quiz giữ nội dung và cài đặt khi resize hoặc đóng mở disclosure", async ({ page }) => {
  const teacher = await newTeacher("ui-editor");
  const quiz = await newQuiz(teacher);
  await loginAs(page, teacher, `/my-quizzes/${quiz}`);
  await page.getByRole("button", { name: /^Câu 1/ }).click();
  const prompt = page.getByLabel("Câu hỏi", { exact: true });
  await prompt.fill("Nội dung chưa lưu vẫn còn nguyên khi thay đổi bố cục");
  await page.getByLabel("Thời gian trả lời", { exact: true }).selectOption("30");
  for (const viewport of uiViewports) {
    await page.setViewportSize(viewport);
    await expect(prompt).toHaveValue("Nội dung chưa lưu vẫn còn nguyên khi thay đổi bố cục");
    await expect(page.getByLabel("Thời gian trả lời", { exact: true })).toHaveValue("30");
    if (viewport.width === 1280) {
      const content = (await prompt.boundingBox())!;
      const settings = (await page.getByLabel("Thời gian trả lời", { exact: true }).boundingBox())!;
      expect(settings.x).toBeGreaterThan(content.x + content.width);
    }
    await page.getByText("Cài đặt câu hỏi", { exact: true }).click();
    await page.getByText("Cài đặt câu hỏi", { exact: true }).click();
    await expect(prompt).toHaveValue("Nội dung chưa lưu vẫn còn nguyên khi thay đổi bố cục");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await captureUi(page, "quiz-editing", `/my-quizzes/${quiz}`);
  }
  await page.getByRole("button", { name: "Lưu câu hỏi", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Câu 1/ }).click();
  await expect(prompt).toHaveValue("Nội dung chưa lưu vẫn còn nguyên khi thay đổi bố cục");
  await expect(page.getByLabel("Thời gian trả lời", { exact: true })).toHaveValue("30");
});

test("các bố cục Figma được kiểm ở viewport desktop gốc", async ({ page }) => {
  test.setTimeout(60_000);
  const teacher = await newTeacher("ui-figma");
  for (const name of ["Lớp Toán 6A", "Lớp Tiếng Anh 7B", "Lớp Khoa học 8C"]) {
    expect((await teacher.client.rpc("create_class_with_students", { class_name: name, student_names: ["Học sinh minh họa"] })).error).toBeNull();
  }
  const quiz = await newQuiz(teacher);
  await loginAs(page, teacher, "/my-classes");
  for (const [route, key, height] of [["/my-classes", "figma-classes", 960], ["/my-quizzes", "figma-quizzes", 960], [`/my-quizzes/${quiz}`, "figma-editor", 1099], ["/my-quizzes/import", "figma-import", 1124], ["/tools", "figma-tools", 1040], ["/tools/countdown", "figma-countdown", 1040]] as const) {
    await page.setViewportSize({ width: 1440, height });
    await page.goto(route);
    if (key === "figma-editor") await page.getByRole("button", { name: /^Câu 1/ }).click();
    await captureUi(page, key, route);
  }
  await page.setViewportSize({ width: 375, height: 1646 });
  await page.goto("/tools");
  await captureUi(page, "figma-tools-mobile", "/tools");
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/login");
  await captureUi(page, "figma-login", "/login");
});
