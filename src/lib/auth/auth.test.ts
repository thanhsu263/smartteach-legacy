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

describe("safeNextPath: dấu chấm và mã hoá không được biến thành địa chỉ ngoài", () => {
  const fallback = "/safe";

  it("từ chối các đường dẫn chuẩn hoá thành //host (lỗi open redirect đã gặp)", () => {
    for (const evil of [
      "/..//evil.example",
      "/.//evil.example",
      "/a/..//evil.example",
      "/a/../..//evil.example",
      "/%2e%2e//evil.example",
      "/%2E%2E//evil.example",
      "/././/evil.example",
    ]) {
      expect(safeNextPath(evil, fallback), evil).toBe(fallback);
    }
  });

  it("mọi kết quả đều là đường dẫn cùng gốc, không bao giờ bắt đầu bằng //", () => {
    const parts = ["", ".", "..", "%2e", "%2e%2e", "%2f", "a", "evil.example", "?x=1", "#h"];
    const origin = "http://app.test";
    let checked = 0;
    for (const a of parts) {
      for (const b of parts) {
        for (const c of parts) {
          for (const d of parts) {
            const input = `/${a}/${b}/${c}/${d}`;
            const result = safeNextPath(input, fallback);
            expect(result.startsWith("//"), `${input} -> ${result}`).toBe(false);
            expect(new URL(result, origin).origin, `${input} -> ${result}`).toBe(origin);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(parts.length ** 4);
  });

  it("vẫn giữ nguyên đường dẫn hợp lệ có dấu chấm", () => {
    expect(safeNextPath("/games/../tools", fallback)).toBe("/tools");
    expect(safeNextPath("/my-classes/./abc", fallback)).toBe("/my-classes/abc");
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
