import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { cleanupLive, localConfig, loginAs, newQuiz, newTeacher } from "./helpers/live";

test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "Cần Supabase local");
test.afterAll(cleanupLive);

test("kho học liệu public preview và clone", async ({ page }) => {
  test.setTimeout(60_000);
  const teacher = await newTeacher("library-e2e");
  const quizId = await newQuiz(teacher, [{ kind: "single", prompt: "Câu thư viện", options: [{ label: "Đúng", is_correct: true }, { label: "Sai" }] }], "Quiz public");
  const publication = await teacher.client.rpc("submit_quiz_publication", { p_quiz_id: quizId, p_title: "Học liệu e2e", p_description: "Mô tả e2e", p_subject: "toan", p_grades: ["6"] });
  const admin = createClient(localConfig().url, localConfig().serviceRoleKey, { auth: { persistSession: false } });
  expect((await admin.rpc("moderate_quiz_publication", { p_publication: publication.data as string, p_status: "approved", p_reason: null })).error).toBeNull();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/library?subject=toan&grade=6");
  await expect(page.getByRole("link", { name: /Học liệu e2e/ })).toBeVisible();
  await expect(page).toHaveURL(/subject=toan/);
  const query = page.getByRole("searchbox", { name: "Tìm học liệu" });
  await query.fill("Học liệu e2e");
  await query.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("Học liệu e2e");
  await expect(query).toBeFocused();
  await page.getByRole("link", { name: /Học liệu e2e/ }).click();
  await expect(page.getByRole("heading", { name: "Học liệu e2e" })).toBeVisible();
  await expect(page.getByText("Câu thư viện")).toBeVisible();
  expect(await page.content()).not.toContain("is_correct");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await loginAs(page, teacher, `/library/${publication.data as string}`);
  await page.getByRole("button", { name: "Tạo bản sao vào quiz của tôi" }).click();
  await expect(page).toHaveURL(/\/my-quizzes\//);

  const source = await admin.from("quiz_publications").select("owner_id, quiz_id, quiz_snapshot").eq("id", publication.data as string).single();
  expect(source.error).toBeNull();
  if (!source.data) throw new Error("Không đọc được publication nguồn cho kiểm thử phân trang.");
  const extraPublications = Array.from({ length: 24 }, (_, index) => ({
    owner_id: source.data.owner_id,
    quiz_id: source.data.quiz_id,
    quiz_snapshot: source.data.quiz_snapshot,
    title: `Học liệu tải thêm ${index + 1}`,
    description: "Mô tả phân trang e2e",
    subject: "toan",
    grades: ["6"],
    status: "approved",
    submitted_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    published_at: new Date(Date.now() - (index + 1) * 1000).toISOString(),
  }));
  expect((await admin.from("quiz_publications").insert(extraPublications)).error).toBeNull();
  await page.goto("/library?subject=toan&grade=6");
  await expect(page.getByRole("button", { name: "Tải thêm" })).toBeVisible();
  await page.getByRole("button", { name: "Tải thêm" }).click();
  await expect(page.getByRole("link", { name: /Học liệu tải thêm 24/ })).toBeVisible();

  const quizForPublication = await newQuiz(teacher, [{ kind: "single", prompt: "Câu gửi duyệt", options: [{ label: "Đúng", is_correct: true }, { label: "Sai" }] }], "Quiz gửi duyệt e2e");
  await page.goto(`/my-quizzes/${quizForPublication}`);
  await page.getByLabel("Tiêu đề học liệu").fill("Học liệu thầy cô tự gửi");
  await page.getByLabel("Mô tả (không bắt buộc)").fill("Mô tả do thầy cô nhập trước khi gửi duyệt.");
  await page.getByRole("button", { name: "Xem lại trước khi gửi" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Học liệu thầy cô tự gửi");
  await expect(dialog).toContainText("Mô tả do thầy cô nhập trước khi gửi duyệt.");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const openDialog = page.getByRole("button", { name: "Xem lại trước khi gửi" });
  await expect(openDialog).toBeFocused();
  await openDialog.press("Enter");
  await dialog.getByRole("button", { name: "Gửi duyệt", exact: true }).click();
  await expect(page.getByText("Đã gửi duyệt.")).toBeVisible();
  const own = await teacher.client.rpc("own_quiz_publications", { p_quiz_id: quizForPublication });
  expect(own.error).toBeNull();
  expect(own.data).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Học liệu thầy cô tự gửi", description: "Mô tả do thầy cô nhập trước khi gửi duyệt.", status: "pending" })]));
});
