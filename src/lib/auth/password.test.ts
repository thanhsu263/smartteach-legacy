import { describe, expect, it } from "vitest";
import { passwordIssue, passwordError, recoveryRedirect } from "./password";
describe("password recovery contract", () => {
  it("canonical callback không nhận host tùy ý, credentials hoặc scheme nguy hiểm", () => {
    expect(recoveryRedirect("https://smartteachvn.vercel.app/a?token=x")).toBe("https://smartteachvn.vercel.app/auth/callback?next=%2Freset-password");
    expect(recoveryRedirect("http://localhost:3100")).toContain("localhost:3100/auth/callback");
    for (const input of [undefined, "//evil.test", "javascript:alert(1)", "http://evil.test", "https://user:secret@example.com"]) expect(recoveryRedirect(input)).toBeNull();
  });
  it("mật khẩu phải khớp; không lộ error nội bộ", () => {
    expect(passwordIssue("abcdef", "abcdeg")).toContain("chưa khớp");
    expect(passwordIssue("abc", "abc")).toContain("6 ký tự");
    expect(passwordIssue("abcdef", "abcdef")).toBeNull();
    expect(passwordError("reauthentication_needed")).toContain("xác minh");
    expect(passwordError("internal-secret")).toBeNull();
  });
});
