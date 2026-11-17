import { describe, expect, it } from "vitest";
import { normalizeFullName, normalizeVietnamPhone } from "@/lib/auth/profile";

describe("normalizeFullName", () => {
  it("gộp khoảng trắng thừa", () => {
    expect(normalizeFullName("  Nguyễn   Thị  Lan ")).toBe("Nguyễn Thị Lan");
  });

  it("từ chối tên rỗng, quá ngắn hoặc quá dài", () => {
    expect(normalizeFullName("   ")).toBeNull();
    expect(normalizeFullName("A")).toBeNull();
    expect(normalizeFullName("a".repeat(81))).toBeNull();
  });
});

describe("normalizeVietnamPhone", () => {
  it("nhận số 10 chữ số và bỏ dấu phân cách", () => {
    expect(normalizeVietnamPhone("0912345678")).toBe("0912345678");
    expect(normalizeVietnamPhone("091 234 5678")).toBe("0912345678");
    expect(normalizeVietnamPhone("091.234.5678")).toBe("0912345678");
    expect(normalizeVietnamPhone("(039) 123-4567")).toBe("0391234567");
  });

  it("đổi +84 và 84 về đầu 0", () => {
    expect(normalizeVietnamPhone("+84 912 345 678")).toBe("0912345678");
    expect(normalizeVietnamPhone("84912345678")).toBe("0912345678");
  });

  it("từ chối số sai độ dài, sai đầu số hoặc có chữ", () => {
    expect(normalizeVietnamPhone("")).toBeNull();
    expect(normalizeVietnamPhone("091234567")).toBeNull();
    expect(normalizeVietnamPhone("09123456789")).toBeNull();
    expect(normalizeVietnamPhone("0212345678")).toBeNull();
    expect(normalizeVietnamPhone("09123abc78")).toBeNull();
  });
});
