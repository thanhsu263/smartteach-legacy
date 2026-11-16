import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { newTeacher, loginAs, cleanupLive } from "./helpers/live";
import type * as Drafts from "../src/lib/drafts/storage";
type DraftWindow = Window & { draftTest: typeof Drafts };
const source = ts.transpileModule(readFileSync("src/lib/drafts/storage.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
async function install(page: Page) {
  await page.evaluate(async code => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    (window as unknown as DraftWindow).draftTest = await import(url); URL.revokeObjectURL(url);
  }, source);
}
test.afterAll(cleanupLive);
test("IndexedDB hai tab: CAS nguyên tử, không ABA, lỗi dung lượng và tách chủ sở hữu", async ({ page, context }) => {
  await page.goto("/forgot-password"); await install(page);
  const other = await context.newPage(); await other.goto("/forgot-password"); await install(other);
  const key = "v1:teacher-a:exam:new";
  const write = (p: Page, expected: number | null, owner = "teacher-a", payload = "đề chưa lưu") => p.evaluate(async ({ expected, owner, payload }) => {
    const m = (window as unknown as DraftWindow).draftTest;
    try { const row = await m.writeDraft({ key: m.draftKey(owner,"exam","new"), owner, entity: "exam", entityId: "new", target: null, baseline: "0", payload, writerId: crypto.randomUUID() }, expected); return { revision: row.revision, error: null }; }
    catch(e) { return { revision: null, error: (e as Error).message }; }
  }, { expected, owner, payload });
  const race = await Promise.all([write(page, null), write(other, null)]);
  expect(race.filter(r => r.revision !== null)).toHaveLength(1); expect(race.filter(r => r.error?.includes("tab khác"))).toHaveLength(1);
  const first = race.find(r => r.revision !== null)!.revision!;
  await page.evaluate(key => (window as unknown as DraftWindow).draftTest.removeDraft(key), key);
  const second = await write(other, null); expect(second.revision!).toBeGreaterThan(first);
  expect((await write(page, first)).error).toContain("tab khác");
  expect((await write(page, second.revision, "teacher-a", "x".repeat(270 * 1024))).error).toContain("giới hạn");
  expect((await write(other, null, "teacher-b")).error).toBeNull();
  await page.evaluate(() => (window as unknown as DraftWindow).draftTest.ownerDrafts("teacher-a", true));
  expect(await other.evaluate(() => (window as unknown as DraftWindow).draftTest.ownerDrafts("teacher-a"))).toBe(0);
  expect(await other.evaluate(() => (window as unknown as DraftWindow).draftTest.ownerDrafts("teacher-b"))).toBe(1);
});
test("nháp giữ khi mất phiên; hủy/lỗi logout giữ nháp; logout thành công dọn A trước khi B vào", async ({ page, context }) => {
  test.setTimeout(60000);
  const a = await newTeacher("draft-owner-a"), b = await newTeacher("draft-owner-b");
  await loginAs(page, a, "/my-exams/new");
  await page.getByLabel("Tên đề", { exact: true }).fill("Nháp riêng tài khoản A");
  await expect(page.getByText("Đã lưu nháp trên trình duyệt này.", { exact: true })).toBeVisible();
  await context.clearCookies(); page.once("dialog", d => d.accept()); await page.reload();
  await expect(page).toHaveURL(/\/login/); await loginAs(page, a, "/my-exams/new");
  await page.getByRole("button", { name: "Khôi phục nháp đề", exact: true }).click();
  await expect(page.getByLabel("Tên đề", { exact: true })).toHaveValue("Nháp riêng tài khoản A");
  await page.setViewportSize({ width: 1280, height: 900 });
  const logout = page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Đăng xuất", exact: true });
  page.once("dialog", d => d.dismiss()); await logout.click(); await expect(page).toHaveURL(/\/my-exams\/new$/);
  await install(page); expect(await page.evaluate(id => (window as unknown as DraftWindow).draftTest.ownerDrafts(id), a.id)).toBe(1);
  await page.route("**/auth/v1/logout*", r => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "local logout failure probe" }) }));
  page.once("dialog", d => d.accept()); await logout.click(); await expect(page.getByRole("alert").filter({ hasText: "Nháp vẫn được giữ" })).toBeVisible();
  expect(await page.evaluate(id => (window as unknown as DraftWindow).draftTest.ownerDrafts(id), a.id)).toBe(1);
  await page.unroute("**/auth/v1/logout*"); page.on("dialog", d => d.accept());
  // This SDK removes the local session even when global token revocation fails.
  await loginAs(page, a, "/my-exams/new"); await page.getByRole("button", { name: "Khôi phục nháp đề", exact: true }).click();
  await logout.click(); await expect(page).toHaveURL(/\/$/);
  await install(page); expect(await page.evaluate(id => (window as unknown as DraftWindow).draftTest.ownerDrafts(id), a.id)).toBe(0);
  await loginAs(page, b, "/my-exams/new"); await expect(page.getByRole("button", { name: "Khôi phục nháp đề", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Tên đề", { exact: true })).toHaveValue("");
});
