import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cleanupLive, fourKinds, newSession } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.use({ viewport: { width: 375, height: 812 } });
test.afterAll(cleanupLive);

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** axe WCAG A/AA, không cuộn ngang ở 375px, đúng một h1 và không nhảy cấp tiêu đề. */
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
const tile = (page: Page, name: string | RegExp | { name: string; exact?: boolean }) =>
  page.getByRole("button", typeof name === "object" && !(name instanceof RegExp) ? name : { name });

test.describe("WCAG AA ở 375px cho mọi trạng thái của học sinh", () => {
  test("màn nhập PIN và biệt danh, kể cả khi có lỗi", async ({ page }) => {
    await page.goto("/play");
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
    await audit(page, "nhập PIN");

    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(page.getByText("Bạn nhập một biệt danh nhé.")).toBeVisible();
    await audit(page, "nhập PIN có lỗi");

    await page.getByLabel("PIN của phòng").fill("999999");
    await page.getByLabel("Biệt danh").fill("Ai đó");
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(page.getByText("PIN chưa đúng hoặc phòng đã đóng")).toBeVisible();
    await audit(page, "PIN sai");
  });

  test("phòng chờ, từng dạng câu hỏi, đã gửi, kết quả đúng và sai, kết thúc", async ({ page }) => {
    const { session } = await newSession();
    await page.goto(`/play?pin=${session.pin}`);
    await page.getByLabel("Biệt danh").fill("Kiểm thử");
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await audit(page, "phòng chờ");

    // Một đáp án: chưa chọn, rồi đã gửi, rồi kết quả đúng.
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await audit(page, "câu một đáp án");
    await tile(page, /Hà Nội/).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await audit(page, "đã gửi đáp án");
    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();
    await audit(page, "kết quả đúng");

    // Đúng/sai: chọn sai để thấy kết quả sai.
    await session.next();
    await expect(heading(page, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
    await audit(page, "câu đúng sai");
    await tile(page, /Đúng/).click();
    await session.close();
    await expect(heading(page, "Chưa đúng")).toBeVisible();
    await audit(page, "kết quả sai");

    // Nhiều đáp án, đã chọn nhưng chưa gửi.
    await session.next();
    await expect(heading(page, "Những số nào là số chẵn?")).toBeVisible();
    await tile(page, { name: "A 2", exact: true }).click();
    await audit(page, "câu nhiều đáp án (đã chọn)");
    await tile(page, { name: "C 4", exact: true }).click();
    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();

    // Điền từ.
    await session.next();
    await expect(heading(page, "Con vật kêu meo meo là gì?")).toBeVisible();
    await audit(page, "câu điền từ");
    await page.getByLabel("Câu trả lời của bạn").fill("mèo");
    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();
    await audit(page, "kết quả điền từ");

    await session.next();
    await expect(heading(page, "Kết thúc!")).toBeVisible();
    await audit(page, "kết thúc");
  });

  test("hết giờ, bạn chưa trả lời, mất kết nối và bị loại", async ({ page }) => {
    const { session } = await newSession([fourKinds[0], fourKinds[0]]);
    await page.goto(`/play?pin=${session.pin}`);
    await page.getByLabel("Biệt danh").fill("Trạng thái lạ");
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();

    await session.setTimeLimit(2);
    await session.open();
    await expect(page.getByText("Hết giờ. Chờ kết quả…")).toBeVisible({ timeout: 8000 });
    await audit(page, "hết giờ");
    await session.close();
    await expect(heading(page, "Bạn chưa trả lời")).toBeVisible();
    await audit(page, "chưa trả lời");

    await page.route("**/rest/v1/rpc/player_state", (route) => route.abort("failed"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByText("Mất kết nối. Đang thử lại")).toBeVisible();
    await audit(page, "mất kết nối");
    await page.unroute("**/rest/v1/rpc/player_state");

    await page.waitForTimeout(600);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByText("Mất kết nối. Đang thử lại")).toHaveCount(0);
    await session.remove("Trạng thái lạ");
    await expect(heading(page, "Bạn đã rời phòng")).toBeVisible();
    await audit(page, "bị loại");
  });

  test("điều hướng bằng bàn phím: Tab tới ô đáp án và Enter để gửi", async ({ page }) => {
    const { session } = await newSession([fourKinds[0]]);
    await page.goto(`/play?pin=${session.pin}`);
    await page.getByLabel("Biệt danh").fill("Bàn phím");
    await page.keyboard.press("Enter");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();

    const first = tile(page, /Hà Nội/);
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(tile(page, /Huế/)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
  });
});
