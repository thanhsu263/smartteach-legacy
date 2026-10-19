import { describe, expect, it } from "vitest";
import { describeAuthError } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("giữ đường dẫn nội bộ, kèm query và hash", () => {
    expect(safeNextPath("/games/gargamel-bat-xi-trum")).toBe("/games/gargamel-bat-xi-trum");
    expect(safeNextPath("/my-classes?tab=favorites#top")).toBe("/my-classes?tab=favorites#top");
    expect(safeNextPath("/")).toBe("/");
  });

  it("dùng giá trị dự phòng khi thiếu hoặc rỗng", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null, "/my-classes")).toBe("/my-classes");
    expect(safeNextPath("", "/my-classes")).toBe("/my-classes");
  });

  it("từ chối địa chỉ ngoài và các cách ngụy trang", () => {
    const fallback = "/safe";
    for (const evil of [
      "https://evil.example",
      "http://evil.example/path",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/ok\r\nLocation: https://evil.example",
      "/ok\\..\\evil",
      "\u0000/evil",
    ]) {
      expect(safeNextPath(evil, fallback), evil).toBe(fallback);
    }
  });
});

describe("describeAuthError", () => {
  it("dịch các mã lỗi đã biết", () => {
    expect(describeAuthError({ code: "invalid_credentials" })).toContain("chưa đúng");
    expect(describeAuthError({ code: "user_already_exists" })).toContain("đã có tài khoản");
    expect(describeAuthError({ code: "weak_password" })).toContain("6 ký tự");
    expect(describeAuthError({ code: "over_request_rate_limit" })).toContain("Đợi một lát");
  });

  it("nhận ra lỗi mạng", () => {
    expect(describeAuthError({ message: "Failed to fetch" })).toContain("kiểm tra mạng");
  });

  it("không lộ thông báo kỹ thuật của máy chủ ra giao diện", () => {
    const text = describeAuthError({ code: "unexpected_failure", message: "duplicate key value violates ..." });
    expect(text).toBe("Có lỗi xảy ra. Thầy cô thử lại nhé.");
    expect(describeAuthError(null)).toBe("Có lỗi xảy ra. Thầy cô thử lại nhé.");
  });
});
