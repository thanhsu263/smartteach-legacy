import { describe, expect, it } from "vitest";
import { credentialFromFragment, describeStudentAssignmentError, withoutCredentialFragment } from "./student-access";

describe("student credential fragment", () => {
  it("chỉ nhận credential hex đủ độ dài từ fragment", () => {
    expect(credentialFromFragment("#credential=abcdef0123456789abcdef0123456789")).toBe("ABCDEF0123456789ABCDEF0123456789");
    expect(credentialFromFragment("?credential=ABCDEF0123456789ABCDEF0123456789")).toBeNull();
    expect(credentialFromFragment("#credential=short")).toBeNull();
    expect(withoutCredentialFragment("/learn/ABC", "?from=qr")).toBe("/learn/ABC?from=qr");
  });

  it("không lộ nguyên nhân credential khi map lỗi", () => {
    expect(describeStudentAssignmentError({ message: "credential_revoked internal" })).not.toContain("revoked");
    expect(describeStudentAssignmentError({ message: "attempt_not_found" })).toContain("không còn hiệu lực");
  });
});
