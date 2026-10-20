import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { cleanupLive, fourKinds, loginAs, newQuiz, newTeacher, startSession } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });
const twoQuestions = fourKinds.slice(0, 2);
const FIRST = "Thủ đô của Việt Nam là gì?";
const SECOND = "Mặt Trời quay quanh Trái Đất.";

async function newContext(browser: Browser, width: number, height: number) {
  return (await browser.newContext({ viewport: { width, height } })).newPage();
}

/** Giáo viên có phiên tự động (qua API để đặt được giờ ngắn), một điện thoại đã vào phòng, màn giáo viên đang mở. */
async function autoSession(browser: Browser, revealSeconds: 5 | 8 | 12, timeLimit = 2) {
  const teacherPage = await newContext(browser, 1280, 800);
  const phone = await newContext(browser, 375, 812);
  const teacher = await newTeacher("auto-e2e");
  const quizId = await newQuiz(teacher, twoQuestions, "Quiz tự động");
  const session = await startSession(teacher, quizId, false, { auto_advance: true, reveal_seconds: revealSeconds });
  await session.setTimeLimit(timeLimit);
  await loginAs(teacherPage, teacher);
  await teacherPage.goto(`/host/${session.id}`);
  await expect(heading(teacherPage, /Phòng chờ/)).toBeVisible();
  await phone.goto(`/play?pin=${session.pin}`);
  await phone.getByLabel("Biệt danh").fill("An");
  await phone.getByRole("button", { name: "Vào phòng" }).click();
  await expect(heading(phone, "Bạn đã vào phòng")).toBeVisible();
  return { teacherPage, phone, session };
}

const autoBar = (page: Page) => page.getByRole("group", { name: "Tự động qua câu" });

test.describe("bảng bắt đầu phiên", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("bật Tự động hiện lựa chọn 5, 8, 12 giây (mặc định 8); tắt thì ẩn; phiên bắt đầu có dải tự động", async ({ page, browser }) => {
    const teacher = await newTeacher("auto-start");
    await newQuiz(teacher, twoQuestions, "Quiz bắt đầu");
    await loginAs(page, teacher);
    await page.getByRole("listitem").filter({ hasText: "Quiz bắt đầu" }).getByRole("button", { name: "Chơi ngay" }).click();

    const toggle = page.getByLabel(/^Tự động qua câu/);
    await expect(toggle).not.toBeChecked();
    await expect(page.getByRole("group", { name: "Thời gian hiện đáp án trước khi sang câu kế" })).toHaveCount(0);
    await toggle.check();
    const choices = page.getByRole("group", { name: "Thời gian hiện đáp án trước khi sang câu kế" });
    await expect(choices.getByRole("radio")).toHaveCount(3);
    await expect(choices.getByRole("radio", { name: "8 giây" })).toBeChecked();
    await toggle.uncheck();
    await expect(choices).toHaveCount(0);
    await toggle.check();
    await choices.getByRole("radio", { name: "5 giây" }).check();
    await page.getByLabel(/Tính thêm điểm theo tốc độ/).uncheck();
    await page.getByRole("button", { name: "Bắt đầu phiên" }).click();
    await expect(heading(page, /Phòng chờ/)).toBeVisible();

    // Một bạn vào, giáo viên bắt đầu: dải tự động xuất hiện ở pha câu hỏi với nút Tạm dừng.
    const pin = (await page.getByLabel(/^PIN:/).textContent())?.trim() ?? "";
    const phone = await newContext(browser, 375, 812);
    await phone.goto(`/play?pin=${pin}`);
    await phone.getByLabel("Biệt danh").fill("An");
    await phone.getByRole("button", { name: "Vào phòng" }).click();
    await expect(page.getByRole("heading", { name: "Người chơi (1)" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await expect(heading(page, FIRST)).toBeVisible();
    await expect(autoBar(page).getByRole("button", { name: "Tạm dừng tự động" })).toBeVisible();
    await page.getByRole("button", { name: "Hiện đáp án" }).click();
    // Đã chọn 5 giây: đếm ngược bắt đầu từ tối đa 5.
    await expect(autoBar(page).getByText(/^Sang câu kế sau [1-5] giây$/)).toBeVisible();
  });
});

test("hết giờ thì tự hiện đáp án, đợi đúng thời gian rồi tự sang câu kế; sau câu cuối tự sang bục vinh danh, không ai bấm gì", async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacherPage, phone, session } = await autoSession(browser, 5);

  // Giáo viên bấm Bắt đầu (lần duy nhất); từ đây mọi thứ tự chạy.
  await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(heading(teacherPage, FIRST)).toBeVisible();
  await expect(heading(phone, FIRST)).toBeVisible();

  // Hết 2 giây: tự đóng câu và hiện đáp án.
  await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible({ timeout: 15_000 });
  await expect(autoBar(teacherPage).getByText(/^Sang câu kế sau \d giây$/)).toBeVisible();
  await expect(phone.getByText(/^Câu tiếp theo bắt đầu sau \d giây$/)).toBeVisible();
  const revealedAt = Date.now();

  // Không sang sớm: ngay sau khi hiện đáp án vẫn còn ở câu 1.
  await teacherPage.waitForTimeout(2000);
  await expect(heading(teacherPage, FIRST)).toBeVisible();

  // Rồi tự sang câu 2 trên cả hai màn hình, sau khoảng 5 giây kể từ lúc hiện đáp án.
  await expect(heading(teacherPage, SECOND)).toBeVisible({ timeout: 15_000 });
  await expect(heading(phone, SECOND)).toBeVisible();
  const waited = Date.now() - revealedAt;
  expect(waited, "không sang trước 5 giây").toBeGreaterThanOrEqual(4000);
  expect(waited, "sang trong khoảng hợp lý").toBeLessThan(12_000);

  // Câu 2 là câu cuối: sau đáp án, thấy chữ báo sắp hiện kết quả rồi tự sang bục vinh danh.
  await expect(teacherPage.getByRole("button", { name: "Xem kết quả" })).toBeVisible({ timeout: 15_000 });
  await expect(autoBar(teacherPage).getByText(/^Hiện kết quả cuối sau \d giây$/)).toBeVisible();
  await expect(heading(teacherPage, /^Kết thúc:/)).toBeVisible({ timeout: 20_000 });
  await expect(heading(phone, "Kết thúc!")).toBeVisible({ timeout: 20_000 });
  expect((await session.state()).status).toBe("ended");
});

test("nhắc máy chủ mở câu kế gặp lỗi mạng thì báo lỗi, giữ nguyên màn hiện đáp án rồi thử lại tới khi sang được", async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacherPage, phone } = await autoSession(browser, 5);

  await teacherPage.route("**/rest/v1/rpc/host_advance_if_due", (route) => route.abort("failed"));
  await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible({ timeout: 15_000 });

  // Quá 5 giây mà lời nhắc không tới được máy chủ: báo lỗi và đứng nguyên ở câu 1 (không tự đổi gì ở máy khách).
  await expect(teacherPage.getByRole("alert").filter({ hasText: "Mất kết nối" })).toBeVisible({ timeout: 15_000 });
  await expect(heading(teacherPage, FIRST)).toBeVisible();
  await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();
  await expect(heading(phone, SECOND)).toHaveCount(0);

  // Có mạng lại: lần thử kế tiếp (mỗi giây) sang câu 2 và xoá lời báo lỗi.
  await teacherPage.unroute("**/rest/v1/rpc/host_advance_if_due");
  await expect(heading(teacherPage, SECOND)).toBeVisible({ timeout: 10_000 });
  await expect(teacherPage.getByRole("alert").filter({ hasText: "Mất kết nối" })).toHaveCount(0);
  await expect(heading(phone, SECOND)).toBeVisible();
});

test("Tạm dừng giữ nguyên màn hiện đáp án; Tiếp tục thì sang câu kế sau khoảng 3 giây", async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacherPage, phone } = await autoSession(browser, 12);

  await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible({ timeout: 15_000 });

  await autoBar(teacherPage).getByRole("button", { name: "Tạm dừng tự động" }).click();
  await expect(autoBar(teacherPage).getByText("Tự động đang tạm dừng")).toBeVisible();
  await expect(phone.getByText("Thầy cô đang tạm dừng. Câu tiếp theo bắt đầu khi thầy cô tiếp tục.")).toBeVisible();

  // Dù qua hết 12 giây gốc vẫn đứng nguyên ở câu 1.
  await teacherPage.waitForTimeout(4000);
  await expect(heading(teacherPage, FIRST)).toBeVisible();
  await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();

  const resumedAt = Date.now();
  await autoBar(teacherPage).getByRole("button", { name: "Tiếp tục tự động" }).click();
  await expect(heading(teacherPage, SECOND)).toBeVisible({ timeout: 15_000 });
  const waited = Date.now() - resumedAt;
  expect(waited, "ân hạn khoảng 3 giây").toBeGreaterThanOrEqual(2000);
  expect(waited).toBeLessThan(9000);
  await expect(heading(phone, SECOND)).toBeVisible();
});

test("bấm tay 'Câu tiếp theo' khi đang bật tự động sang câu kế ngay, không chờ hết giờ", async ({ browser }) => {
  test.setTimeout(90_000);
  const { teacherPage } = await autoSession(browser, 12);
  await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible({ timeout: 15_000 });
  await teacherPage.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(heading(teacherPage, SECOND)).toBeVisible({ timeout: 4000 });
});

for (const viewport of [
  { name: "máy chiếu 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA tự động qua câu, ${viewport.name}`, () => {
    test("bảng bắt đầu có lựa chọn giây; dải tự động ở pha câu hỏi, hiện đáp án và khi tạm dừng", async ({ browser }) => {
      test.setTimeout(120_000);
      const teacherPage = await newContext(browser, viewport.width, viewport.height);
      const teacher = await newTeacher("auto-a11y");
      const quizId = await newQuiz(teacher, twoQuestions, "Quiz trợ năng");
      await loginAs(teacherPage, teacher);

      const audit = async (label: string) => {
        const results = await new AxeBuilder({ page: teacherPage }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(
          results.violations.map((v) => ({ rule: v.id, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })),
          `${label}: vi phạm WCAG`,
        ).toEqual([]);
        const overflow = await teacherPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${label}: tràn ngang`).toBeLessThanOrEqual(0);
      };

      await teacherPage.getByRole("listitem").filter({ hasText: "Quiz trợ năng" }).getByRole("button", { name: "Chơi ngay" }).click();
      await teacherPage.getByLabel(/^Tự động qua câu/).check();
      await expect(teacherPage.getByRole("radio", { name: "12 giây" })).toBeVisible();
      await audit("bảng bắt đầu có lựa chọn giây");

      // Phiên tự động qua API để có giờ ngắn; mở màn điều khiển rồi kiểm từng pha.
      const session = await startSession(teacher, quizId, false, { auto_advance: true, reveal_seconds: 12 });
      await session.setTimeLimit(2);
      await teacherPage.goto(`/host/${session.id}`);
      const phone = await newContext(browser, 375, 812);
      await phone.goto(`/play?pin=${session.pin}`);
      await phone.getByLabel("Biệt danh").fill("An");
      await phone.getByRole("button", { name: "Vào phòng" }).click();
      await expect(teacherPage.getByRole("heading", { name: "Người chơi (1)" })).toBeVisible();
      await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();
      await expect(autoBar(teacherPage)).toBeVisible();
      await audit("dải tự động ở pha câu hỏi");
      await expect(teacherPage.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible({ timeout: 15_000 });
      await audit("dải tự động ở pha hiện đáp án");
      await expect(phone.getByText(/^Câu tiếp theo bắt đầu sau \d+ giây$/)).toBeVisible();
      await autoBar(teacherPage).getByRole("button", { name: "Tạm dừng tự động" }).click();
      await expect(autoBar(teacherPage).getByText("Tự động đang tạm dừng")).toBeVisible();
      await audit("tạm dừng");
    });
  });
}
