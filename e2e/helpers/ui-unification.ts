import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { grantPremiumForTest, localConfig, newQuiz, newTeacher, startSession } from "./live";
import { seedAdmin } from "../../tests/db/admin-fixtures";
import { rowsToExam } from "../../src/lib/exams/import/rows";
import { TEMPLATE_COLUMNS } from "../../src/lib/exams/import/types";
import { EXAM_SAMPLE_ROWS } from "../../src/lib/exams/import/template";

export const uiViewports = [{ width: 375, height: 812 }, { width: 768, height: 900 }, { width: 1280, height: 800 }];
export const capturePhase = process.env.UI_CAPTURE_PHASE === "baseline" ? "baseline" : "after";
export const evidenceRoot = `${process.env.UI_EVIDENCE_DIR ?? "artifacts/ui-unification"}/${capturePhase}`;

export async function uiFixtures() {
  const teacher = await newTeacher("ui-teacher");
  await grantPremiumForTest(teacher);
  const administrator = await newTeacher("ui-admin");
  seedAdmin(administrator);
  const klass = await teacher.client.rpc("create_class_with_students", { class_name: "Lớp Toán 6A — Học tập và sáng tạo", student_names: ["Nguyễn Minh An", "Trần Thanh Bình", "Lê Phương Chi"] });
  expect(klass.error).toBeNull();
  const quiz = await newQuiz(teacher, undefined, "Ôn tập kiến thức — Bốn dạng câu hỏi");
  const shared = await teacher.client.rpc("set_quiz_sharing", { p_quiz_id: quiz, p_enabled: true });
  expect(shared.error).toBeNull();
  const form = rowsToExam([TEMPLATE_COLUMNS, ...EXAM_SAMPLE_ROWS]).form;
  const exam = await teacher.client.rpc("save_exam", { p_exam: null, p_revision: null, p_request: crypto.randomUUID(), p_title: "Đề kiểm tra Toán 6", p_description: "Đề minh họa kiểm chứng bố cục", p_document: form.document });
  expect(exam.error).toBeNull();
  const assignment = await teacher.client.rpc("create_assignment", { p_class_id: klass.data, p_quiz_id: quiz, p_title: "Bài ôn tập Toán 6", p_description: "Bài làm kiểm thử bố cục", p_reveal_policy: "immediate" });
  expect(assignment.error).toBeNull();
  expect((await teacher.client.rpc("publish_assignment", { p_assignment: assignment.data })).error).toBeNull();
  const detail = await teacher.client.rpc("assignment_detail", { p_assignment: assignment.data });
  const students = await teacher.client.from("students").select("id").eq("class_id", klass.data).order("position");
  const credential = await teacher.client.rpc("issue_student_credential", { p_student: students.data![0].id });
  const publication = await teacher.client.rpc("submit_quiz_publication", { p_quiz_id: quiz, p_title: "Học liệu Toán 6", p_description: "Bộ câu hỏi minh họa cho giáo viên", p_subject: "toan", p_grades: ["6"] });
  expect(publication.error).toBeNull();
  const service = createClient(localConfig().url, localConfig().serviceRoleKey, { auth: { persistSession: false } });
  expect((await service.rpc("moderate_quiz_publication", { p_publication: publication.data, p_status: "approved", p_reason: null })).error).toBeNull();
  const ended = await startSession(teacher, quiz);
  await ended.end();
  const live = await startSession(teacher, quiz);
  return { teacher, administrator, classId: klass.data as string, quiz, shared: shared.data as string, exam: exam.data.id as string, assignment: assignment.data as string, code: detail.data.public_code as string, credential: credential.data.credential as string, publication: publication.data as string, live, ended };
}

export async function captureUi(page: Page, key: string, pattern: string) {
  if (["/dashboard", "/my-classes", "/my-quizzes", "/my-exams", "/assignments", "/feedback", "/membership", "/account/", "/library", "/games", "/tools", "/help/sources"].some(prefix => pattern.startsWith(prefix)) || pattern === "/host") {
    // AppHeader streams separately from main; an h1 alone is not a settled layout.
    if (page.viewportSize()!.width >= 720) await expect(page.locator("#teacher-sidebar")).toBeVisible();
    else await expect(page.getByRole("button", { name: "Mở menu điều hướng", exact: true })).toBeVisible();
  }
  if (pattern === "/") {
    await expect(page.locator('header').first().locator('a[href="/"]').first()).toBeVisible();
    await expect(page.locator("#teacher-sidebar")).toHaveCount(0);
  }
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  if (capturePhase === "after") await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: `${pattern}: settled layout overflow` }).toBeLessThanOrEqual(0);
  const metrics = await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>('main [data-glass="btn"]');
    const style = button ? getComputedStyle(button) : null;
    return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, material: style ? { background: style.background, radius: style.borderRadius, padding: style.padding, filter: style.backdropFilter } : null, overflow: Array.from(document.querySelectorAll("main *")).filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map(e => ({ tag: e.tagName, class: e.className, right: e.getBoundingClientRect().right })) };
  });
  if (capturePhase === "after") expect(metrics.scrollWidth, `${pattern} overflow: ${JSON.stringify(metrics.overflow)}`).toBeLessThanOrEqual(metrics.viewport);
  await mkdir(evidenceRoot, { recursive: true });
  const path = `${evidenceRoot}/${key}-${metrics.viewport}.png`;
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await writeFile(`${evidenceRoot}/${key}-${metrics.viewport}.json`, JSON.stringify({ route: pattern, state: "default", path, ...metrics }, null, 2));
}
