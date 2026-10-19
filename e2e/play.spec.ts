import { expect, test, type Page } from "@playwright/test";
import { cleanupLive, fourKinds, localConfig, newSession } from "./helpers/live";

// Cần stack Supabase cục bộ có Realtime: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

test.use({ viewport: { width: 375, height: 812 } });

test.afterAll(cleanupLive);

async function enter(page: Page, pin: string, nickname: string) {
  await page.goto(`/play?pin=${pin}`);
  await page.getByLabel("Biệt danh").fill(nickname);
  await page.getByRole("button", { name: "Vào phòng" }).click();
}

const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });
const tile = (page: Page, name: string | RegExp | { name: string; exact?: boolean }) =>
  page.getByRole("button", typeof name === "object" && !(name instanceof RegExp) ? name : { name });

test.describe("học sinh: vào phòng", () => {
  test("báo lỗi rõ khi thiếu thông tin, PIN sai, biệt danh trùng và phòng đã khoá", async ({ browser, page }) => {
    const { session } = await newSession();

    // Thiếu PIN và biệt danh: báo ngay ở máy khách, không gọi máy chủ.
    await page.goto("/play");
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(page.getByText("PIN gồm 6 chữ số")).toBeVisible();
    await expect(page.getByText("Bạn nhập một biệt danh nhé.")).toBeVisible();
    await expect(page.getByLabel("PIN của phòng")).toBeFocused();

    // PIN chỉ nhận chữ số, tối đa 6.
    await page.getByLabel("PIN của phòng").fill("12ab34");
    await expect(page.getByLabel("PIN của phòng")).toHaveValue("1234");
    await page.getByLabel("PIN của phòng").fill("1234567");
    await expect(page.getByLabel("PIN của phòng")).toHaveValue("123456");

    // PIN không có phòng nào.
    await page.getByLabel("PIN của phòng").fill("000000");
    await page.getByLabel("Biệt danh").fill("Hoa");
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(page.getByText("PIN chưa đúng hoặc phòng đã đóng")).toBeVisible();
    await expect(page.getByLabel("PIN của phòng")).toBeFocused();
    await expect(page.getByLabel("PIN của phòng")).toHaveAttribute("aria-invalid", "true");

    // Vào đúng, rồi người thứ hai dùng trùng biệt danh (không phân biệt hoa thường).
    await page.getByLabel("PIN của phòng").fill(session.pin);
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();

    const second = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
    await enter(second, session.pin, "HOA");
    await expect(second.getByText("Biệt danh này đã có bạn dùng")).toBeVisible();
    await expect(second.getByLabel("Biệt danh")).toBeFocused();

    // Giáo viên khoá phòng: người mới bị từ chối bằng lời nhắn rõ.
    await session.lock(true);
    await second.getByLabel("Biệt danh").fill("Lan");
    await second.getByRole("button", { name: "Vào phòng" }).click();
    await expect(second.getByRole("alert").filter({ hasText: "khoá phòng" })).toBeVisible();
    await second.context().close();
  });

  test("phòng chờ hiện tên và số người; tải lại trang vẫn vào lại đúng người chơi, không thêm người mới", async ({ page }) => {
    const { session } = await newSession();
    await enter(page, session.pin, "Minh Anh");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await expect(page.getByText("Minh Anh", { exact: true })).toBeVisible();
    await expect(page.getByText("Có 1 bạn trong phòng")).toBeVisible();

    await page.reload();
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await expect(page.getByText("Minh Anh", { exact: true })).toBeVisible();
    expect((await session.state()).players).toHaveLength(1);

    // Rời phòng thì quên mã tham gia và về lại màn nhập PIN.
    await page.getByRole("button", { name: "Rời phòng" }).click();
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
    await page.reload();
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
  });

  test("bị loại khỏi phòng thì báo rõ rồi về nhập PIN", async ({ page }) => {
    const { session } = await newSession();
    await enter(page, session.pin, "Quậy");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.remove("Quậy");
    await expect(heading(page, "Bạn đã rời phòng")).toBeVisible();
    await expect(page.getByText("Thầy cô đã mời bạn rời phòng. Bạn có thể nhập PIN")).toBeVisible();
    await page.getByRole("button", { name: "Nhập PIN" }).click();
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
  });

  test("rời phòng trả lại chỗ và biệt danh: vào lại bằng tên cũ, không để người chơi ma", async ({ page }) => {
    const { session } = await newSession();
    await enter(page, session.pin, "Mai");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await page.getByRole("button", { name: "Rời phòng" }).click();
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
    await expect.poll(async () => (await session.state()).players.length).toBe(0);

    await page.getByLabel("PIN của phòng").fill(session.pin);
    await page.getByLabel("Biệt danh").fill("Mai");
    await page.getByRole("button", { name: "Vào phòng" }).click();
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await expect(page.getByText("Có 1 bạn trong phòng")).toBeVisible();
    expect((await session.state()).players.map((p) => p.nickname)).toEqual(["Mai"]);
  });

  test("điền từ: tải lại giữa câu vẫn hiện chữ đã gửi", async ({ page }) => {
    const { session } = await newSession([fourKinds[3]]);
    await enter(page, session.pin, "Gõ chữ");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.open();
    await page.getByLabel("Câu trả lời của bạn").fill("con mèo");
    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await expect(page.getByLabel("Câu trả lời của bạn")).toHaveValue("con mèo");
    await expect(page.getByLabel("Câu trả lời của bạn")).toBeDisabled();
  });

  test("trình duyệt chặn lưu trữ: vẫn chơi được nhưng báo rõ, tải lại thì phải nhập lại PIN", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("bị chặn", "SecurityError");
        },
      });
    });
    const { session } = await newSession();
    await enter(page, session.pin, "Bị chặn");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await expect(page.getByText("Trình duyệt này chặn lưu trữ")).toBeVisible();
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();

    await page.reload();
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
  });

  test("tôn trọng giảm chuyển động: thanh đếm giờ không có chuyển tiếp", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { session } = await newSession();
    await enter(page, session.pin, "Ít chuyển động");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.open();
    await expect(page.getByRole("timer")).toBeVisible();
    const duration = await page.getByRole("timer").locator("div > div").evaluate((el) => getComputedStyle(el).transitionDuration);
    // Chromium báo thời lượng gần như bằng 0 ("1e-05s") khi bị tắt chuyển động.
    expect(parseFloat(duration)).toBeLessThan(0.001);
    const tileDuration = await tile(page, /Hà Nội/).evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(tileDuration)).toBeLessThan(0.001);
  });

  test("mã tham gia hết hiệu lực (phiên đã bị xoá) thì quay về nhập PIN kèm lời nhắn", async ({ page }) => {
    const { teacher, session } = await newSession();
    await enter(page, session.pin, "Mồ côi");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    // Xoá người dùng giáo viên kéo theo xoá phiên và người chơi.
    const service = (await import("@supabase/supabase-js")).createClient(localConfig().url, localConfig().serviceRoleKey);
    await service.auth.admin.deleteUser(teacher.id);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
    await expect(page.getByText("Mã tham gia không còn hiệu lực")).toBeVisible();
  });
});

test.describe("học sinh: chơi trọn một phiên", () => {
  test("đủ bốn dạng câu hỏi từ phòng chờ tới bục cuối, tải lại giữa chừng không mất người chơi", async ({ page }) => {
    const { session } = await newSession();
    await enter(page, session.pin, "Hoa");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();

    // Câu 1: một đáp án, chạm một lần là gửi.
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByRole("timer")).toContainText("Còn");
    await expect(page.getByText("Câu 1 / 4")).toBeVisible();
    await tile(page, /Hà Nội/).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await expect(tile(page, /Huế/)).toBeDisabled();
    await expect(tile(page, /Hà Nội/)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await session.state()).answered_count).toBe(1);

    // Tải lại giữa câu: vẫn là người chơi đó và vẫn biết đã gửi, không gửi lại được.
    await page.reload();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await expect(tile(page, /Huế/)).toBeDisabled();
    // Ô đã chọn vẫn được đánh dấu sau khi tải lại, để biết mình đã gửi gì.
    await expect(tile(page, /Hà Nội/)).toHaveAttribute("aria-pressed", "true");
    await expect(tile(page, /Huế/)).toHaveAttribute("aria-pressed", "false");
    expect((await session.state()).players).toHaveLength(1);

    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();
    await expect(page.getByText("+1000 điểm")).toBeVisible();
    await expect(page.getByText("Đáp án đúng, bạn chọn")).toBeVisible();
    await expect(page.getByRole("list", { name: "Bảng xếp hạng" })).toContainText("Hoa (bạn)");
    await expect(page.getByText("Chờ thầy cô sang câu tiếp theo…")).toBeVisible();

    // Câu 2: đúng/sai, chọn sai.
    await session.next();
    await expect(heading(page, "Mặt Trời quay quanh Trái Đất.")).toBeVisible();
    await tile(page, /Đúng/).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await session.close();
    await expect(heading(page, "Chưa đúng")).toBeVisible();
    await expect(page.getByText("Câu này bạn được 0 điểm")).toBeVisible();

    // Câu 3: nhiều đáp án, chọn nhiều rồi bấm Gửi.
    await session.next();
    await expect(heading(page, "Những số nào là số chẵn?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi đáp án" })).toBeDisabled();
    await tile(page, { name: "A 2", exact: true }).click();
    await tile(page, { name: "C 4", exact: true }).click();
    await expect(tile(page, { name: "A 2", exact: true })).toHaveAttribute("aria-pressed", "true");
    await tile(page, { name: "C 4", exact: true }).click(); // bỏ chọn
    await expect(tile(page, { name: "C 4", exact: true })).toHaveAttribute("aria-pressed", "false");
    await tile(page, { name: "C 4", exact: true }).click();
    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();

    // Câu 4: điền từ, bỏ qua hoa thường và khoảng trắng thừa.
    await session.next();
    await expect(heading(page, "Con vật kêu meo meo là gì?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi đáp án" })).toBeDisabled();
    await page.getByLabel("Câu trả lời của bạn").fill("  CON   MÈO ");
    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();
    await expect(page.getByText("Đáp án đúng: con mèo / mèo")).toBeVisible();

    // Hết câu: bục cuối.
    await session.next();
    await expect(heading(page, "Kết thúc!")).toBeVisible();
    await expect(page.getByText(/bạn đứng hạng 1 trong 1 bạn với 3000 điểm/)).toBeVisible();
    await expect(page.getByRole("list").filter({ hasText: "Hoa (bạn)" })).toBeVisible();
    await page.getByRole("button", { name: "Chơi phiên khác" }).click();
    await expect(heading(page, "Vào phòng chơi")).toBeVisible();
  });

  test("không trả lời khi hết giờ thì khoá ô đáp án và báo chưa trả lời", async ({ page }) => {
    const { session } = await newSession([fourKinds[0]]);
    await enter(page, session.pin, "Chậm chân");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.setTimeLimit(2);
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect(page.getByText("Hết giờ. Chờ kết quả…")).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("timer")).toContainText("Hết giờ");
    await expect(tile(page, /Hà Nội/)).toBeDisabled();
    await session.close();
    await expect(heading(page, "Bạn chưa trả lời")).toBeVisible();
  });

  test("gửi lỗi do mất mạng thì giữ nguyên lựa chọn và gửi lại được; máy chủ đã nhận thì không tính hai lần", async ({ page }) => {
    const { session } = await newSession([fourKinds[0]]);
    await enter(page, session.pin, "Mạng yếu");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();

    // Máy chủ nhận được nhưng phản hồi bị mất: người chơi thấy lỗi, lựa chọn còn nguyên.
    let calls = 0;
    await page.route("**/rest/v1/rpc/submit_answer", async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fetch();
        await route.abort("failed");
      } else {
        await route.continue();
      }
    });
    await tile(page, /Huế/).click();
    await expect(page.getByRole("alert").filter({ hasText: "Mất kết nối" })).toBeVisible();
    await expect(tile(page, /Huế/)).toHaveAttribute("aria-pressed", "true");
    await expect(tile(page, /Huế/)).toBeEnabled();

    // Gửi lại: máy chủ báo đã có câu trả lời, giao diện coi như đã gửi (không gửi hai lần).
    await tile(page, /Huế/).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await expect(tile(page, /Huế/)).toBeDisabled();
    expect((await session.state()).answered_count).toBe(1);
    expect(calls).toBe(2);

    await session.close();
    await expect(heading(page, "Chưa đúng")).toBeVisible(); // đáp án Huế sai: chỉ tính lần gửi đầu
  });

  test("câu nhiều đáp án: gửi lỗi giữ nguyên các ô đã chọn", async ({ page }) => {
    const { session } = await newSession([fourKinds[2]]);
    await enter(page, session.pin, "Chọn nhiều");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.open();
    await expect(heading(page, "Những số nào là số chẵn?")).toBeVisible();
    await tile(page, { name: "A 2", exact: true }).click();
    await tile(page, { name: "C 4", exact: true }).click();

    let calls = 0;
    await page.route("**/rest/v1/rpc/submit_answer", async (route) => {
      calls += 1;
      if (calls === 1) await route.abort("failed");
      else await route.continue();
    });
    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Mất kết nối" })).toBeVisible();
    await expect(tile(page, { name: "A 2", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(tile(page, { name: "C 4", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Gửi đáp án" }).click();
    await expect(page.getByText("Đã gửi đáp án. Chờ cả lớp…")).toBeVisible();
    await session.close();
    await expect(heading(page, "Đúng rồi!")).toBeVisible();
  });

  test("mất kết nối thì báo 'đang thử lại' rồi tự phục hồi", async ({ page }) => {
    const { session } = await newSession();
    await enter(page, session.pin, "Rớt mạng");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();

    await page.route("**/rest/v1/rpc/player_state", (route) => route.abort("failed"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("status").filter({ hasText: "Mất kết nối. Đang thử lại" })).toBeVisible();

    await page.unroute("**/rest/v1/rpc/player_state");
    await page.waitForTimeout(600);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByText("Mất kết nối. Đang thử lại")).toHaveCount(0);

    // Sau khi phục hồi vẫn theo kịp phiên.
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
  });
});

test.describe("học sinh: không lộ đáp án, không chứa khoá bí mật", () => {
  test("phản hồi trong lúc câu đang mở không có đáp án đúng; chỉ sau khi đóng mới có", async ({ page }) => {
    const { session } = await newSession();
    const bodies: { phase: string; body: string }[] = [];
    page.on("response", async (response) => {
      if (!response.url().includes("/rpc/player_state")) return;
      try {
        const text = await response.text();
        bodies.push({ phase: (JSON.parse(text) as { phase: string }).phase, body: text });
      } catch {
        // phản hồi bị huỷ khi đóng trang
      }
    });
    await enter(page, session.pin, "Dò đáp án");
    await expect(heading(page, "Bạn đã vào phòng")).toBeVisible();
    await session.open();
    await expect(heading(page, "Thủ đô của Việt Nam là gì?")).toBeVisible();
    await expect.poll(() => bodies.filter((b) => b.phase === "question").length).toBeGreaterThan(0);
    for (const { body } of bodies.filter((b) => b.phase !== "reveal" && b.phase !== "ended")) {
      expect(body).not.toMatch(/is_correct|"correct"|"key"|accepted_answers|ignore_diacritics/);
    }
    await session.close();
    await expect(heading(page, "Chưa đúng").or(heading(page, "Bạn chưa trả lời"))).toBeVisible();
    expect(bodies.some((b) => b.phase === "reveal" && b.body.includes('"correct"'))).toBe(true);
  });

  test("gói JavaScript của trang chơi không chứa khoá service_role", async ({ request }) => {
    const html = await (await request.get("/play")).text();
    const scripts = [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]);
    expect(scripts.length).toBeGreaterThan(0);
    const { serviceRoleKey } = localConfig();
    for (const script of new Set(scripts)) {
      const code = await (await request.get(script)).text();
      expect(code, script).not.toContain(serviceRoleKey);
      expect(code, script).not.toContain("service_role");
    }
  });
});
