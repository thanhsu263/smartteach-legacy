import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cleanupLive, fourKinds, joinPlayer, loginAs, newQuiz, newTeacher, startSession } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** axe WCAG A/AA, không cuộn ngang, đúng một h1 và không nhảy cấp tiêu đề. */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  expect(summary, `${label}: vi phạm WCAG`).toEqual([]);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: tràn ngang`).toBeLessThanOrEqual(0);

  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("main h1, main h2, main h3, main h4")]
      .filter((heading) => heading.checkVisibility())
      .map((heading) => Number(heading.tagName.slice(1))),
  );
  expect(levels.filter((level) => level === 1), `${label}: số h1`).toHaveLength(1);
  expect(levels[0], `${label}: tiêu đề đầu tiên`).toBe(1);
  levels.forEach((level, index) => {
    if (index > 0) expect(level, `${label}: h${level} sau h${levels[index - 1]}`).toBeLessThanOrEqual(levels[index - 1] + 1);
  });
}

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

for (const viewport of [
  { name: "máy chiếu 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA màn hình giáo viên, ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("bảng bắt đầu phiên: quiz còn lỗi, sẵn sàng, đã có phiên đang chạy", async ({ page }) => {
      const teacher = await newTeacher("host-a11y");
      await newQuiz(teacher, [{ kind: "single", prompt: "Thiếu đáp án", options: [{ label: "A" }, { label: "B" }] }], "Quiz lỗi");
      await newQuiz(teacher, fourKinds, "Quiz tốt");
      await loginAs(page, teacher);
      await expect(page.getByRole("heading", { level: 1, name: "Quiz của tôi" })).toBeVisible();

      await page.getByRole("listitem").filter({ hasText: "Quiz lỗi" }).getByRole("button", { name: "Chơi ngay" }).click();
      await expect(page.getByText("Quiz chưa chơi được.")).toBeVisible();
      await audit(page, "quiz còn lỗi");
      await page.getByRole("listitem").filter({ hasText: "Quiz lỗi" }).getByRole("button", { name: "Đóng" }).click();

      const good = page.getByRole("listitem").filter({ hasText: "Quiz tốt" });
      await good.getByRole("button", { name: "Chơi ngay" }).click();
      await expect(page.getByRole("button", { name: "Bắt đầu phiên" })).toBeVisible();
      await audit(page, "sẵn sàng bắt đầu");
      await page.getByRole("button", { name: "Bắt đầu phiên" }).click();
      await expect(heading(page, /Phòng chờ/)).toBeVisible();

      await page.goto("/my-quizzes");
      await good.getByRole("button", { name: "Chơi ngay" }).click();
      await expect(page.getByRole("button", { name: "Tiếp tục phiên đang chạy" })).toBeVisible();
      await audit(page, "đã có phiên đang chạy");
      await page.getByRole("button", { name: "Kết thúc phiên cũ" }).click();
      await expect(page.getByRole("group", { name: "Xác nhận kết thúc phiên cũ" })).toBeVisible();
      await audit(page, "xác nhận kết thúc phiên cũ");
    });

    test("phòng chờ, câu hỏi, hiện đáp án, kết thúc, xác nhận và mất kết nối", async ({ page }) => {
      const teacher = await newTeacher("host-a11y2");
      const session = await startSession(teacher, await newQuiz(teacher));
      await loginAs(page, teacher);
      await page.goto(`/host/${session.id}`);
      await expect(heading(page, /Phòng chờ/)).toBeVisible();
      await audit(page, "phòng chờ trống");

      const a = await joinPlayer(session.pin, "Khánh");
      const b = await joinPlayer(session.pin, "Linh");
      await expect(page.getByRole("heading", { name: "Người chơi (2)" })).toBeVisible();
      await page.getByRole("button", { name: "Khoá phòng" }).click();
      await page.getByRole("button", { name: "Loại Linh khỏi phòng" }).click();
      await audit(page, "phòng chờ có người chơi, khoá phòng, xác nhận loại");
      await page.getByRole("button", { name: "Giữ" }).click();

      await page.getByRole("button", { name: "Bắt đầu" }).click();
      await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
      await a.answer(0);
      await audit(page, "đang hỏi");

      await page.getByRole("button", { name: "Hiện đáp án" }).click();
      await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();
      await audit(page, "hiện đáp án");

      await page.getByRole("button", { name: "Kết thúc phiên" }).click();
      await audit(page, "xác nhận kết thúc phiên");
      await page.getByRole("button", { name: "Giữ phiên" }).click();

      await page.route("**/rest/v1/rpc/host_state", (route) => route.abort("failed"));
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.getByText("Mất kết nối. Đang thử lại")).toBeVisible();
      await audit(page, "mất kết nối");
      await page.unroute("**/rest/v1/rpc/host_state");
      await page.waitForTimeout(600);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.getByText("Mất kết nối. Đang thử lại")).toHaveCount(0);

      await page.getByRole("button", { name: "Câu tiếp theo" }).click();
      await expect(heading(page, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
      await b.answer(1).catch(() => undefined); // Linh đã bị khoá cửa nhưng vẫn là người chơi: nộp cũng được
      await page.getByRole("button", { name: "Kết thúc phiên" }).click();
      await page.getByRole("group", { name: "Xác nhận kết thúc phiên" }).getByRole("button", { name: "Kết thúc phiên" }).click();
      await expect(heading(page, /Kết thúc/)).toBeVisible();
      await audit(page, "kết thúc, bục vinh danh");
    });

    test("không tìm thấy phiên", async ({ page }) => {
      const teacher = await newTeacher("host-a11y3");
      await loginAs(page, teacher);
      await page.goto("/host/khong-phai-uuid");
      await expect(heading(page, "Không tìm thấy phiên chơi này")).toBeVisible();
      await audit(page, "không tìm thấy");
    });
  });
}
