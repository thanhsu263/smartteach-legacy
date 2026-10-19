import { expect, test } from "@playwright/test";

test.describe("header bảo mật", () => {
  for (const path of ["/", "/login", "/games", "/tools/draw", "/my-classes"]) {
    test(`${path} có các header chống nhúng và đoán kiểu nội dung`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      const headers = response.headers();
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    });
  }
});
