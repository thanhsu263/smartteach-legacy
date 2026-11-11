import { expect, test, type Page } from "@playwright/test";
import { tools } from "../src/data/tools";

const START = new Date("2026-01-01T08:00:00");

async function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

// Next.js cũng có một vùng role="alert" để đọc tên trang; các lời báo lỗi của tiện ích là thẻ <p>.

/** Nút toàn màn hình chỉ xuất hiện sau khi trang hydrate, nên dùng làm tín hiệu sẵn sàng. */
async function waitForHydration(page: Page) {
  await expect(page.getByRole("button", { name: "Toàn màn hình" })).toBeVisible();
}

for (const viewport of [
  { name: "điện thoại hẹp 320px", width: 320, height: 640 },
  { name: "điện thoại 375px", width: 375, height: 812 },
  { name: "máy tính bảng 768px", width: 768, height: 900 },
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "màn hình rộng 1440px", width: 1440, height: 900 },
] as const) {
  test.describe(`tiện ích ở ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("trang liệt kê đủ tiện ích và không cuộn ngang", async ({ page }) => {
      await page.goto("/tools");
      await expect(page.getByRole("heading", { level: 1, name: "Tiện ích lớp học" })).toBeVisible();
      for (const tool of tools) {
        await expect(page.getByRole("link", { name: tool.title })).toBeVisible();
      }
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    for (const tool of tools) {
      test(`${tool.title} mở được khi chưa đăng nhập và không cuộn ngang`, async ({ page }) => {
        await page.goto("/tools");
        await page.getByRole("link", { name: tool.title }).click();
        await expect(page).toHaveURL(new RegExp(`${tool.href}$`));
        await expect(page.getByRole("heading", { level: 1, name: tool.title })).toBeVisible();
        await waitForHydration(page);
        expect(await hasHorizontalScroll(page)).toBe(false);
      });
    }
  });
}

test.describe("điều hướng tới tiện ích", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("từ trang chủ tới từng tiện ích trong 1 lần bấm", async ({ page }) => {
    for (const tool of tools) {
      await page.goto("/");
      await page.getByRole("link", { name: tool.title }).click();
      await expect(page).toHaveURL(new RegExp(`${tool.href}$`));
    }
  });
});

test.describe("tìm tiện ích", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("tìm không dấu, báo số kết quả và khôi phục danh sách", async ({ page }) => {
    await page.goto("/tools");
    const search = page.getByLabel("Tìm tiện ích");
    await search.fill("boc tham");
    await expect(page.getByRole("link", { name: "Bốc thăm tên" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đồng hồ đếm ngược" })).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Có 1 công cụ khớp");

    await search.fill("khong co cong cu");
    await expect(page.getByRole("heading", { name: "Không tìm thấy tiện ích phù hợp" })).toBeVisible();
    await page.getByRole("button", { name: "Xem tất cả tiện ích" }).click();
    await expect(page.getByRole("status")).toHaveText(`Có ${tools.length} công cụ`);
  });
});

test.describe("đồng hồ đếm ngược", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("đếm ngược, tạm dừng và chạy tiếp", async ({ page }) => {
    await page.clock.install({ time: START });
    await page.goto("/tools/countdown");
    await waitForHydration(page);
    await page.clock.pauseAt(new Date(START.getTime() + 10_000));

    const time = page.getByRole("timer", { name: "Thời gian còn lại" });
    await expect(time).toHaveText("05:00");

    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await page.clock.runFor(5_000);
    await expect(time).toHaveText("04:55");

    await page.getByRole("button", { name: "Tạm dừng" }).click();
    await page.clock.runFor(10_000);
    await expect(time).toHaveText("04:55");

    await page.getByRole("button", { name: "Chạy tiếp" }).click();
    await page.clock.runFor(5_000);
    await expect(time).toHaveText("04:50");

    await page.getByRole("button", { name: "Đặt lại" }).click();
    await expect(time).toHaveText("05:00");
  });

  test("chọn sẵn 1 phút và nhập tay, hết giờ thì báo bằng chữ", async ({ page }) => {
    await page.clock.install({ time: START });
    await page.goto("/tools/countdown");
    await waitForHydration(page);
    await page.clock.pauseAt(new Date(START.getTime() + 10_000));

    await page.getByRole("button", { name: "1 phút" }).click();
    await expect(page.getByRole("timer")).toHaveText("01:00");

    await page.getByLabel("Phút").fill("0");
    await page.getByLabel("Giây").fill("3");
    await expect(page.getByRole("timer")).toHaveText("00:03");

    await page.getByRole("button", { name: "Bắt đầu" }).click();
    await page.clock.runFor(3_500);
    await expect(page.getByRole("status")).toHaveText("Hết giờ!");
    await expect(page.getByRole("timer")).toHaveText("00:00");
  });

  test("thời gian không hợp lệ thì báo lỗi và không cho bắt đầu", async ({ page }) => {
    await page.goto("/tools/countdown");
    await waitForHydration(page);
    await page.getByLabel("Phút").fill("0");
    await page.getByLabel("Giây").fill("0");
    await expect(page.locator("p[role='alert']")).toContainText("tổng lớn hơn 0");
    await expect(page.getByRole("button", { name: "Bắt đầu" })).toBeDisabled();
  });

  test("chiếu toàn màn hình và thoát", async ({ page }) => {
    await page.goto("/tools/countdown");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Toàn màn hình" }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await page.getByRole("button", { name: "Thoát toàn màn hình" }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  });
});

test.describe("đồng hồ đếm ngược trên tablet", () => {
  test.use({ viewport: { width: 768, height: 800 } });

  test("không tràn ngang khi sidebar còn hiển thị", async ({ page }) => {
    await page.goto("/tools/countdown");
    await waitForHydration(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});

test.describe("bốc thăm tên", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("không bốc lại người đã bốc, bốc hết thì dừng, tắt tuỳ chọn thì bốc tiếp được", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/tools/draw");
    await waitForHydration(page);

    const draw = page.getByRole("button", { name: "Bốc thăm" });
    await expect(draw).toBeDisabled();

    await page.getByLabel("Danh sách tên").fill("An\n\nBình\n  Chi  \n");
    await expect(page.getByText("3 tên")).toBeVisible();
    await expect(page.getByText("Còn 3 / 3 bạn")).toBeVisible();

    const picked: string[] = [];
    for (let round = 0; round < 3; round += 1) {
      await draw.click();
      const status = page.getByRole("status");
      await expect(status).toContainText("Đã bốc:");
      picked.push((await status.textContent())!.replace("Đã bốc: ", "").trim());
    }
    expect([...picked].sort()).toEqual(["An", "Bình", "Chi"]);

    await expect(page.getByText("Đã bốc hết cả lớp")).toBeVisible();
    await expect(draw).toBeDisabled();

    await page.getByLabel("Không bốc lại người đã bốc").uncheck();
    await expect(draw).toBeEnabled();

    await page.getByRole("button", { name: "Bốc lại từ đầu" }).click();
    await expect(page.getByRole("heading", { name: "Đã bốc" })).toHaveCount(0);
  });

  test("bật lại 'Không bốc lại' sau nhiều lượt bốc lặp thì chỉ tính người khác nhau", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/tools/draw");
    await waitForHydration(page);
    // Bộ sinh số cố định để mọi lượt bốc đều rơi vào bạn đầu tiên.
    await page.evaluate(() => {
      Math.random = () => 0;
    });

    const draw = page.getByRole("button", { name: "Bốc thăm" });
    await page.getByLabel("Danh sách tên").fill("An\nBình");
    const noRepeat = page.getByLabel("Không bốc lại người đã bốc");
    await noRepeat.uncheck();
    for (let round = 0; round < 4; round += 1) await draw.click();

    await noRepeat.check();
    // Mới chỉ có An được bốc (4 lần), nên còn 1 bạn và nút vẫn dùng được.
    await expect(page.getByText("Còn 1 / 2 bạn")).toBeVisible();
    await expect(page.getByText("Đã bốc hết cả lớp")).toHaveCount(0);
    await expect(draw).toBeEnabled();

    await draw.click();
    await expect(page.getByRole("status")).toHaveText("Đã bốc: Bình");
    await expect(page.getByText("Còn 0 / 2 bạn")).toBeVisible();
    await expect(draw).toBeDisabled();
  });

  test("hiệu ứng quay tên (mặc định) chạy rồi dừng ở một bạn, nút khoá trong lúc quay", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/tools/draw");
    await waitForHydration(page);
    await page.getByLabel("Danh sách tên").fill("An\nBình\nChi");

    const draw = page.getByRole("button", { name: "Bốc thăm" });
    await draw.click();
    await expect(draw).toBeDisabled();
    await expect(page.getByRole("status")).toHaveText("");

    await expect(page.getByRole("status")).toContainText("Đã bốc:", { timeout: 4000 });
    await expect(draw).toBeEnabled();
    await expect(page.getByText("Còn 2 / 3 bạn")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Đã bốc" })).toBeVisible();
  });

  test("sửa danh sách thì kết quả đã bốc được làm mới", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/tools/draw");
    await waitForHydration(page);
    await page.getByLabel("Danh sách tên").fill("An\nBình");
    await page.getByRole("button", { name: "Bốc thăm" }).click();
    await expect(page.getByRole("heading", { name: "Đã bốc" })).toBeVisible();
    await page.getByLabel("Danh sách tên").fill("An\nBình\nChi");
    await expect(page.getByRole("heading", { name: "Đã bốc" })).toHaveCount(0);
    await expect(page.getByText("Còn 3 / 3 bạn")).toBeVisible();
  });
});

test.describe("chia nhóm", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  const names = "An\nBình\nChi\nDũng\nEm\nGiang\nHà";

  test("chia theo số nhóm, đủ người và chênh nhau tối đa 1", async ({ page }) => {
    await page.goto("/tools/groups");
    await waitForHydration(page);
    await page.getByLabel("Danh sách tên").fill(names);
    await page.getByLabel("Số nhóm", { exact: true }).fill("3");
    await page.getByRole("button", { name: "Chia nhóm" }).click();

    await expect(page.getByRole("status")).toHaveText("Đã chia 7 bạn thành 3 nhóm");
    const titles = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(titles).toHaveLength(3);
    const sizes = titles.map((title) => Number(/\((\d+) bạn\)/.exec(title)![1]));
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(7);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Chia lại" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(3);
  });

  test("chia theo số người mỗi nhóm", async ({ page }) => {
    await page.goto("/tools/groups");
    await waitForHydration(page);
    await page.getByLabel("Danh sách tên").fill(names);
    await page.getByLabel("Theo số người mỗi nhóm").check();
    await page.getByLabel("Số người mỗi nhóm", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.getByRole("status")).toHaveText("Đã chia 7 bạn thành 4 nhóm");
  });

  test("báo lỗi rõ ràng khi đầu vào sai", async ({ page }) => {
    await page.goto("/tools/groups");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.locator("p[role='alert']")).toContainText("nhập danh sách tên");

    await page.getByLabel("Danh sách tên").fill("An\nBình");
    await page.getByLabel("Số nhóm", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.locator("p[role='alert']")).toContainText("Số nhóm nhiều hơn số người");

    await page.getByLabel("Số nhóm", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.locator("p[role='alert']")).toContainText("số nguyên từ 1");
  });
});

test.describe("bảng trắng", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  async function inkedPixels(page: Page) {
    return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d")!;
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let index = 3; index < data.length; index += 4) if (data[index] > 0) count += 1;
      return count;
    });
  }

  async function stroke(page: Page, from: [number, number], to: [number, number]) {
    const box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.move(box.x + from[0], box.y + from[1]);
    await page.mouse.down();
    await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 });
    await page.mouse.up();
  }

  test("vẽ được, tẩy được và xoá tất cả", async ({ page }) => {
    await page.goto("/tools/whiteboard");
    await waitForHydration(page);
    expect(await inkedPixels(page)).toBe(0);

    await stroke(page, [50, 60], [300, 200]);
    const inked = await inkedPixels(page);
    expect(inked).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Tẩy" }).click();
    await stroke(page, [50, 60], [300, 200]);
    expect(await inkedPixels(page)).toBeLessThan(inked);

    await page.getByRole("button", { name: "Bút" }).click();
    await stroke(page, [60, 100], [200, 100]);
    expect(await inkedPixels(page)).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Xoá tất cả" }).click();
    expect(await inkedPixels(page)).toBe(0);
  });

  test("chọn màu và cỡ nét được báo bằng aria-pressed", async ({ page }) => {
    await page.goto("/tools/whiteboard");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Màu Đỏ" }).click();
    await expect(page.getByRole("button", { name: "Màu Đỏ" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Màu Đen" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Nét dày" }).click();
    await expect(page.getByRole("button", { name: "Nét dày" })).toHaveAttribute("aria-pressed", "true");
  });

  test("chạm hai ngón không làm mất nét của ngón đang vẽ khi vẽ lại", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/tools/whiteboard");
    await waitForHydration(page);
    const box = (await page.locator("canvas").boundingBox())!;
    const client = await context.newCDPSession(page);
    // Canvas thay đổi kích thước theo breakpoint; tọa độ theo tỉ lệ giữ thao tác
    // trong vùng vẽ thay vì buộc layout phải khớp vị trí pixel cũ.
    const point = (x: number, y: number, id: number) => ({ x: box.x + box.width * x, y: box.y + box.height * y, id });

    // Ngón 1 vẽ, ngón 2 chạm xuống trong lúc ngón 1 còn đang chạm.
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(.05, .55, 1)] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(.33, .65, 1)] });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point(.33, .65, 1), point(.66, .55, 2)],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [point(.43, .75, 1), point(.66, .55, 2)],
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    const before = await inkedPixels(page);
    expect(before).toBeGreaterThan(0);

    // Đổi kích thước buộc bảng vẽ lại từ danh sách nét đã lưu.
    await page.setViewportSize({ width: 900, height: 800 });
    await expect.poll(() => inkedPixels(page)).toBeGreaterThan(before * 0.7);
    await context.close();
  });

  test("vẽ bằng cảm ứng trên màn hình nhỏ", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/tools/whiteboard");
    await waitForHydration(page);
    const box = (await page.locator("canvas").boundingBox())!;
    const client = await context.newCDPSession(page);
    const point = (x: number, y: number) => ({ x: box.x + x, y: box.y + y });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(30, 40)] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(150, 120)] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await inkedPixels(page)).toBeGreaterThan(0);
    await context.close();
  });
});
