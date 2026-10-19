import { expect, test, type Page } from "@playwright/test";
import { cleanupLive, fourKinds, loginAs, newQuiz, newTeacher } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.afterAll(cleanupLive);

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });
const tile = (page: Page, name: string | RegExp | { name: string; exact?: boolean }) =>
  page.getByRole("button", typeof name === "object" && !(name instanceof RegExp) ? name : { name });

async function enter(page: Page, pin: string, nickname: string) {
  await page.goto(`/play?pin=${pin}`);
  await page.getByLabel("Biệt danh").fill(nickname);
  await page.getByRole("button", { name: "Vào phòng" }).click();
}

test("một giáo viên và ba học sinh trên trình duyệt riêng: khoá phòng, loại một bạn, bốn dạng câu, hạng cuối khớp điểm tính tay, một bạn tải lại giữa chừng", async ({ browser }) => {
  test.setTimeout(120_000);
  const open = async (width: number, height: number) => (await browser.newContext({ viewport: { width, height } })).newPage();
  const teacherPage = await open(1280, 800);
  const [a, b, c, d] = await Promise.all([open(375, 812), open(375, 812), open(375, 812), open(375, 812)]);

  // Giáo viên đăng nhập, bắt đầu phiên (tắt điểm tốc độ để tính tay) và thấy PIN.
  const teacher = await newTeacher("live-multi");
  await newQuiz(teacher, fourKinds, "Quiz nhiều trình duyệt");
  await loginAs(teacherPage, teacher);
  const item = teacherPage.getByRole("listitem").filter({ hasText: "Quiz nhiều trình duyệt" });
  await item.getByRole("button", { name: "Chơi ngay" }).click();
  await teacherPage.getByLabel(/Tính thêm điểm theo tốc độ/).uncheck();
  await teacherPage.getByRole("button", { name: "Bắt đầu phiên" }).click();
  await expect(heading(teacherPage, /Phòng chờ/)).toBeVisible();
  const pin = (await teacherPage.getByLabel(/^PIN:/).textContent())?.trim() ?? "";
  expect(pin).toMatch(/^\d{6}$/);

  // Ba bạn vào phòng chờ bằng điện thoại.
  await enter(a, pin, "An");
  await enter(b, pin, "Bình");
  await enter(c, pin, "Châu");
  for (const page of [a, b, c]) await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
  await expect(teacherPage.getByRole("heading", { name: "Người chơi (3)" })).toBeVisible();

  // Khoá phòng: bạn thứ tư không vào được.
  await teacherPage.getByRole("button", { name: "Khoá phòng" }).click();
  await expect(teacherPage.getByText("Phòng đang khoá nên bạn mới chưa vào được.")).toBeVisible();
  await enter(d, pin, "Muộn");
  await expect(d.getByRole("alert").filter({ hasText: "khoá phòng" })).toBeVisible();

  // Loại Châu: điện thoại của Châu báo rõ rồi về nhập PIN.
  await teacherPage.getByRole("button", { name: "Loại Châu khỏi phòng" }).click();
  await teacherPage.getByRole("button", { name: "Loại Châu?" }).click();
  await expect(teacherPage.getByRole("heading", { name: "Người chơi (2)" })).toBeVisible();
  await expect(heading(c, "Bạn đã rời phòng")).toBeVisible();

  await teacherPage.getByRole("button", { name: "Bắt đầu" }).click();

  // Câu 1 (một đáp án): An đúng, Bình sai.
  await expect(heading(a, "Thủ đô của Việt Nam là gì?")).toBeVisible();
  await expect(heading(b, "Thủ đô của Việt Nam là gì?")).toBeVisible();
  await tile(a, /Hà Nội/).click();
  await tile(b, /Huế/).click();
  await expect(teacherPage.getByText("2 / 2")).toBeVisible();
  await teacherPage.getByRole("button", { name: "Hiện đáp án" }).click();
  await expect(heading(a, "Đúng rồi!")).toBeVisible();
  await expect(heading(b, "Chưa đúng")).toBeVisible();

  // Câu 2 (đúng/sai): cả hai chọn Sai là đúng.
  await teacherPage.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(heading(a, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
  await tile(a, /Sai/).click();
  await tile(b, /Sai/).click();
  await expect(teacherPage.getByText("2 / 2")).toBeVisible();
  await teacherPage.getByRole("button", { name: "Hiện đáp án" }).click();
  await expect(heading(a, "Đúng rồi!")).toBeVisible();
  await expect(heading(b, "Đúng rồi!")).toBeVisible();

  // Câu 3 (nhiều đáp án): An tải lại trang trước khi gửi rồi chỉ chọn một ý (thiếu nên sai); Bình đúng.
  await teacherPage.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(heading(a, "Những số nào là số chẵn?")).toBeVisible();
  await a.reload();
  await expect(heading(a, "Những số nào là số chẵn?")).toBeVisible();
  await expect(a.getByText("Câu 3 / 4")).toBeVisible();
  await tile(a, { name: "A 2", exact: true }).click();
  await a.getByRole("button", { name: "Gửi đáp án" }).click();
  await tile(b, { name: "A 2", exact: true }).click();
  await tile(b, { name: "C 4", exact: true }).click();
  await b.getByRole("button", { name: "Gửi đáp án" }).click();
  await expect(teacherPage.getByText("2 / 2")).toBeVisible();
  await teacherPage.getByRole("button", { name: "Hiện đáp án" }).click();
  await expect(heading(a, "Chưa đúng")).toBeVisible();
  await expect(heading(b, "Đúng rồi!")).toBeVisible();

  // Câu 4 (điền từ): An đúng, Bình sai.
  await teacherPage.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(heading(a, "Con vật kêu meo meo là gì?")).toBeVisible();
  await a.getByLabel("Câu trả lời của bạn").fill("Mèo");
  await a.getByRole("button", { name: "Gửi đáp án" }).click();
  await b.getByLabel("Câu trả lời của bạn").fill("chó");
  await b.getByRole("button", { name: "Gửi đáp án" }).click();
  await expect(teacherPage.getByText("2 / 2")).toBeVisible();
  await teacherPage.getByRole("button", { name: "Hiện đáp án" }).click();
  await teacherPage.getByRole("button", { name: "Xem kết quả" }).click();

  // Hạng cuối khớp điểm tính tay: An 1000+1000+0+1000 = 3000, Bình 0+1000+1000+0 = 2000.
  const podium = teacherPage.getByRole("list", { name: "Top 3" });
  await expect(podium.getByRole("listitem").nth(0)).toContainText("An");
  await expect(podium.getByRole("listitem").nth(0)).toContainText("3000 điểm");
  await expect(podium.getByRole("listitem").nth(1)).toContainText("Bình");
  await expect(podium.getByRole("listitem").nth(1)).toContainText("2000 điểm");
  await expect(heading(a, "Kết thúc!")).toBeVisible();
  await expect(a.getByText(/hạng 1 trong 2 bạn với 3000 điểm/)).toBeVisible();
  await expect(heading(b, "Kết thúc!")).toBeVisible();
  await expect(b.getByText(/hạng 2 trong 2 bạn với 2000 điểm/)).toBeVisible();

  for (const page of [teacherPage, a, b, c, d]) await page.context().close();
});
