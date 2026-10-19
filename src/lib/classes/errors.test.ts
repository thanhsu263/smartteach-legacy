import { describe, expect, it } from "vitest";
import { describeDbError } from "@/lib/classes/errors";
import { MAX_CLASSES, MAX_FAVORITES, MAX_STUDENTS_PER_CLASS } from "@/lib/classes/limits";

describe("describeDbError", () => {
  it("báo giới hạn game yêu thích bằng đúng con số", () => {
    const text = describeDbError({ message: "favorite_limit_exceeded", code: "23514" });
    expect(text).toContain(String(MAX_FAVORITES));
    expect(text).toContain("yêu thích");
  });

  it("báo giới hạn lớp và học sinh bằng đúng con số", () => {
    expect(describeDbError({ message: "class_limit_exceeded", code: "23514" })).toContain(String(MAX_CLASSES));
    expect(describeDbError({ message: "student_limit_exceeded", code: "23514" })).toContain(
      String(MAX_STUDENTS_PER_CLASS),
    );
  });

  it("phân biệt lỗi độ dài tên với lỗi giới hạn", () => {
    expect(describeDbError({ code: "23514", message: 'violates check constraint "classes_name_length"' })).toContain(
      "1 đến 100",
    );
  });

  it("nhận ra phiên hết hạn, trùng lặp và mất mạng", () => {
    expect(describeDbError({ code: "42501" })).toContain("đăng nhập lại");
    expect(describeDbError({ code: "23505" })).toContain("đã có");
    expect(describeDbError({ message: "TypeError: Failed to fetch" })).toContain("kiểm tra mạng");
  });

  it("không lộ thông báo kỹ thuật", () => {
    expect(describeDbError({ code: "XX000", message: 'relation "classes" does not exist' })).toBe(
      "Có lỗi xảy ra. Thầy cô thử lại nhé.",
    );
    expect(describeDbError(undefined)).toBe("Có lỗi xảy ra. Thầy cô thử lại nhé.");
  });
});
