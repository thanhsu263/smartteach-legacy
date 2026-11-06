import { expect, test, type Page } from "@playwright/test";
import { games } from "../src/data/games";

// Các test này cần stack Supabase cục bộ: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

const password = "e2e-password-123";
const game = games[0];
const localOrigin = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`;

function uniqueEmail() {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

/** Đăng ký tài khoản mới qua giao diện. Dự án cục bộ không bật xác nhận email nên có phiên ngay. */
async function register(page: Page, loginUrl = "/login") {
  const email = uniqueEmail();
  await page.goto(loginUrl);
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  return email;
}

async function signIn(page: Page, email: string, loginUrl = "/login") {
  await page.goto(loginUrl);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
}

async function signOut(page: Page) {
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Đăng nhập" })).toBeVisible();
}

test.describe("đăng nhập và phiên", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("khách vào trang giáo viên thì được chuyển tới đăng nhập và nhớ trang đích", async ({ page }) => {
    await page.goto("/my-classes");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-classes/);
    await expect(page.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeVisible();
  });

  test("học sinh và khách dùng kho game và tiện ích mà không bị hỏi đăng nhập", async ({ page }) => {
    for (const path of ["/games", `/games/${game.id}`, "/tools", "/tools/draw", "/tools/groups", "/tools/countdown"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test("đăng ký rồi đăng xuất, đăng nhập lại và trang giáo viên được bảo vệ", async ({ page }) => {
    const email = await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
    await expect(nav.getByRole("link", { name: "Lớp của tôi" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Đăng xuất" })).toBeVisible();

    await signOut(page);
    await page.goto("/my-classes");
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, email);
    await expect(page).toHaveURL(/\/my-classes$/);
  });

  test("sai mật khẩu thì báo lỗi rõ ràng và không đăng nhập", async ({ page }) => {
    const email = await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await signOut(page);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
    await expect(page.locator("p[role='alert']")).toContainText("Email hoặc mật khẩu chưa đúng");
    await expect(page).toHaveURL(/\/login/);
  });

  test("đã đăng nhập mà vào /login thì được đưa tới trang đích", async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await page.goto("/login?next=%2Fgames");
    await expect(page).toHaveURL(/\/games$/);
  });

  test("tham số next trỏ ra ngoài bị bỏ qua, kể cả khi ngụy trang bằng dấu chấm", async ({ page }) => {
    const email = await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await signOut(page);

    // Chặn mọi yêu cầu tới tên miền giả để nếu bị chuyển hướng ra ngoài thì vẫn thấy được địa chỉ cuối.
    await page.route((url) => url.hostname === "evil.example", (route) =>
      route.fulfill({ contentType: "text/html", body: "<h1>TRANG GIẢ</h1>" }),
    );

    for (const evil of [
      "//evil.example",
      "/..//evil.example",
      "/.//evil.example",
      "/%2e%2e//evil.example",
      "https://evil.example/login",
    ]) {
      await signIn(page, email, `/login?next=${encodeURIComponent(evil)}`);
      await expect(page, evil).toHaveURL(new RegExp(`${localOrigin}/my-classes$`));
      expect(new URL(page.url()).hostname, evil).toBe("localhost");
      await signOut(page);
    }
  });

  test("đã đăng nhập mà next có query thì giữ nguyên query", async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await page.goto("/login?next=%2Fgames%3Fq%3Dxi");
    await expect(page).toHaveURL(new RegExp(`${localOrigin}/games\\?q=xi$`));
  });

  test("/auth/callback với mã sai về trang đăng nhập kèm lỗi, không chuyển ra ngoài", async ({ page, request }) => {
    const raw = await request.get("/auth/callback?code=ma-sai&next=%2F..%2F%2Fevil.example", { maxRedirects: 0 });
    expect(raw.status()).toBe(307);
    expect(new URL(raw.headers()["location"]).origin).toBe(localOrigin);

    await page.goto("/auth/callback?code=ma-sai&next=%2F..%2F%2Fevil.example");
    await expect(page).toHaveURL(/\/login\?error=callback$/);
    await expect(page.locator("p[role='alert']")).toContainText("Không hoàn tất được đăng nhập");

    const noCode = await request.get("/auth/callback", { maxRedirects: 0 });
    expect(new URL(noCode.headers()["location"]).pathname).toBe("/login");
  });
});

test.describe("lớp của tôi", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("tạo lớp có danh sách, sửa, xoá học sinh và dùng lại trong bốc thăm và chia nhóm", async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await expect(page.getByText("Thầy cô chưa có lớp nào")).toBeVisible();

    await page.getByLabel("Tên lớp").filter({ visible: true }).fill("10A1");
    await page.getByLabel(/Danh sách học sinh/).fill("Minh Anh\n\nGia Huy\n  Thảo My  ");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã tạo lớp" })).toBeVisible();
    await expect(page.getByRole("link", { name: "10A1" })).toBeVisible();
    await expect(page.getByText("3 học sinh")).toBeVisible();

    await page.getByRole("link", { name: "10A1" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "10A1" })).toBeVisible();
    await expect(page.getByText("3 / 100 học sinh")).toBeVisible();
    await expect(page.locator("ol li")).toHaveText([/Minh Anh/, /Gia Huy/, /Thảo My/]);

    await page.getByLabel(/Mỗi dòng một tên/).fill("Quốc Bảo\nNgọc Hân");
    await page.getByRole("button", { name: "Thêm vào lớp" }).click();
    await expect(page.getByText("5 / 100 học sinh")).toBeVisible();

    await page.getByRole("button", { name: "Sửa tên Gia Huy" }).click();
    await page.getByLabel("Tên học sinh").fill("Gia Huy B");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Gia Huy B")).toBeVisible();

    await page.getByRole("button", { name: "Xoá Thảo My" }).click();
    await expect(page.getByText("4 / 100 học sinh")).toBeVisible();

    await page.getByRole("button", { name: "Đổi tên lớp" }).click();
    await page.getByLabel("Tên lớp").filter({ visible: true }).fill("10A2");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "10A2" })).toBeVisible();

    // Dùng lớp đã lưu trong bốc thăm và chia nhóm.
    await page.goto("/tools/draw");
    await page.getByLabel("Dùng lớp đã lưu").selectOption({ label: "10A2 (4 học sinh)" });
    await expect(page.getByLabel("Danh sách tên")).toHaveValue("Minh Anh\nGia Huy B\nQuốc Bảo\nNgọc Hân");
    await expect(page.getByText("4 tên")).toBeVisible();

    await page.goto("/tools/groups");
    await page.getByLabel("Dùng lớp đã lưu").selectOption({ label: "10A2 (4 học sinh)" });
    await page.getByLabel("Số nhóm", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Chia nhóm" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã chia 4 bạn thành 2 nhóm" })).toBeVisible();
  });

  test("xoá lớp cần xác nhận và có thể giữ lại", async ({ page }) => {
    await register(page);
    await page.getByLabel("Tên lớp").filter({ visible: true }).fill("Lớp thử xoá");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(page.getByRole("link", { name: "Lớp thử xoá" })).toBeVisible();

    await page.getByRole("button", { name: "Xoá lớp Lớp thử xoá" }).click();
    await page.getByRole("button", { name: "Giữ lại" }).click();
    await expect(page.getByRole("link", { name: "Lớp thử xoá" })).toBeVisible();

    await page.getByRole("button", { name: "Xoá lớp Lớp thử xoá" }).click();
    await page.getByRole("button", { name: "Xoá lớp", exact: true }).click();
    await expect(page.getByRole("link", { name: "Lớp thử xoá" })).toHaveCount(0);
    await expect(page.getByText("Thầy cô chưa có lớp nào")).toBeVisible();
  });

  test("khách không thấy ô chọn lớp đã lưu trong tiện ích", async ({ page }) => {
    await page.goto("/tools/draw");
    await expect(page.getByRole("button", { name: "Toàn màn hình" })).toBeVisible();
    await expect(page.getByLabel("Dùng lớp đã lưu")).toHaveCount(0);
    await expect(page.getByText("Dùng lớp đã lưu")).toHaveCount(0);
  });

  test("giáo viên khác không thấy hay mở được lớp của người khác", async ({ page }) => {
    await register(page);
    await page.getByLabel("Tên lớp").filter({ visible: true }).fill("Lớp riêng của A");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await page.getByRole("link", { name: "Lớp riêng của A" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lớp riêng của A" })).toBeVisible();
    const classUrl = page.url();

    await signOut(page);
    await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await expect(page.getByRole("link", { name: "Lớp riêng của A" })).toHaveCount(0);
    await expect(page.getByText("Thầy cô chưa có lớp nào")).toBeVisible();

    await page.goto(classUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy lớp này" })).toBeVisible();
  });

  test("mở lớp bằng id không phải UUID thì báo không tìm thấy, không báo lỗi chung", async ({ page }) => {
    await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await page.goto("/my-classes/abc");
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy lớp này" })).toBeVisible();
    await expect(page.getByText("Có lỗi xảy ra")).toHaveCount(0);
  });

  test("cấp tiêu đề của trang Lớp của tôi không nhảy cấp", async ({ page }) => {
    await register(page);
    await page.getByLabel("Tên lớp").filter({ visible: true }).fill("Lớp kiểm tiêu đề");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(page.getByRole("link", { name: "Lớp kiểm tiêu đề" })).toBeVisible();
    // Next.js (Cache Components) giữ lại trang trước ở dạng ẩn trong DOM, nên chỉ tính tiêu đề đang hiện.
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3")]
        .filter((heading) => heading.checkVisibility())
        .map((heading) => Number(heading.tagName.slice(1))),
    );
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1);
    });
  });
});

test.describe("game yêu thích", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("khách bấm yêu thích thì được mời đăng nhập và quay lại đúng game", async ({ page }) => {
    await page.goto("/games");
    await page.getByRole("button", { name: `Yêu thích ${game.title}` }).click();
    const invite = page.getByRole("status").filter({ hasText: "để lưu game yêu thích" });
    await expect(invite).toBeVisible();
    await invite.getByRole("link", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/games/${game.id}`)}`));

    await page.getByRole("button", { name: "Đăng ký" }).click();
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page).toHaveURL(new RegExp(`/games/${game.id}$`));
  });

  test("bật, giữ qua lần tải lại, hiện trong Lớp của tôi và bỏ yêu thích", async ({ page }) => {
    await register(page, `/login?next=${encodeURIComponent(`/games/${game.id}`)}`);
    await expect(page).toHaveURL(new RegExp(`/games/${game.id}$`));

    const heart = page.getByRole("button", { name: `Yêu thích ${game.title}` });
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.getByRole("button", { name: `Yêu thích ${game.title}` })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/my-classes");
    const section = page.getByRole("region", { name: "Game yêu thích" });
    await expect(section.getByRole("link", { name: game.title })).toBeVisible();

    await section.getByRole("button", { name: `Yêu thích ${game.title}` }).click();
    // Dùng vùng có vai trò (region): React có thể giữ một bản HTML ẩn của đoạn Suspense trong giây lát.
    await expect(section.getByText("Thầy cô chưa đánh dấu game nào")).toBeVisible();

    await page.goto("/games");
    await expect(page.getByRole("button", { name: `Yêu thích ${game.title}` })).toHaveAttribute("aria-pressed", "false");
  });

  test("yêu thích của mỗi giáo viên là riêng", async ({ page }) => {
    await register(page, `/login?next=${encodeURIComponent(`/games/${game.id}`)}`);
    await page.getByRole("button", { name: `Yêu thích ${game.title}` }).click();
    await expect(page.getByRole("button", { name: `Yêu thích ${game.title}` })).toHaveAttribute("aria-pressed", "true");

    await signOut(page);
    await register(page, `/login?next=${encodeURIComponent(`/games/${game.id}`)}`);
    await expect(page).toHaveURL(new RegExp(`/games/${game.id}$`));
    await expect(page.getByRole("button", { name: `Yêu thích ${game.title}` })).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("điện thoại 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("đăng nhập, Lớp của tôi và chi tiết lớp không cuộn ngang", async ({ page }) => {
    const overflows = () =>
      page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

    await page.goto("/login");
    expect(await overflows()).toBe(false);

    await register(page);
    await expect(page).toHaveURL(/\/my-classes$/);
    await page.getByLabel("Tên lớp").filter({ visible: true }).fill("Lớp có tên khá dài để thử ngắt dòng trên điện thoại nhỏ");
    await page.getByLabel(/Danh sách học sinh/).fill("Nguyễn Thị Minh Anh Rất Dài Tên\nGia Huy");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(page.getByRole("link", { name: /Lớp có tên khá dài/ })).toBeVisible();
    expect(await overflows()).toBe(false);

    await page.getByRole("link", { name: /Lớp có tên khá dài/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Lớp có tên khá dài");
    expect(await overflows()).toBe(false);
  });
});
