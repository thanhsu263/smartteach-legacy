import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { cleanupLive, localConfig, loginAs, newTeacher } from "./helpers/live";

test.afterAll(cleanupLive);

for (const width of [375, 768, 1280]) {
  test(`ba gói thành viên đúng giá, giao diện và checkout truy cập được ở ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const plans = page.locator("#goi-thanh-vien");
    await plans.scrollIntoViewIfNeeded();
    await expect(plans.getByRole("article")).toHaveCount(3);
    await expect(plans.locator("article > strong").filter({ hasText: "50.000đ" })).toBeVisible();
    await expect(plans.locator("article > strong").filter({ hasText: "500.000đ" })).toBeVisible();
    await expect(plans.getByRole("link", { name: "Chọn Premium 1 năm" })).toHaveAttribute("href", "/membership?plan=premium_yearly");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await plans.screenshot({ path: `artifacts/membership-plans-${width}.png` });

    const teacher = await newTeacher("membership-layout");
    await loginAs(page, teacher, "/membership");
    await expect(page.getByRole("heading", { name: "Gói hiện tại: Free" })).toBeVisible();
    await page.getByRole("radio", { name: /Premium 1 năm/ }).check();
    await expect(page.getByRole("button", { name: "Thanh toán 500.000đ qua payOS" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: `artifacts/membership-checkout-${width}.png`, fullPage: true });
  });
}

test("Free dùng quiz, đề cần Premium; checkout từ chối khách, sai origin và plan lạ", async ({ page, request, baseURL }) => {
  test.setTimeout(60_000);
  expect((await request.post("/api/membership/checkout", { data: { plan: "premium_monthly" }, headers: { Origin: baseURL! } })).status()).toBe(401);
  const teacher = await newTeacher("membership-free");
  await loginAs(page, teacher, "/assignments/new");
  await expect(page.getByRole("heading", { name: "Soạn và giao đề với Premium" })).toBeVisible();
  await page.getByRole("link", { name: "Xem gói Premium" }).click();
  await expect(page.getByRole("heading", { name: "Gói hiện tại: Free" })).toBeVisible();
  const invalid = await page.request.post("/api/membership/checkout", { data: { plan: "premium_1vnd", amount: 1 }, headers: { Origin: baseURL! } });
  expect(invalid.status()).toBe(400);
  const crossSite = await page.request.post("/api/membership/checkout", { data: { plan: "premium_monthly" }, headers: { Origin: "https://other.example" } });
  expect(crossSite.status()).toBe(403);
  await page.goto("/my-quizzes");
  await expect(page.getByRole("heading", { name: "Quiz của tôi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo quiz", exact: true })).toBeVisible();
});

test("chọn gói năm gửi plan duy nhất và mở checkout payOS được giả lập tại trình duyệt", async ({ page }) => {
  const teacher = await newTeacher("membership-checkout");
  await loginAs(page, teacher, "/membership");
  await expect(page.getByRole("heading", { name: "Gói hiện tại: Free" })).toBeVisible();
  await page.route("**/api/membership/checkout", async route => {
    expect(route.request().postDataJSON()).toEqual({ plan: "premium_yearly" });
    await route.fulfill({ json: { id: "11111111-1111-4111-8111-111111111111", checkoutUrl: "https://pay.payos.vn/web/e2e-no-money" } });
  });
  await page.route("https://pay.payos.vn/**", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: "<h1>Checkout giả lập, không chuyển tiền</h1>" }));
  await page.getByRole("radio", { name: /Premium 1 năm/ }).check();
  await page.getByRole("button", { name: "Thanh toán 500.000đ qua payOS" }).click();
  await expect(page.getByRole("heading", { name: "Checkout giả lập, không chuyển tiền" })).toBeVisible();
});

test("callback giả không cấp Premium; đơn đã xác nhận cập nhật quyền và hạn, đơn người khác bị chặn", async ({ page }) => {
  test.setTimeout(60_000);
  const teacher = await newTeacher("membership-return");
  const reserved = await teacher.client.rpc("prepare_membership_checkout", { p_plan: "premium_monthly" });
  expect(reserved.error).toBeNull();
  const order = reserved.data as { id: string; order_code: number; amount: number };
  await loginAs(page, teacher, "/membership");
  await page.goto(`/membership?order=${order.id}&status=PAID&code=00&payment=return`);
  await expect(page.getByRole("heading", { name: "Đang chờ thanh toán" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói hiện tại: Free" })).toBeVisible();
  expect((await teacher.client.rpc("membership_status")).data.active).toBe(false);

  // Controlled local confirmation crosses the same atomic DB boundary as the server; no provider request or transfer.
  const config = localConfig();
  const admin = createClient(config.url, config.serviceRoleKey, { auth: { persistSession: false } });
  const paid = await admin.rpc("settle_membership_payment", { p_order_code: order.order_code, p_payment_link_id: `e2e-${order.id}`, p_amount: order.amount });
  expect(paid.error).toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Thanh toán đã được xác nhận" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói hiện tại: Premium" })).toBeVisible();
  await expect(page.getByText(/Có hiệu lực đến/)).toBeVisible();
  await page.getByRole("link", { name: "Soạn đề online", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa đủ dữ liệu để giao bài" })).toBeVisible();
  const other = await newTeacher("membership-other");
  const foreign = await other.client.rpc("prepare_membership_checkout", { p_plan: "premium_yearly" });
  expect(foreign.error).toBeNull();
  expect((await page.request.get(`/api/membership?order=${foreign.data.id}`)).status()).toBe(404);
});
