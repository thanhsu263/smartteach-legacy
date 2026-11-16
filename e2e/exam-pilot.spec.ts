import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { cleanupLive, loginAs, newTeacher, grantPremiumForTest } from "./helpers/live";
import { rowsToExam } from "../src/lib/exams/import/rows";
import { EXAM_SAMPLE_ROWS } from "../src/lib/exams/import/template";
import { TEMPLATE_COLUMNS } from "../src/lib/exams/import/types";
import { readExamCsv } from "../src/lib/exams/import/csv";
test.afterAll(cleanupLive);
test("Free soạn đề, xem responsive, xuất DOCX/PDF có quyền", async ({ page }) => {
  test.setTimeout(60000);
  const teacher = await newTeacher("exam-ui-free"); await loginAs(page, teacher, "/my-exams/new");
  await page.getByLabel("Tên đề", { exact: true }).filter({ visible: true }).fill("Đề Toán thử nghiệm");
  await page.getByRole("button", { name: "Thêm phần", exact: true }).click(); await page.getByRole("button", { name: "Thêm câu vào Phần 1", exact: true }).click();
  await page.getByLabel("Câu hỏi", { exact: true }).fill("Số nào là số nguyên tố?");
  for (const [letter, value] of Object.entries({ A: "12", B: "17", C: "21", D: "27" })) await page.getByLabel(`Lựa chọn ${letter}`, { exact: true }).fill(value);
  await page.getByLabel("B là đáp án đúng", { exact: true }).check(); await page.getByLabel("Điểm câu hỏi", { exact: true }).fill("0.25");
  await page.getByRole("button", { name: "Lưu đề", exact: true }).click(); await expect(page).toHaveURL(/\/my-exams\/[a-f0-9-]{36}$/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.getByLabel("Tên đề", { exact: true }).filter({ visible: true })).toHaveValue("Đề Toán thử nghiệm");
  for(const width of [375,768,1280]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, items: Array.from(document.querySelectorAll("main *")).filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(e => ({ tag: e.tagName, class: e.className, text: e.textContent?.slice(0, 70), right: e.getBoundingClientRect().right })) }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/teacher-pilot/exam-editor-${width}.png`, fullPage: true });
  }
  for(const format of ["docx","pdf"]) {
    const r = await page.request.get(`/api/exams/${id}/export?format=${format}&audience=student&revision=1`);
    expect(r.status()).toBe(200); expect((await r.body()).length).toBeGreaterThan(100); expect(r.headers()["cache-control"]).toBe("no-store");
    await mkdir("artifacts/teacher-pilot", { recursive: true }); await writeFile(`artifacts/teacher-pilot/student-exam.${format}`, await r.body());
  }
  const ai = await page.request.post("/api/exam-imports", { headers: { Origin: new URL(page.url()).origin }, data: { requestId: crypto.randomUUID(), title: "Free không gọi AI", format: "csv", bytes: 20, consent: true } }); expect(ai.status()).toBe(402);
});
test("4 file mẫu qua API production → xem trước → nhập đề", async ({ page }) => {
  test.setTimeout(60000); const teacher = await newTeacher("exam-ui-import"); await loginAs(page, teacher, "/my-exams/import");
  for(const format of ["csv","xlsx","docx","pdf"]) {
    await page.goto("/my-exams/import"); await page.getByLabel("Chọn tệp đề", { exact: true }).filter({ visible: true }).setInputFiles(`public/templates/exams/mau-de.${format}`);
    await expect(page.getByRole("heading", { name: "Đã nhận 4 câu hỏi", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận nhập đề", exact: true }).click(); await expect(page).toHaveURL(/\/my-exams\/[a-f0-9-]{36}$/);
  }
});
test("Premium giao đề → học sinh làm/nộp → điểm và CSV có trọng số", async ({ page, browser }) => {
  test.setTimeout(60000); const teacher = await newTeacher("exam-ui-online"); await grantPremiumForTest(teacher);
  const form = rowsToExam([TEMPLATE_COLUMNS, ...EXAM_SAMPLE_ROWS]).form; form.title = "Đề kiểm tra E2E"; form.document.durationMinutes = 1;
  const saved = await teacher.client.rpc("save_exam", { p_exam: null, p_revision: null, p_request: crypto.randomUUID(), p_title: form.title, p_description: "", p_document: form.document }); expect(saved.error).toBeNull();
  const klass = await teacher.client.rpc("create_class_with_students", { class_name: "Lớp kiểm tra E2E", student_names: ["Học sinh thử"] }); expect(klass.error).toBeNull();
  const student = (await teacher.client.from("students").select("id").eq("class_id", klass.data)).data![0];
  const credential = (await teacher.client.rpc("issue_student_credential", { p_student: student.id })).data.credential;
  await loginAs(page, teacher, `/assignments/new?exam=${saved.data.id}`);
  await expect(page.getByRole("combobox", { name: /^Lớp/ })).toBeVisible();
  await page.getByRole("combobox", { name: /^Lớp/ }).selectOption(klass.data);
  await page.getByRole("radio", { name: "Ngay sau khi học sinh nộp" }).check();
  await page.getByRole("button", { name: "Lưu bản nháp để kiểm tra", exact: true }).click(); await expect(page).toHaveURL(/\/assignments\/[a-f0-9-]+\?review=1$/);
  const assignment = new URL(page.url()).pathname.split("/").pop()!;
  await page.getByRole("button", { name: "Phát hành bài", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  const detail = await teacher.client.rpc("assignment_detail", { p_assignment: assignment });
  const context = await browser.newContext({ viewport: { width: 375, height: 850 }, reducedMotion: "reduce" });
  const pupil = await context.newPage();
  await pupil.addInitScript(() => { const original = Date.now; Date.now = () => original() + 3600000; });
  await pupil.goto("/learn"); await pupil.getByLabel("Mã bài", { exact: true }).fill(detail.data.public_code); await pupil.getByLabel("Mã truy cập riêng", { exact: true }).fill(credential); await pupil.getByRole("button", { name: "Vào làm bài", exact: true }).click();
  await expect(pupil.getByLabel("Thời gian còn lại", { exact: true })).toContainText("Còn 0:");
  await pupil.getByRole("button", { name: /B.*17/ }).click(); await expect(pupil.getByRole("status")).toContainText("Đã lưu"); await pupil.getByRole("button", { name: "Câu tiếp", exact: true }).click();
  await pupil.getByRole("button", { name: /A.*Đúng/ }).click(); await expect(pupil.getByRole("status")).toContainText("Đã lưu"); await pupil.getByRole("button", { name: "Câu tiếp", exact: true }).click();
  for(const pattern of [/^A\s*2$/, /^C\s*4$/, /^E\s*6$/]) { const option = pupil.getByRole("group", { name: "Các đáp án" }).getByRole("button", { name: pattern }); await option.click(); await expect(option).toHaveAttribute("aria-pressed", "true"); }
  await pupil.getByRole("button", { name: "Câu tiếp", exact: true }).click(); await pupil.getByLabel("Câu trả lời của bạn", { exact: true }).fill("con meo");
  await pupil.getByRole("button", { name: "Xem lại và nộp bài", exact: true }).click(); await pupil.getByRole("dialog").getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(pupil.getByRole("heading", { name: "Đã nộp bài", exact: true })).toBeVisible(); await expect(pupil.getByText("6/6", { exact: false })).toBeVisible();
  await pupil.screenshot({ path: "artifacts/teacher-pilot/student-result.png", fullPage: true }); await context.close();
  await page.goto(`/assignments/${assignment}`); await expect(page.getByText(/6\/6 điểm/).first()).toBeVisible();
  const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "Xuất kết quả CSV", exact: true }).click(); const download = await downloadPromise;
  const csv = await readFile((await download.path())!, "utf8"); const rows = readExamCsv(csv);
  expect(rows[1][rows[0].indexOf("score_points")]).toBe("6"); expect(rows[1][rows[0].indexOf("correct")]).toBe("4"); expect(csv.includes(credential)).toBe(false);
});
