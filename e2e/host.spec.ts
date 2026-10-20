import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";
import {
  cleanupLive,
  fourKinds,
  joinPlayer,
  loginAs,
  newQuiz,
  newTeacher,
  startSession,
  type QuestionSpec,
} from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.use({ viewport: { width: 1280, height: 800 } });
test.afterAll(cleanupLive);

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

/** Giáo viên đã đăng nhập, có một quiz đủ bốn dạng và đang ở trang Quiz của tôi. */
async function teacherWithQuiz(page: Page, questions: QuestionSpec[] = fourKinds, title = "Quiz kiểm thử") {
  const teacher = await newTeacher("host-e2e");
  const quizId = await newQuiz(teacher, questions, title);
  await loginAs(page, teacher);
  return { teacher, quizId };
}

/** Bắt đầu phiên từ giao diện: bấm Chơi ngay rồi Bắt đầu phiên, trả về PIN. */
async function startFromUi(page: Page, title = "Quiz kiểm thử") {
  const item = page.getByRole("listitem").filter({ hasText: title });
  await item.getByRole("button", { name: "Chơi ngay" }).click();
  // Tắt điểm tốc độ để điểm mỗi câu đúng bằng 1000 và tính tay được.
  await page.getByLabel(/Tính thêm điểm theo tốc độ/).uncheck();
  await page.getByRole("button", { name: "Bắt đầu phiên" }).click();
  await expect(page).toHaveURL(/\/host\/[0-9a-f-]{36}$/);
  await expect(heading(page, /Phòng chờ/)).toBeVisible();
  const pin = (await page.getByLabel(/^PIN:/).textContent())?.trim() ?? "";
  expect(pin).toMatch(/^\d{6}$/);
  return pin;
}

test.describe("giáo viên: bắt đầu phiên", () => {
  test("quiz còn lỗi bị chặn và nêu lý do; sửa xong mới bắt đầu được", async ({ page }) => {
    await teacherWithQuiz(
      page,
      [{ kind: "single", prompt: "Câu chưa chọn đáp án", options: [{ label: "A" }, { label: "B" }] }],
      "Quiz thiếu đáp án",
    );
    const item = page.getByRole("listitem").filter({ hasText: "Quiz thiếu đáp án" });
    await item.getByRole("button", { name: "Chơi ngay" }).click();
    await expect(page.getByText("Quiz chưa chơi được.")).toBeVisible();
    await expect(page.getByText("Câu 1: cần chọn đúng một đáp án đúng.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu phiên" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sửa quiz" })).toBeVisible();
  });

  test("bắt đầu phiên chuyển tới màn hình điều khiển; phiên thứ hai bị chặn kèm đường dẫn tiếp tục", async ({ page }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);
    const hostUrl = page.url();

    await page.goto("/my-quizzes");
    const item = page.getByRole("listitem").filter({ hasText: "Quiz kiểm thử" });
    await item.getByRole("button", { name: "Chơi ngay" }).click();
    await expect(page.getByText(`PIN ${pin}`)).toBeVisible();
    await expect(page.getByText("Mỗi lần chỉ chạy được một phiên")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu phiên" })).toHaveCount(0);

    await page.getByRole("button", { name: "Tiếp tục phiên đang chạy" }).click();
    await expect(page).toHaveURL(hostUrl);
    await expect(heading(page, /Phòng chờ/)).toBeVisible();

    // Kết thúc phiên cũ (có xác nhận) thì bắt đầu phiên mới được.
    await page.goto("/my-quizzes");
    await item.getByRole("button", { name: "Chơi ngay" }).click();
    await page.getByRole("button", { name: "Kết thúc phiên cũ" }).click();
    await expect(page.getByRole("group", { name: "Xác nhận kết thúc phiên cũ" })).toBeVisible();
    await page.getByRole("button", { name: "Giữ phiên" }).click();
    await expect(page.getByRole("button", { name: "Tiếp tục phiên đang chạy" })).toBeVisible();
    await page.getByRole("button", { name: "Kết thúc phiên cũ" }).click();
    await page.getByRole("group", { name: "Xác nhận kết thúc phiên cũ" }).getByRole("button", { name: "Kết thúc phiên cũ" }).click();
    await expect(page.getByRole("button", { name: "Bắt đầu phiên" })).toBeVisible();
  });

  test("trình soạn quiz cũng có nút Chơi ngay và tuỳ chọn điểm tốc độ", async ({ page }) => {
    const { quizId } = await teacherWithQuiz(page);
    await page.goto(`/my-quizzes/${quizId}`);
    await page.getByRole("button", { name: "Chơi ngay" }).click();
    const speed = page.getByLabel(/Tính thêm điểm theo tốc độ/);
    await expect(speed).toBeChecked();
    await speed.uncheck();
    await page.getByRole("button", { name: "Bắt đầu phiên" }).click();
    await expect(page).toHaveURL(/\/host\/[0-9a-f-]{36}$/);
  });
});

test.describe("giáo viên: mã QR vào phòng", () => {
  test("phòng chờ có mã QR trỏ đúng tới /play?pin=<PIN>; mở địa chỉ đó thì ô PIN đã điền", async ({ page, browser }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);

    const qr = page.getByRole("img", { name: "Mã QR vào phòng" });
    await expect(qr).toBeVisible();
    const value = await qr.getAttribute("data-value");
    expect(value).toBe(`${new URL(page.url()).origin}/play?pin=${pin}`);
    // Mô tả đọc được cho trình đọc màn hình, kèm địa chỉ đích.
    await expect(qr.locator("desc")).toHaveText(`Quét để mở ${value}`);
    // Nền QR luôn sáng và mô-đun tối, kể cả khi giao diện tối.
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await qr.locator("rect").getAttribute("fill")).toBe("#fff");
    expect(await qr.locator("path").getAttribute("fill")).toBe("#000");

    // Quét thật: vẽ đúng SVG đang hiển thị ra điểm ảnh rồi giải mã (kiểm cả đường vẽ, không chỉ ma trận).
    const pixels = await qr.evaluate(async (svg) => {
      const size = 330;
      const clone = svg.cloneNode(true) as SVGElement;
      clone.setAttribute("width", String(size));
      clone.setAttribute("height", String(size));
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, size, size);
      return { size, data: Array.from(context.getImageData(0, 0, size, size).data) };
    });
    expect(jsQR(Uint8ClampedArray.from(pixels.data), pixels.size, pixels.size)?.data).toBe(value);

    // Học sinh quét QR = mở đúng địa chỉ đó: ô PIN đã có sẵn, chỉ còn chọn biệt danh.
    const phone = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await phone.goto(value as string);
    await expect(phone.getByLabel(/PIN/)).toHaveValue(pin);
    await phone.close();
  });
});

test.describe("giáo viên: điều khiển và chiếu", () => {
  test("chạy trọn phiên: phòng chờ, khoá phòng, loại người chơi, bốn dạng câu, hạng cuối khớp điểm tính tay", async ({ page }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);

    // Phòng chờ: PIN cỡ lớn, địa chỉ vào phòng và danh sách cập nhật khi có người vào.
    await expect(page.getByText("/play", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Chưa có bạn nào vào phòng")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu" })).toBeDisabled();
    const lan = await joinPlayer(pin, "Lan");
    const huy = await joinPlayer(pin, "Huy");
    await joinPlayer(pin, "Quậy");
    await expect(page.getByRole("heading", { name: "Người chơi (3)" })).toBeVisible();

    // Khoá phòng: người mới không vào được.
    await page.getByRole("button", { name: "Khoá phòng" }).click();
    await expect(page.getByText("Phòng đang khoá nên bạn mới chưa vào được.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mở khoá phòng" })).toHaveAttribute("aria-pressed", "true");
    await expect(joinPlayer(pin, "Muộn")).rejects.toThrow(/room_locked/);

    // Loại một người (có xác nhận).
    await page.getByRole("button", { name: "Loại Quậy khỏi phòng" }).click();
    await page.getByRole("button", { name: "Giữ" }).click();
    await expect(page.getByRole("heading", { name: "Người chơi (3)" })).toBeVisible();
    await page.getByRole("button", { name: "Loại Quậy khỏi phòng" }).click();
    await page.getByRole("button", { name: "Loại Quậy?" }).click();
    await expect(page.getByRole("heading", { name: "Người chơi (2)" })).toBeVisible();

    // Câu 1 (một đáp án): Lan đúng, Huy sai. Đề cỡ lớn, đếm giờ, số người đã trả lời.
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByRole("timer")).toContainText("Còn");
    await expect(page.getByText("0 / 2")).toBeVisible();
    await lan.answer(0);
    await huy.answer(1);
    await expect(page.getByText("2 / 2")).toBeVisible();
    // Trong lúc câu mở, màn chiếu không đánh dấu đáp án đúng.
    await expect(page.getByText(/Đáp án đúng/)).toHaveCount(0);
    await page.getByRole("button", { name: "Hiện đáp án" }).click();
    await expect(page.getByText(/Đáp án đúng/).first()).toBeVisible();
    await expect(page.getByText("1 bạn chọn").first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Bảng xếp hạng" })).toContainText("Lan");

    // Câu 2 (đúng/sai): cả hai đúng. Dùng phím Space để sang câu và để hiện đáp án.
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();
    await expect(heading(page, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
    await lan.answer(1);
    await huy.answer(1);
    // Người thật không nhấn Space ngay lúc câu vừa mở: chờ qua khoảng chống bấm lặp (1,2 giây).
    await page.waitForTimeout(1300);
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();

    // Câu 3 (nhiều đáp án): Lan thiếu một ý nên sai, Huy đúng.
    await page.waitForTimeout(1300);
    await page.keyboard.press("Space");
    await expect(heading(page, "Những số nào là số chẵn?")).toBeVisible();
    await lan.answer([0]);
    await huy.answer([2, 0]);
    await page.getByRole("button", { name: "Hiện đáp án" }).click();
    await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();

    // Câu 4 (điền từ): Lan đúng, Huy sai.
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();
    await expect(heading(page, "Con vật kêu meo meo là gì?")).toBeVisible();
    await lan.answer("Mèo");
    await huy.answer("chó");
    await page.getByRole("button", { name: "Hiện đáp án" }).click();
    await expect(page.getByText("con mèo / mèo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Xem kết quả" })).toBeVisible();

    // Bục cuối: Lan 1000+1000+0+1000 = 3000, Huy 0+1000+1000+0 = 2000.
    await page.getByRole("button", { name: "Xem kết quả" }).click();
    await expect(heading(page, /Kết thúc/)).toBeVisible();
    const podium = page.getByRole("list", { name: "Top 3" });
    await expect(podium.getByRole("listitem").nth(0)).toContainText("#1");
    await expect(podium.getByRole("listitem").nth(0)).toContainText("Lan");
    await expect(podium.getByRole("listitem").nth(0)).toContainText("3000 điểm");
    await expect(podium.getByRole("listitem").nth(1)).toContainText("#2");
    await expect(podium.getByRole("listitem").nth(1)).toContainText("Huy");
    await expect(podium.getByRole("listitem").nth(1)).toContainText("2000 điểm");
    await expect(page.getByRole("link", { name: "Về Quiz của tôi" })).toBeVisible();
  });

  test("hết giờ thì tự đóng câu và hiện đáp án", async ({ page }) => {
    await teacherWithQuiz(page, [fourKinds[0]]);
    const pin = await startFromUi(page);
    await joinPlayer(pin, "Chậm");
    // Đặt 3 giây bằng service_role rồi bắt đầu.
    const { createClient } = await import("@supabase/supabase-js");
    const { localConfig } = await import("./helpers/live");
    const service = createClient(localConfig().url, localConfig().serviceRoleKey);
    const sessionId = page.url().split("/").pop()!;
    const row = await service.from("live_sessions").select("quiz_snapshot").eq("id", sessionId).single();
    const snapshot = (row.data as { quiz_snapshot: { questions: { time_limit_seconds: number }[] } }).quiz_snapshot;
    for (const q of snapshot.questions) q.time_limit_seconds = 3;
    await service.from("live_sessions").update({ quiz_snapshot: snapshot }).eq("id", sessionId);

    await expect(page.getByRole("heading", { name: "Người chơi (1)" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Câu tiếp theo" }).or(page.getByRole("button", { name: "Xem kết quả" }))).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Chưa trả lời")).toBeVisible();
  });

  test("tải lại trang giữa câu phục hồi đúng trạng thái và số người đã trả lời", async ({ page }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);
    const an = await joinPlayer(pin, "An");
    await joinPlayer(pin, "Bình");
    await expect(page.getByRole("heading", { name: "Người chơi (2)" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await an.answer(0);
    await expect(page.getByText("1 / 2")).toBeVisible();

    await page.reload();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByText("1 / 2")).toBeVisible();
    await expect(page.getByRole("timer")).toContainText("Còn");
  });

  test("kết thúc phiên có xác nhận; sau đó hiện kết quả thay vì điều khiển", async ({ page }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);
    await joinPlayer(pin, "Mai");
    await page.getByRole("button", { name: "Kết thúc phiên" }).click();
    const confirm = page.getByRole("group", { name: "Xác nhận kết thúc phiên" });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Giữ phiên" })).toBeFocused();
    await confirm.getByRole("button", { name: "Giữ phiên" }).click();
    await expect(heading(page, /Phòng chờ/)).toBeVisible();

    await page.getByRole("button", { name: "Kết thúc phiên" }).click();
    await page.getByRole("group", { name: "Xác nhận kết thúc phiên" }).getByRole("button", { name: "Kết thúc phiên" }).click();
    await expect(heading(page, /Kết thúc/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Kết thúc phiên" })).toHaveCount(0);

    // Tải lại phiên đã kết thúc vẫn hiện kết quả.
    await page.reload();
    await expect(heading(page, /Kết thúc/)).toBeVisible();
  });

  test("người không phải chủ phiên thấy 'Không tìm thấy'; khách bị chuyển tới đăng nhập", async ({ page, browser }) => {
    const owner = await newTeacher("host-owner");
    const session = await startSession(owner, await newQuiz(owner));
    const stranger = await newTeacher("host-stranger");
    await loginAs(page, stranger);
    await page.goto(`/host/${session.id}`);
    await expect(heading(page, "Không tìm thấy phiên chơi này")).toBeVisible();
    await expect(page.getByText(session.pin)).toHaveCount(0);

    const guest = await (await browser.newContext()).newPage();
    await guest.goto(`/host/${session.id}`);
    await expect(guest).toHaveURL(/\/login\?next=/);
    await guest.context().close();

    await page.goto("/host/khong-phai-uuid");
    await expect(heading(page, "Không tìm thấy phiên chơi này")).toBeVisible();
  });

  test("nhấn Space liên tiếp sau khi đổi pha không đóng luôn câu vừa mở; sau khoảng chờ thì Space dùng lại được", async ({ page }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);
    await joinPlayer(pin, "Một bạn");
    await expect(page.getByRole("heading", { name: "Người chơi (1)" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await page.getByRole("button", { name: "Hiện đáp án" }).click();
    await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();

    await page.locator("body").click({ position: { x: 5, y: 400 } });
    await page.waitForTimeout(1300);
    await page.keyboard.press("Space");
    await expect(heading(page, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
    // Bấm đúp hay bộ điều khiển từ xa gửi lặp ngay sau đó: bị bỏ qua, câu 2 vẫn mở.
    await page.waitForTimeout(500);
    await page.keyboard.press("Space");
    await page.waitForTimeout(1000);
    await expect(heading(page, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Hiện đáp án" })).toBeVisible();

    // Hết thời gian chờ: Space hiện đáp án như bình thường.
    await page.waitForTimeout(800);
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Câu tiếp theo" })).toBeVisible();
  });

  test("tự đóng câu gặp lỗi mạng thì báo lỗi rồi thử lại tới khi đóng được", async ({ page }) => {
    await teacherWithQuiz(page, [fourKinds[0]]);
    const pin = await startFromUi(page);
    await joinPlayer(pin, "Chậm");
    const { createClient } = await import("@supabase/supabase-js");
    const { localConfig } = await import("./helpers/live");
    const service = createClient(localConfig().url, localConfig().serviceRoleKey);
    const sessionId = page.url().split("/").pop()!;
    const row = await service.from("live_sessions").select("quiz_snapshot").eq("id", sessionId).single();
    const snapshot = (row.data as { quiz_snapshot: { questions: { time_limit_seconds: number }[] } }).quiz_snapshot;
    for (const q of snapshot.questions) q.time_limit_seconds = 3;
    await service.from("live_sessions").update({ quiz_snapshot: snapshot }).eq("id", sessionId);

    await page.route("**/rest/v1/rpc/host_close_if_expired", (route) => route.abort("failed"));
    await expect(page.getByRole("heading", { name: "Người chơi (1)" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Mất kết nối" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Hết giờ, đang chốt đáp án…")).toBeVisible();

    await page.unroute("**/rest/v1/rpc/host_close_if_expired");
    await expect(page.getByRole("button", { name: "Xem kết quả" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("alert").filter({ hasText: "Mất kết nối" })).toHaveCount(0);
  });

  test("kết thúc phiên cũ từ danh sách quiz báo ngay cho học sinh", async ({ page, browser }) => {
    await teacherWithQuiz(page);
    const pin = await startFromUi(page);
    const phone = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
    await phone.goto(`/play?pin=${pin}`);
    await phone.getByLabel("Biệt danh").fill("Chờ trong phòng");
    await phone.getByRole("button", { name: "Vào phòng" }).click();
    await expect(heading(phone, "Bạn đã vào phòng")).toBeVisible();

    await page.goto("/my-quizzes");
    await page.getByRole("listitem").filter({ hasText: "Quiz kiểm thử" }).getByRole("button", { name: "Chơi ngay" }).click();
    await page.getByRole("button", { name: "Kết thúc phiên cũ" }).click();
    await page.getByRole("group", { name: "Xác nhận kết thúc phiên cũ" }).getByRole("button", { name: "Kết thúc phiên cũ" }).click();
    await expect(page.getByRole("button", { name: "Bắt đầu phiên" })).toBeVisible();
    // Tin báo tới ngay (polling của học sinh khi kênh sống là 10 giây, dài hơn hạn chờ này).
    await expect(heading(phone, "Kết thúc!")).toBeVisible({ timeout: 4000 });
    await phone.context().close();
  });

  test("chiếu toàn màn hình vào và thoát được; mất kết nối thì báo rồi tự phục hồi", async ({ page }) => {
    await teacherWithQuiz(page);
    await startFromUi(page);

    await page.getByRole("button", { name: "Toàn màn hình" }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await expect(heading(page, /Phòng chờ/)).toBeVisible();
    await page.getByRole("button", { name: "Thoát toàn màn hình" }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);

    await page.route("**/rest/v1/rpc/host_state", (route) => route.abort("failed"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("status").filter({ hasText: "Mất kết nối. Đang thử lại" })).toBeVisible();
    await page.unroute("**/rest/v1/rpc/host_state");
    await page.waitForTimeout(600);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByText("Mất kết nối. Đang thử lại")).toHaveCount(0);
  });
});

