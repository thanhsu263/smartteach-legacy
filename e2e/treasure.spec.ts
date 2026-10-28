import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { cleanupLive, loginAs, newQuiz, newTeacher, startSession, type QuestionSpec } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

/** Câu một đáp án: A đúng, B sai. */
const questions = (count: number): QuestionSpec[] =>
  Array.from({ length: count }, (_, i) => ({
    kind: "single" as const,
    prompt: `Câu số ${i + 1}`,
    options: [{ label: "Đáp án đúng", is_correct: true }, { label: "Đáp án sai" }],
  }));

async function newPage(browser: Browser, width: number, height: number) {
  return (await browser.newContext({ viewport: { width, height } })).newPage();
}

/** Giáo viên (màn điều khiển đang mở) và hai điện thoại An, Bình đã vào phòng; phiên bật kho báu nếu `options.treasure_mode`. */
async function setup(browser: Browser, count: number, options: Record<string, unknown> = { treasure_mode: true }, widths = { teacher: 1280, phone: 375 }) {
  const teacherPage = await newPage(browser, widths.teacher, 900);
  const an = await newPage(browser, widths.phone, 812);
  const binh = await newPage(browser, widths.phone, 812);
  const teacher = await newTeacher("treasure-e2e");
  const quizId = await newQuiz(teacher, questions(count), "Quiz kho báu");
  const session = await startSession(teacher, quizId, false, options);
  await loginAs(teacherPage, teacher);
  await teacherPage.goto(`/host/${session.id}`);
  for (const [page, name] of [[an, "An"], [binh, "Bình"]] as const) {
    await page.goto(`/play?pin=${session.pin}`);
    await page.getByLabel("Biệt danh").fill(name);
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
  }
  await expect(teacherPage.getByRole("heading", { name: "Người chơi (2)" })).toBeVisible();
  await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();
  return { teacherPage, an, binh, session };
}

/** Chơi câu thứ `index`: An chọn `anPicks` (A đúng, B sai), Bình chọn `binhPicks`; giáo viên hiện đáp án. */
async function playQuestion(
  ctx: { teacherPage: Page; an: Page; binh: Page },
  index: number,
  anPicks: "A" | "B",
  binhPicks: "A" | "B",
) {
  for (const [page, pick] of [[ctx.an, anPicks], [ctx.binh, binhPicks]] as const) {
    await expect(heading(page, `Câu số ${index}`)).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`^${pick} `) }).click();
  }
  await expect(ctx.teacherPage.getByText("2 / 2")).toBeVisible();
  await ctx.teacherPage.getByRole("button", { name: "Hiện đáp án" }).click();
}

const next = (teacherPage: Page, label = "Câu tiếp theo") => teacherPage.getByRole("button", { name: label }).click();

const score = async (page: Page) => Number((await page.locator("dl").getByText("Tổng điểm").locator("xpath=following-sibling::dd").textContent())?.trim());

test.describe("kho báu", () => {
  test("3 đúng liền nhau cho rương thắng, 3 sai liền nhau cho rương an ủi; mở rương đổi điểm khớp mọi màn hình", async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await setup(browser, 5);
    const { teacherPage, an, binh } = ctx;

    await playQuestion(ctx, 1, "A", "B");
    await expect(heading(an, "Đúng rồi!")).toBeVisible();
    await expect(an.getByText("Chuỗi đúng 1/3")).toBeVisible();
    await expect(binh.getByText("Chuỗi chưa đúng 1/3")).toBeVisible();
    await next(teacherPage);
    await playQuestion(ctx, 2, "A", "B");
    await expect(an.getByText("Chuỗi đúng 2/3")).toBeVisible();
    // Chưa đủ 3 câu: chưa có rương.
    await expect(an.getByRole("heading", { name: "Bạn nhận được một rương kho báu!" })).toHaveCount(0);
    await next(teacherPage);
    await playQuestion(ctx, 3, "A", "B");

    // An: rương thắng. Bình: rương an ủi (chỉ có thêm điểm).
    await expect(an.getByRole("heading", { name: "Bạn nhận được một rương kho báu!" })).toBeVisible();
    await expect(an.getByText("đúng 3 câu liên tiếp")).toBeVisible();
    await expect(binh.getByRole("heading", { name: "Bạn nhận được một rương kho báu!" })).toBeVisible();
    await expect(binh.getByText("không bị trừ")).toBeVisible();
    await expect(an.getByRole("group", { name: "Chọn một rương" }).getByRole("button")).toHaveCount(3);

    // Chưa mở: màn hình điều khiển chưa có dòng nào.
    await expect(teacherPage.getByText("Chưa bạn nào mở rương.")).toBeVisible();

    // An mở bằng bàn phím (Enter): kết quả có nhãn hiệu ứng, điểm trước và sau, tăng/giảm bằng chữ.
    await an.getByRole("button", { name: "Rương 2" }).focus();
    await an.keyboard.press("Enter");
    const result = an.getByRole("region", { name: "Kho báu", exact: true }).getByRole("status");
    await expect(result).toBeVisible();
    const text = (await result.textContent()) ?? "";
    const [, before, after] = /(\d+) thành (\d+) điểm/.exec(text)!;
    expect(Number(before)).toBe(3000);
    expect(text).toMatch(/Điểm (tăng|giảm|giữ nguyên)/);
    // Tổng điểm của An khớp điểm sau (màn hình tự làm mới), và bảng xếp hạng của giáo viên cũng vậy.
    await expect.poll(() => score(an), { timeout: 4000 }).toBe(Number(after)); // ngay sau khi mở (làm mới tức thì, không chờ nhịp polling)
    await expect(teacherPage.getByRole("listitem").filter({ hasText: "An" }).filter({ hasText: after })).toBeVisible({ timeout: 15_000 });

    // Bảng xếp hạng ngay trên điện thoại cũng cập nhật theo điểm mới (không còn điểm cũ).
    await expect(an.getByRole("list", { name: "Bảng xếp hạng" }).getByRole("listitem").filter({ hasText: "(bạn)" })).toContainText(after, { timeout: 4000 });
    // Tải lại giữa chừng: vẫn thấy đúng kết quả đã mở (không mở thêm lần nữa).
    await an.reload();
    await expect(an.getByRole("region", { name: "Kho báu", exact: true }).getByRole("status").filter({ hasText: `${before} thành ${after} điểm` })).toBeVisible();
    await expect(an.getByRole("button", { name: /^Rương \d$/ })).toHaveCount(0);

    // Bình mở rương an ủi: không bao giờ giảm điểm.
    await binh.getByRole("button", { name: "Rương 1" }).click();
    const comfort = binh.getByRole("region", { name: "Kho báu", exact: true }).getByRole("status");
    await expect(comfort).toBeVisible();
    expect(await comfort.textContent()).not.toContain("Điểm giảm");

    // Giáo viên thấy bảng tin của cả hai rương.
    const feed = teacherPage.getByRole("region", { name: "Kho báu", exact: true });
    await expect(feed.getByText(/An.*mở rương thắng:/)).toBeVisible({ timeout: 15_000 });
    await expect(feed.getByText(/Bình.*mở rương an ủi:/)).toBeVisible();

    // Sang câu 4: chuỗi đã về 0 (không còn chip), không còn thẻ rương, không có thông báo tự mở vì đã mở bằng tay.
    await next(teacherPage);
    await expect(heading(an, "Câu số 4")).toBeVisible();
    await expect(an.getByText(/^Chuỗi /)).toHaveCount(0);
    await expect(an.getByText("Rương câu trước đã tự mở cho bạn.")).toHaveCount(0);
  });

  test("rương chưa mở thì tự mở khi sang câu kế và học sinh được báo rõ; kết thúc phiên có tổng kết và cột kho báu ở trang kết quả", async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await setup(browser, 4);
    const { teacherPage, an, binh, session } = ctx;
    // An đúng cả 3 câu đầu (rương thắng); Bình sai câu 3 nên không có rương.
    await playQuestion(ctx, 1, "A", "A");
    await next(teacherPage);
    await playQuestion(ctx, 2, "A", "A");
    await next(teacherPage);
    await playQuestion(ctx, 3, "A", "B");
    await expect(an.getByRole("heading", { name: "Bạn nhận được một rương kho báu!" })).toBeVisible();
    // An không mở; sang câu 4 thì rương tự mở và An được báo.
    await next(teacherPage);
    await expect(heading(an, "Câu số 4")).toBeVisible();
    const notice = an.getByRole("status").filter({ hasText: "Rương câu trước đã tự mở cho bạn." });
    await expect(notice).toBeVisible();
    const noticeText = (await notice.textContent()) ?? "";
    const [, before, after] = /(\d+) thành (\d+) điểm/.exec(noticeText)!;
    expect(Number(before)).toBe(3000);
    await expect(an.getByText(`${after} điểm`, { exact: true })).toBeVisible();

    // Câu 4 (cuối): An đúng tiếp (chuỗi mới 1), Bình sai; kết thúc.
    await playQuestion(ctx, 4, "A", "B");
    await next(teacherPage, "Xem kết quả");
    await expect(heading(an, "Kết thúc!")).toBeVisible();
    const summary = an.getByRole("region", { name: "Kho báu", exact: true });
    await expect(summary).toContainText("Bạn đã mở 1 rương");
    const delta = Number(after) - Number(before);
    await expect(summary).toContainText(delta > 0 ? `+${delta} điểm` : delta < 0 ? `-${Math.abs(delta)} điểm` : "0 điểm");
    await expect(summary).toContainText("Rương này đã tự mở cho bạn.");
    // Bình không có rương nào: không có phần tổng kết.
    await expect(binh.getByRole("region", { name: "Kho báu", exact: true })).toHaveCount(0);

    // Trang kết quả của giáo viên có cột Kho báu khớp.
    await teacherPage.goto(`/host/${session.id}/results`);
    const ranking = teacherPage.getByRole("table").first();
    await expect(ranking.getByRole("columnheader", { name: "Kho báu" })).toBeVisible();
    const anRow = ranking.getByRole("row", { name: /^\d+ An / });
    await expect(anRow).toContainText("(1 rương)");
    await expect(anRow).toContainText(delta > 0 ? `+${delta} điểm` : delta < 0 ? `-${Math.abs(delta)} điểm` : "0 điểm");
    await expect(teacherPage.getByText("Phiên này bật chế độ kho báu")).toBeVisible();
  });

  test("tắt chế độ giải trí thì không có chip, rương, bảng tin hay cột kho báu nào", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await setup(browser, 3, {});
    const { teacherPage, an } = ctx;
    await playQuestion(ctx, 1, "A", "B");
    await next(teacherPage);
    await playQuestion(ctx, 2, "A", "B");
    await next(teacherPage);
    await playQuestion(ctx, 3, "A", "B");
    await expect(heading(an, "Đúng rồi!")).toBeVisible();
    await expect(an.getByText(/Chuỗi /)).toHaveCount(0);
    await expect(an.getByRole("heading", { name: /rương kho báu/ })).toHaveCount(0);
    await expect(teacherPage.getByRole("region", { name: "Kho báu", exact: true })).toHaveCount(0);
  });

  test("bảng bắt đầu phiên: công tắc kho báu mặc định tắt; bật cùng tự động thì chỉ chọn được từ 8 giây", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const teacher = await newTeacher("treasure-panel");
    await newQuiz(teacher, questions(2), "Quiz bảng");
    await loginAs(page, teacher);
    await page.getByRole("listitem").filter({ hasText: "Quiz bảng" }).getByRole("button", { name: "Chơi ngay" }).click();

    const treasure = page.getByLabel(/^Chế độ giải trí: kho báu/);
    await expect(treasure).not.toBeChecked();
    await page.getByLabel(/^Tự động qua câu/).check();
    await page.getByRole("radio", { name: "5 giây" }).check();
    await treasure.check();
    // Bật kho báu: chọn 5 giây bị gỡ (máy chủ cũng ép tối thiểu 8 giây) và 8 giây được chọn.
    await expect(page.getByRole("radio", { name: /^5 giây/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: "8 giây", exact: true })).toBeChecked();
    await expect(page.getByText("kho báu cần tối thiểu 8 giây")).toBeVisible();
    await treasure.uncheck();
    await expect(page.getByRole("radio", { name: "5 giây", exact: true })).toBeEnabled();
  });

  test("mở rương gặp lỗi mạng thì báo lỗi, bấm lại được và điểm chỉ đổi một lần; vùng đọc cố định báo rương cho trình đọc màn hình", async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await setup(browser, 4);
    const { teacherPage, an } = ctx;
    await playQuestion(ctx, 1, "A", "B");
    await next(teacherPage);
    await playQuestion(ctx, 2, "A", "B");
    await next(teacherPage);
    await playQuestion(ctx, 3, "A", "B");
    await expect(an.getByRole("heading", { name: "Bạn nhận được một rương kho báu!" })).toBeVisible();

    // Vùng đọc cố định (có sẵn trong trang, chỉ đổi nội dung) báo có rương ngay khi hiện đáp án.
    const announcer = an.locator('p[role="status"].visually-hidden').first();
    await expect(announcer).toContainText("Bạn nhận được một rương kho báu. Chọn một rương để mở.");
    // Chữ giải thích dùng ngưỡng do máy chủ trả (3), không viết cứng ở giao diện.
    await expect(an.getByText("Bạn đã đúng 3 câu liên tiếp")).toBeVisible();

    // Lời gọi mở rương không tới được máy chủ: báo lỗi và vẫn còn ba rương để bấm lại.
    await an.route("**/rest/v1/rpc/open_chest", (route) => route.abort("failed"));
    await an.getByRole("button", { name: "Rương 1" }).click();
    await expect(an.getByRole("alert").filter({ hasText: "Bạn bấm mở lại nhé" })).toBeVisible();
    await expect(an.getByRole("button", { name: /^Rương \d$/ })).toHaveCount(3);
    expect(await score(an)).toBe(3000); // chưa mở được nên điểm chưa đổi

    // Có mạng lại: bấm lại ra đúng một kết quả; điểm đổi đúng một lần và khớp kết quả.
    await an.unroute("**/rest/v1/rpc/open_chest");
    await an.getByRole("button", { name: "Rương 2" }).click();
    const result = an.getByRole("region", { name: "Kho báu", exact: true }).getByRole("status");
    await expect(result).toBeVisible();
    const [, before, after] = /(\d+) thành (\d+) điểm/.exec((await result.textContent()) ?? "")!;
    expect(Number(before)).toBe(3000);
    await expect.poll(() => score(an), { timeout: 4000 }).toBe(Number(after));
    await expect(announcer).toContainText(`Rương: `);
    await expect(announcer).toContainText(`${before} thành ${after} điểm`);

    // Tải lại: cùng kết quả, không đổi điểm lần nữa.
    await an.reload();
    await expect(an.getByRole("region", { name: "Kho báu", exact: true }).getByRole("status").filter({ hasText: `${before} thành ${after} điểm` })).toBeVisible();
    expect(await score(an)).toBe(Number(after));
  });

  // Cấu hình Playwright mặc định chạy với giảm chuyển động; test này tự bật lại để thấy hoạt hình rồi mới tắt.
  test.describe("hoạt hình lật rương", () => {
    test.use({ reducedMotion: "no-preference" });

    test("hoạt hình lật rương tắt khi người dùng chọn giảm chuyển động", async ({ browser }) => {
      test.setTimeout(150_000);
      const ctx = await setup(browser, 4);
      const { teacherPage, an } = ctx;
      await playQuestion(ctx, 1, "A", "B");
      await next(teacherPage);
      await playQuestion(ctx, 2, "A", "B");
      await next(teacherPage);
      await playQuestion(ctx, 3, "A", "B");

      const animationOf = () => an.locator('[class*="chestResult"]').first().evaluate((el) => getComputedStyle(el).animationName);
      await an.getByRole("button", { name: "Rương 3" }).click();
      await expect(an.locator('[class*="chestResult"]').first()).toBeVisible();
      expect(await animationOf()).toContain("chestPop");
      await an.emulateMedia({ reducedMotion: "reduce" });
      expect(await animationOf()).toBe("none");
    });
  });
});

for (const viewport of [
  { name: "máy chiếu 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA kho báu, ${viewport.name}`, () => {
    test("rương chưa mở, đã mở, thông báo tự mở, bảng tin của giáo viên và trang kết quả", async ({ browser }) => {
      test.setTimeout(180_000);
      const ctx = await setup(browser, 4, { treasure_mode: true }, { teacher: viewport.width, phone: viewport.width });
      const { teacherPage, an, binh, session } = ctx;

      const audit = async (page: Page, label: string) => {
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(
          results.violations.map((v) => ({ rule: v.id, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })),
          `${label}: vi phạm WCAG`,
        ).toEqual([]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${label}: tràn ngang`).toBeLessThanOrEqual(0);
      };

      await playQuestion(ctx, 1, "A", "B");
      await next(teacherPage);
      await playQuestion(ctx, 2, "A", "B");
      await expect(an.getByText("Chuỗi đúng 2/3")).toBeVisible();
      await audit(an, "chip chuỗi ở màn hiện đáp án");
      await next(teacherPage);
      await playQuestion(ctx, 3, "A", "B");
      await expect(an.getByRole("heading", { name: "Bạn nhận được một rương kho báu!" })).toBeVisible();
      await audit(an, "rương chưa mở");

      await an.getByRole("button", { name: "Rương 1" }).click();
      await expect(an.getByRole("region", { name: "Kho báu", exact: true }).getByRole("status")).toBeVisible();
      await audit(an, "rương đã mở");
      await expect(teacherPage.getByRole("region", { name: "Kho báu", exact: true }).getByText(/An.*mở rương thắng:/)).toBeVisible({ timeout: 15_000 });
      await audit(teacherPage, "bảng tin kho báu của giáo viên");

      // Bình không mở: sang câu 4 thì rương tự mở và có thông báo.
      await next(teacherPage);
      await expect(binh.getByRole("status").filter({ hasText: "Rương câu trước đã tự mở cho bạn." })).toBeVisible();
      await audit(binh, "thông báo rương tự mở ở câu hỏi");

      await playQuestion(ctx, 4, "A", "A");
      await next(teacherPage, "Xem kết quả");
      await expect(heading(binh, "Kết thúc!")).toBeVisible();
      await audit(binh, "màn kết thúc có tổng kết kho báu");
      await teacherPage.goto(`/host/${session.id}/results`);
      await expect(teacherPage.getByRole("columnheader", { name: "Kho báu" })).toBeVisible();
      await audit(teacherPage, "trang kết quả có cột kho báu");
    });
  });
}
