import { describe, expect, it } from "vitest";
import { validateName, validateStudentNames } from "@/lib/classes/api";
import { MAX_NAME_LENGTH, MAX_STUDENTS_PER_CLASS } from "@/lib/classes/limits";

describe("validateName", () => {
  it("chấp nhận tên hợp lệ và bỏ khoảng trắng hai đầu khi đếm", () => {
    expect(validateName("10A1")).toBeNull();
    expect(validateName("  Lớp 10A1  ")).toBeNull();
    expect(validateName("x".repeat(MAX_NAME_LENGTH))).toBeNull();
  });

  it("từ chối tên rỗng hoặc quá dài", () => {
    expect(validateName("")).toContain("nhập tên");
    expect(validateName("   ")).toContain("nhập tên");
    expect(validateName("x".repeat(MAX_NAME_LENGTH + 1))).toContain(String(MAX_NAME_LENGTH));
  });
});

describe("validateStudentNames", () => {
  it("chấp nhận danh sách trong giới hạn, kể cả rỗng", () => {
    expect(validateStudentNames([])).toBeNull();
    expect(validateStudentNames(["An", "Bình"], 10)).toBeNull();
    expect(validateStudentNames(Array(MAX_STUDENTS_PER_CLASS).fill("An"))).toBeNull();
  });

  it("tính cả số học sinh đã có khi so với giới hạn của lớp", () => {
    expect(validateStudentNames(["An"], MAX_STUDENTS_PER_CLASS)).toContain(String(MAX_STUDENTS_PER_CLASS));
    expect(validateStudentNames(Array(5).fill("An"), MAX_STUDENTS_PER_CLASS - 4)).not.toBeNull();
    expect(validateStudentNames(Array(4).fill("An"), MAX_STUDENTS_PER_CLASS - 4)).toBeNull();
  });

  it("từ chối tên dài hơn giới hạn và chỉ rõ tên nào", () => {
    const problem = validateStudentNames(["An", "y".repeat(MAX_NAME_LENGTH + 1)]);
    expect(problem).toContain(String(MAX_NAME_LENGTH));
    expect(problem).toContain("yyyy");
  });
});
