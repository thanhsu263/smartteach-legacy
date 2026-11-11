import { expect, test } from "@playwright/test";

const views = [
  { name: "games-375", path: "/games", width: 375, height: 812 },
  { name: "whiteboard-768", path: "/tools/whiteboard", width: 768, height: 900 },
  { name: "privacy-1280", path: "/privacy", width: 1280, height: 800 },
] as const;

/**
 * Evidence trực quan cho Phase 02. Ảnh là artifact của Playwright, không phải
 * snapshot pixel bị khoá; test chỉ bảo đảm từng surface render được và không
 * phát sinh console error ở breakpoint đại diện.
 */
test("surface Phase 02 render không có console error", async ({ browser }, testInfo) => {
  for (const view of views) {
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto(view.path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${view.name}.png`), fullPage: true });
    expect(errors, `${view.path} có console error`).toEqual([]);
    await context.close();
  }
});
