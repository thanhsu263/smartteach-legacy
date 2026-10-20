import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cleanupLive, loginAs, newTeacher, type Teacher } from "./helpers/live";
import { TEXT_SYNTAX_EXAMPLE } from "../src/lib/quiz/import/template";

// Cần stack Supabase cục bộ: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

const fixtures = join(__dirname, "../tests/fixtures");
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

async function openImport(page: Page, teacher: Teacher) {
  await loginAs(page, teacher);
  await page.getByRole("link", { name: "Nhập từ file" }).click();
  await expect(page).toHaveURL(/\/my-quizzes\/import$/);
  await expect(heading(page, "Nhập quiz từ tệp")).toBeVisible();
}

const quizCount = async (teacher: Teacher) => ((await teacher.client.from("quizzes").select("id")).data ?? []).length;

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations.map((v) => ({ rule: v.id, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })),
    `${label}: vi phạm WCAG`,
  ).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: tràn ngang`).toBeLessThanOrEqual(0);
}

const SAMPLE_PROMPTS = ["Thủ đô của Việt Nam là gì?", "Mặt Trời quay quanh Trái Đất.", "Những số nào là số chẵn?", "Con vật kêu meo meo là gì?"];

test.describe("nhập quiz từ tệp", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const [label, file] of [["CSV", "quiz-mau.csv"], ["Excel (.xlsx)", "quiz-mau.xlsx"]] as const) {
    test(`tệp mẫu ${label}: xem trước đủ 4 dạng câu, tạo quiz, mở ra chơi được ngay`, async ({ page }) => {
      const teacher = await newTeacher("import-file");
      await openImport(page, teacher);
      await page.getByLabel(/^Chọn tệp Excel/).setInputFiles(join(fixtures, file));

      await expect(page.getByRole("status").filter({ hasText: "4 câu đọc được · 0 lỗi · 0 cảnh báo." })).toBeVisible();
      const preview = page.getByRole("list", { name: "Xem trước các câu hỏi" });
      await expect(preview.getByRole("listitem").filter({ hasText: "Câu 1 ·" })).toContainText("Trắc nghiệm một đáp án");
      for (const prompt of SAMPLE_PROMPTS) await expect(preview.getByText(prompt)).toBeVisible();
      await expect(preview).toContainText("Đúng hoặc sai");
      await expect(preview).toContainText("Nhiều đáp án đúng");
      await expect(preview).toContainText("Đáp án chấp nhận: con mèo / mèo (không phân biệt dấu)");
      await expect(preview.getByText("Hà Nội")).toBeVisible();
      await expect(preview.getByText("(đáp án đúng)")).toHaveCount(4); // Hà Nội, Sai, 2 và 4
      // Tên quiz gợi ý từ tên tệp.
      await expect(page.getByRole("textbox", { name: "Tên quiz" })).toHaveValue("quiz mau");

      await page.getByRole("button", { name: "Tạo quiz (4 câu)" }).click();
      await expect(page).toHaveURL(/\/my-quizzes\/[0-9a-f-]{36}$/);
      for (const prompt of SAMPLE_PROMPTS) await expect(page.getByText(prompt).first()).toBeVisible();
      // Quiz sau nhập chơi được ngay: bảng bắt đầu phiên không báo lỗi chặn.
      await page.getByRole("button", { name: "Chơi ngay" }).click();
      await expect(page.getByRole("button", { name: "Bắt đầu phiên" })).toBeVisible();
      await expect(page.getByText("Quiz chưa chơi được.")).toHaveCount(0);
      expect(await quizCount(teacher)).toBe(1);
    });
  }

  test("dán văn bản theo cú pháp cho cùng bộ câu hỏi, dùng được chỉ bằng bàn phím", async ({ page }) => {
    const teacher = await newTeacher("import-text");
    await openImport(page, teacher);

    // Bàn phím: tab "Tải tệp" đang chọn, ArrowRight sang "Dán văn bản".
    await page.getByRole("tab", { name: "Tải tệp" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Dán văn bản" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Dán văn bản" })).toHaveAttribute("aria-selected", "true");

    await page.getByLabel("Dán nội dung câu hỏi").fill(TEXT_SYNTAX_EXAMPLE);
    await page.getByRole("button", { name: "Xem trước" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "4 câu đọc được · 0 lỗi · 0 cảnh báo." })).toBeVisible();
    const preview = page.getByRole("list", { name: "Xem trước các câu hỏi" });
    for (const prompt of SAMPLE_PROMPTS) await expect(preview.getByText(prompt)).toBeVisible();

    // Chưa có tên quiz thì chưa cho tạo.
    await expect(page.getByRole("button", { name: "Tạo quiz (4 câu)" })).toBeDisabled();
    await page.getByRole("textbox", { name: "Tên quiz" }).fill("Quiz dán văn bản");
    await expect(page.getByRole("button", { name: "Tạo quiz (4 câu)" })).toBeEnabled();
    await page.getByRole("button", { name: "Tạo quiz (4 câu)" }).click();
    await expect(page).toHaveURL(/\/my-quizzes\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Con vật kêu meo meo là gì?").first()).toBeVisible();
  });

  test("tệp có lỗi: báo đúng dòng, vẫn xem trước các câu đúng, không cho tạo và không tạo gì", async ({ page }) => {
    const teacher = await newTeacher("import-error");
    await openImport(page, teacher);
    const csv = ["Câu hỏi,Lựa chọn A,Lựa chọn B,Đáp án đúng", "Câu đúng,a,b,A", "Câu thiếu đáp án,a,b,", "Câu đúng nữa,a,b,B"].join("\n");
    await page.getByLabel(/^Chọn tệp Excel/).setInputFiles({ name: "co-loi.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });

    await expect(page.getByRole("status").filter({ hasText: "2 câu đọc được · 1 lỗi · 0 cảnh báo." })).toBeVisible();
    const issues = page.getByRole("list", { name: "Lỗi và cảnh báo" });
    await expect(issues).toContainText("Lỗi (dòng 3)");
    await expect(issues).toContainText("cần chọn đúng một đáp án đúng");
    await expect(page.getByRole("list", { name: "Xem trước các câu hỏi" }).locator("> li")).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Tạo quiz/ })).toBeDisabled();
    expect(await quizCount(teacher)).toBe(0);
  });

  test("tệp không đọc được hoặc không được nhận: báo rõ bước tiếp theo", async ({ page }) => {
    const teacher = await newTeacher("import-bad");
    await openImport(page, teacher);
    const input = page.getByLabel(/^Chọn tệp Excel/);
    const message = (text: string) => expect(page.getByRole("list", { name: "Lỗi và cảnh báo" })).toContainText(text);

    await input.setInputFiles({ name: "cu.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("x") });
    await message("tệp Excel cũ (.xls)");
    await input.setInputFiles({ name: "bai.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
    await message("Chỉ nhận tệp .csv hoặc .xlsx");
    await input.setInputFiles({ name: "hong.csv", mimeType: "text/csv", buffer: Buffer.from("Câu h�i,A\n", "utf8") });
    await message("CSV UTF-8");
    await input.setInputFiles({ name: "gia.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("không phải zip") });
    await message("Không đọc được tệp này như một tệp Excel");
    await input.setInputFiles({ name: "lon.csv", mimeType: "text/csv", buffer: Buffer.alloc(1_100_000, "a") });
    await message("quá lớn");
    await expect(page.getByRole("button", { name: /^Tạo quiz/ })).toBeDisabled();
    expect(await quizCount(teacher)).toBe(0);
  });

  test("đã đủ 50 quiz thì tạo bị từ chối với lời nhắn đúng và không có quiz thứ 51", async ({ page }) => {
    const teacher = await newTeacher("import-cap");
    for (let i = 0; i < 50; i += 1) {
      const inserted = await teacher.client.from("quizzes").insert({ title: `Quiz ${i + 1}` });
      expect(inserted.error).toBeNull();
    }
    await openImport(page, teacher);
    await page.getByLabel(/^Chọn tệp Excel/).setInputFiles(join(fixtures, "quiz-mau.csv"));
    await expect(page.getByRole("status").filter({ hasText: "4 câu đọc được" })).toBeVisible();
    await page.getByRole("button", { name: "Tạo quiz (4 câu)" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "50 quiz" })).toBeVisible();
    await expect(page).toHaveURL(/\/my-quizzes\/import$/);
    expect(await quizCount(teacher)).toBe(50);
  });

  test("tải tệp mẫu CSV: UTF-8 có BOM, dòng sep=, và đủ bốn dạng câu", async ({ page }) => {
    const teacher = await newTeacher("import-template");
    await openImport(page, teacher);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Tải tệp mẫu (CSV)" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("mau-quiz.csv");
    const path = await download.path();
    const bytes = readFileSync(path);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8
    const text = bytes.toString("utf8");
    expect(text.slice(1).startsWith("sep=,\r\n")).toBe(true);
    for (const prompt of SAMPLE_PROMPTS) expect(text).toContain(prompt);
  });

  test("nhập chỉ tạo quiz của đúng người gọi: giáo viên khác không thấy", async ({ page, browser }) => {
    const owner = await newTeacher("import-owner");
    const stranger = await newTeacher("import-stranger");
    await openImport(page, owner);
    await page.getByLabel(/^Chọn tệp Excel/).setInputFiles(join(fixtures, "quiz-mau.csv"));
    await page.getByRole("button", { name: "Tạo quiz (4 câu)" }).click();
    await expect(page).toHaveURL(/\/my-quizzes\/[0-9a-f-]{36}$/);
    const other = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await loginAs(other, stranger);
    await expect(other.getByText("quiz mau")).toHaveCount(0);
    expect(await quizCount(stranger)).toBe(0);
  });
});

for (const viewport of [
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA nhập quiz, ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("trang trống, xem trước hợp lệ, xem trước có lỗi, tab dán văn bản", async ({ page }) => {
      const teacher = await newTeacher("import-a11y");
      await loginAs(page, teacher);
      await audit(page, "trang Quiz của tôi có nút Nhập từ file");
      await page.getByRole("link", { name: "Nhập từ file" }).click();
      await expect(heading(page, "Nhập quiz từ tệp")).toBeVisible();
      await audit(page, "trang nhập trống");

      await page.getByLabel(/^Chọn tệp Excel/).setInputFiles(join(fixtures, "quiz-mau.csv"));
      await expect(page.getByRole("status").filter({ hasText: "4 câu đọc được" })).toBeVisible();
      await audit(page, "xem trước hợp lệ");

      const csv = ["Câu hỏi,Lựa chọn A,Lựa chọn B,Đáp án đúng", "Câu thiếu đáp án,a,b,"].join("\n");
      await page.getByLabel(/^Chọn tệp Excel/).setInputFiles({ name: "loi.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
      await expect(page.getByRole("list", { name: "Lỗi và cảnh báo" })).toBeVisible();
      await audit(page, "xem trước có lỗi");

      await page.getByRole("tab", { name: "Dán văn bản" }).click();
      await page.getByLabel("Dán nội dung câu hỏi").fill(TEXT_SYNTAX_EXAMPLE);
      await page.getByRole("button", { name: "Xem trước" }).click();
      await expect(page.getByRole("status").filter({ hasText: "4 câu đọc được" })).toBeVisible();
      await page.getByText("Xem cú pháp dán").click();
      await audit(page, "tab dán văn bản có xem trước và cú pháp");
    });
  });
}
