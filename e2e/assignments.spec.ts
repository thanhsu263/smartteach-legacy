import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { cleanupLive, loginAs, newQuiz, newTeacher } from "./helpers/live";

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

async function openStudentAssignment(browser: Browser, code: string, credential: string) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/learn");
  await page.getByLabel("Mã bài").fill(code);
  await page.getByLabel("Mã truy cập riêng").fill(credential);
  await page.getByRole("button", { name: "Vào làm bài" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bài assignment e2e" })).toBeVisible();
  return { context, page };
}

test.describe("giao bài không cần tài khoản", () => {
  test("giáo viên theo dõi được hai học sinh; học sinh lưu, làm lại và nộp bài", async ({ page, browser }) => {
    test.setTimeout(60_000);
    const teacher = await newTeacher("assignment-e2e");
    const createdClass = await teacher.client.rpc("create_class_with_students", {
      class_name: "Lớp assignment e2e",
      student_names: ["An", "Bình"],
    });
    expect(createdClass.error).toBeNull();
    const classId = createdClass.data as string;
    const students = await teacher.client.from("students").select("id, name").eq("class_id", classId).order("position");
    expect(students.error).toBeNull();
    const [an, binh] = students.data as { id: string; name: string }[];
    const quizId = await newQuiz(teacher, [{
      kind: "single",
      prompt: "Thủ đô của Việt Nam là gì?",
      options: [{ label: "Hà Nội", is_correct: true }, { label: "Huế" }],
    }], "Quiz assignment e2e");
    const created = await teacher.client.rpc("create_assignment", {
      p_class_id: classId,
      p_quiz_id: quizId,
      p_title: "Bài assignment e2e",
      p_description: "Kiểm thử luồng làm bài.",
      p_reveal_policy: "immediate",
    });
    expect(created.error).toBeNull();
    const assignmentId = created.data as string;
    expect((await teacher.client.rpc("publish_assignment", { p_assignment: assignmentId })).error).toBeNull();
    const detail = await teacher.client.rpc("assignment_detail", { p_assignment: assignmentId });
    expect(detail.error).toBeNull();
    const code = (detail.data as { public_code: string }).public_code;
    const anCredential = await teacher.client.rpc("issue_student_credential", { p_student: an.id });
    const binhCredential = await teacher.client.rpc("issue_student_credential", { p_student: binh.id });
    expect(anCredential.error).toBeNull();
    expect(binhCredential.error).toBeNull();

    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, teacher, `/assignments/${assignmentId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Bài assignment e2e" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phân tích theo câu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Đóng bài" })).toBeVisible();
    await expectNoOverflow(page, "assignment teacher 1280px");
    await expectNoAxeViolations(page, "assignment teacher");

    const firstStudent = await openStudentAssignment(browser, code, (anCredential.data as { credential: string }).credential);
    await firstStudent.page.getByRole("button", { name: "A Hà Nội" }).click();
    await expect(firstStudent.page.getByRole("status")).toContainText("Đã lưu câu trả lời.");
    await firstStudent.page.reload();
    await expect(firstStudent.page.getByText("1/1", { exact: true })).toBeVisible();
    await firstStudent.page.getByRole("button", { name: "Xem lại và nộp bài" }).click();
    await expect(firstStudent.page.getByRole("dialog")).toBeVisible();
    await firstStudent.page.getByRole("button", { name: "Nộp bài", exact: true }).click();
    await expect(firstStudent.page.getByRole("heading", { level: 1, name: "Đã nộp bài" })).toBeVisible();
    await expect(firstStudent.page.getByText("Kết quả của bạn:")).toBeVisible();
    await expectNoOverflow(firstStudent.page, "assignment student 375px");
    await expectNoAxeViolations(firstStudent.page, "assignment student");

    const secondStudent = await openStudentAssignment(browser, code, (binhCredential.data as { credential: string }).credential);
    await expect(secondStudent.page.getByText("0/1", { exact: true })).toBeVisible();
    await expect(secondStudent.page.getByText(an.name, { exact: true })).toHaveCount(0);

    await page.reload();
    const progress = page.getByLabel("Tiến độ lớp");
    await expect(progress.getByText("1", { exact: true })).toHaveCount(2);
    await expect(progress.getByText("Đã nộp", { exact: true })).toBeVisible();
    await expect(page.getByText("An", { exact: true })).toBeVisible();
    const anRow = page.getByText("An", { exact: true }).locator("xpath=ancestor::li[1]");
    await anRow.getByRole("button", { name: "Xem chi tiết" }).click();
    await expect(page.getByRole("heading", { name: "Lượt làm của An" })).toBeVisible();
    await expect(page.getByText("Đúng", { exact: true })).toBeVisible();

    await Promise.all([firstStudent.context.close(), secondStudent.context.close()]);
  });
});
