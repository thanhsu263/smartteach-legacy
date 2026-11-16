import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readExamCsv } from "../src/lib/exams/import/csv";
import { cleanupLive, fourKinds, joinPlayer, loginAs, newQuiz, newTeacher, startSession, type Teacher } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

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
  levels.forEach((level, index) => {
    if (index > 0) expect(level, `${label}: h${level} sau h${levels[index - 1]}`).toBeLessThanOrEqual(levels[index - 1] + 1);
  });
}

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

/** Chơi trọn một phiên bằng các hàm điều khiển: Lan 3000 điểm, Huy 2000 điểm (không tính điểm tốc độ). */
async function playFullSession(teacher: Teacher, title: string) {
  const quizId = await newQuiz(teacher, fourKinds, title);
  const session = await startSession(teacher, quizId, false);
  const lan = await joinPlayer(session.pin, "Lan");
  const huy = await joinPlayer(session.pin, "Huy");
  const plan: [unknown, unknown][] = [
    [0, 1],
    [1, 1],
    [[0], [2, 0]],
    ["Mèo", "chó"],
  ];
  for (let q = 0; q < plan.length; q += 1) {
    if (q === 0) await session.open();
    else await session.next();
    await lan.answer(plan[q][0]);
    await huy.answer(plan[q][1]);
    await session.close();
  }
  await session.next();
  return { quizId, session };
}

for (const viewport of [
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`kết quả sau buổi chơi, ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("xem danh sách các buổi, kết quả khớp điểm tính tay, xoá có xác nhận; axe đạt", async ({ page }) => {
      const teacher = await newTeacher("results");
      const { quizId, session } = await playFullSession(teacher, "Quiz có kết quả");
      await loginAs(page, teacher);
      await page.goto(`/my-quizzes/${quizId}`);

      // Danh sách các buổi đã chơi của quiz.
      const history = page.getByRole("region", { name: "Các buổi đã chơi" });
      await expect(history.getByText("2 bạn chơi · điểm trung bình 2500")).toBeVisible();
      await audit(page, "danh sách các buổi đã chơi");
      await history.getByRole("link", { name: "Xem kết quả" }).click();
      await expect(page).toHaveURL(new RegExp(`/host/${session.id}/results$`));

      // Kết quả: xếp hạng, thống kê từng câu và từng bạn.
      await expect(heading(page, "Kết quả: Quiz có kết quả")).toBeVisible();
      await expect(page.getByText(/2 bạn chơi · điểm trung bình 2500/).filter({ visible: true })).toBeVisible();
      const ranking = page.getByRole("table", { name: "Điểm cuối của từng bạn" });
      await expect(ranking.getByRole("row", { name: /^1 Lan 3000 3 \/ 4/ })).toBeVisible();
      await expect(ranking.getByRole("row", { name: /^2 Huy 2000 2 \/ 4/ })).toBeVisible();

      const perQuestion = page.getByRole("table", { name: /Số bạn đúng, chưa đúng/ });
      await expect(perQuestion.getByRole("row", { name: /^1 Thủ đô của Việt Nam.* 1 1 0 50%/ })).toBeVisible();
      await expect(perQuestion.getByRole("row", { name: /^2 Mặt Trời quay quanh.* 2 0 0 100%/ })).toBeVisible();
      await perQuestion.getByText("Lượt chọn từng lựa chọn").first().click();
      await expect(page.getByText("A. Hà Nội: 1 bạn chọn (đáp án đúng)")).toBeVisible();
      await expect(page.getByText("B. Huế: 1 bạn chọn")).toBeVisible();
      await expect(page.getByText("Đáp án chấp nhận: con mèo / mèo")).toBeVisible();

      const matrix = page.getByRole("table", { name: "Mỗi ô là kết quả của một bạn ở một câu" });
      const lanRow = matrix.getByRole("row", { name: /^Lan/ });
      await expect(lanRow).toContainText("Đúng, 1000 điểm");
      await expect(lanRow).toContainText("Sai");
      // Thấy cả đáp án mỗi bạn đã chọn hoặc gõ, để phân biệt lỗi hiểu bài với lỗi gõ dấu.
      await expect(lanRow).toContainText("Chọn A. Hà Nội");
      await expect(lanRow).toContainText("Chọn A. 2");
      await expect(lanRow).toContainText("Gõ: Mèo");
      const huyRow = matrix.getByRole("row", { name: /^Huy/ });
      await expect(huyRow).toContainText("Sai");
      await expect(huyRow).toContainText("Chọn B. Huế");
      await expect(huyRow).toContainText("Chọn A. 2, C. 4");
      await expect(huyRow).toContainText("Gõ: chó");
      await audit(page, "trang kết quả");
      const downloading = page.waitForEvent("download");
      await page.getByRole("button", { name: "Xuất kết quả CSV", exact: true }).click();
      const download = await downloading; const csv = await readFile((await download.path())!, "utf8");
      expect(csv.startsWith("\uFEFF")).toBe(true); const rows = readExamCsv(csv);
      expect(rows).toHaveLength(3); expect(rows[1][rows[0].indexOf("nickname")]).toBe("Lan");
      expect(rows[1][rows[0].indexOf("score")]).toBe("3000");
      expect(rows[1][rows[0].indexOf("correct")]).toBe("3");
      expect(csv).not.toContain("player_token"); expect(csv).not.toContain("accepted_answers");

      // Xoá buổi có xác nhận: giữ lại thì không xoá, xoá thì quay về và buổi biến mất.
      await page.getByRole("button", { name: "Xoá buổi này" }).click();
      const confirm = page.getByRole("group", { name: "Xác nhận xoá buổi chơi" });
      await expect(confirm.getByRole("button", { name: "Giữ lại" })).toBeFocused();
      await audit(page, "xác nhận xoá buổi chơi");
      await confirm.getByRole("button", { name: "Giữ lại" }).click();
      await expect(heading(page, "Kết quả: Quiz có kết quả")).toBeVisible();
      await page.getByRole("button", { name: "Xoá buổi này" }).click();
      await page.getByRole("group", { name: "Xác nhận xoá buổi chơi" }).getByRole("button", { name: "Xoá buổi này" }).click();
      await expect(page).toHaveURL(/\/my-quizzes$/);

      await page.goto(`/my-quizzes/${quizId}`);
      await expect(page.getByText("Quiz này chưa được chơi buổi nào")).toBeVisible();
      await page.goto(`/host/${session.id}/results`);
      await expect(heading(page, "Không tìm thấy kết quả này")).toBeVisible();
    });
  });
}

test.describe("danh sách các buổi đã chơi", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("xoá một buổi ngay trong danh sách của quiz: có xác nhận và trả focus", async ({ page }) => {
    const teacher = await newTeacher("history-del");
    const { quizId } = await playFullSession(teacher, "Quiz xoá trong danh sách");
    await loginAs(page, teacher);
    await page.goto(`/my-quizzes/${quizId}`);
    const history = page.getByRole("region", { name: "Các buổi đã chơi" });
    await expect(history.getByRole("listitem")).toHaveCount(1);

    await history.getByRole("button", { name: /^Xoá buổi/ }).click();
    const confirm = history.getByRole("group", { name: /^Xoá buổi/ });
    await expect(confirm.getByRole("button", { name: "Giữ lại" })).toBeFocused();
    await confirm.getByRole("button", { name: "Giữ lại" }).click();
    await expect(history.getByRole("button", { name: /^Xoá buổi/ })).toBeFocused();
    await expect(history.getByRole("listitem")).toHaveCount(1);

    await history.getByRole("button", { name: /^Xoá buổi/ }).click();
    await history.getByRole("group", { name: /^Xoá buổi/ }).getByRole("button", { name: "Xoá buổi" }).click();
    await expect(history.getByText("Quiz này chưa được chơi buổi nào")).toBeVisible();
    await expect(history.getByRole("heading", { name: "Các buổi đã chơi" })).toBeFocused();
  });

  test("buổi của quiz đã xoá vẫn xem và xoá được ở trang Các buổi đã chơi; Xem thêm tải trang kế", async ({ page }) => {
    const teacher = await newTeacher("history-all");
    const { quizId, session } = await playFullSession(teacher, "Quiz sẽ bị xoá");
    // Thêm 20 buổi trống (bắt đầu rồi kết thúc ngay) để vượt một trang 20 dòng.
    const extra = await newQuiz(teacher, [fourKinds[0]], "Quiz nhiều buổi");
    for (let i = 0; i < 20; i += 1) {
      const s = await startSession(teacher, extra, false);
      await s.end();
    }
    expect((await teacher.client.from("quizzes").delete().eq("id", quizId)).error).toBeNull();

    await loginAs(page, teacher);
    await page.goto("/my-quizzes");
    await page.getByRole("link", { name: "Xem kết quả và xoá các buổi đã chơi" }).click();
    await expect(page).toHaveURL(/\/host$/);
    await expect(page.getByRole("heading", { level: 1, name: "Các buổi đã chơi" })).toBeVisible();
    const list = page.getByRole("region", { name: "Các buổi đã chơi" });
    await expect(list.getByRole("listitem")).toHaveCount(20);
    await list.getByRole("button", { name: "Xem thêm" }).click();
    await expect(list.getByRole("listitem")).toHaveCount(21);
    await expect(list.getByRole("button", { name: "Xem thêm" })).toHaveCount(0);

    // Buổi của quiz đã xoá được ghi rõ và xoá được.
    const orphan = list.getByRole("listitem").filter({ hasText: "(quiz đã xoá)" });
    await expect(orphan).toHaveCount(1);
    await expect(orphan).toContainText("Quiz sẽ bị xoá");
    await orphan.getByRole("button", { name: /^Xoá buổi/ }).click();
    await list.getByRole("group", { name: /^Xoá buổi/ }).getByRole("button", { name: "Xoá buổi" }).click();
    await expect(list.getByRole("listitem").filter({ hasText: "(quiz đã xoá)" })).toHaveCount(0);
    await page.goto(`/host/${session.id}/results`);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy kết quả này" })).toBeVisible();
  });
});

test.describe("kết quả: quyền xem và trạng thái", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("giáo viên khác không xem được; khách bị chuyển tới đăng nhập; id sai dạng báo không tìm thấy", async ({ page, browser }) => {
    const owner = await newTeacher("results-owner");
    const { session } = await playFullSession(owner, "Quiz riêng");
    const stranger = await newTeacher("results-stranger");
    await loginAs(page, stranger);
    await page.goto(`/host/${session.id}/results`);
    await expect(heading(page, "Không tìm thấy kết quả này")).toBeVisible();
    await expect(page.getByText("Lan")).toHaveCount(0);
    await page.goto("/host/khong-phai-uuid/results");
    await expect(heading(page, "Không tìm thấy kết quả này")).toBeVisible();

    const guest = await (await browser.newContext()).newPage();
    await guest.goto(`/host/${session.id}/results`);
    await expect(guest).toHaveURL(/\/login\?next=/);
    await guest.context().close();
  });

  test("phiên đang chạy thì báo chưa có kết quả và chỉ về màn hình điều khiển; kết thúc rồi thì có liên kết từ màn kết thúc", async ({ page }) => {
    const teacher = await newTeacher("results-running");
    const session = await startSession(teacher, await newQuiz(teacher));
    await loginAs(page, teacher);
    await page.goto(`/host/${session.id}/results`);
    await expect(heading(page, "Phiên còn đang chạy")).toBeVisible();
    await page.getByRole("link", { name: "Về màn hình điều khiển" }).click();
    await expect(page).toHaveURL(new RegExp(`/host/${session.id}$`));

    await session.end();
    await expect(page.getByRole("heading", { level: 1, name: /Kết thúc/ })).toBeVisible();
    await page.getByRole("link", { name: "Xem kết quả chi tiết" }).click();
    await expect(heading(page, /Kết quả:/)).toBeVisible();
    await expect(page.getByText("Phiên này chưa có người chơi nào.").first()).toBeVisible();
  });
});
