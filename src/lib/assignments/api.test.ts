import { describe, expect, it } from "vitest";
import { validateAssignmentDraft } from "./api";
import { describeAssignmentError } from "./errors";

describe("assignment validation", () => {
  it("chặn title, mô tả, thời gian và policy sai trước khi gọi RPC", () => {
    expect(validateAssignmentDraft({ title: "" })).toContain("tên bài");
    expect(validateAssignmentDraft({ title: "x".repeat(101) })).toContain("100");
    expect(validateAssignmentDraft({ title: "Bài", description: "x".repeat(1001) })).toContain("1000");
    expect(validateAssignmentDraft({ title: "Bài", opensAt: "2026-01-02", dueAt: "2026-01-01" })).toContain("Hạn nộp");
    expect(validateAssignmentDraft({ title: "Bài", revealPolicy: "later" as never })).toContain("công bố");
  });

  it("nhận draft tối giản và lịch hợp lệ", () => {
    expect(validateAssignmentDraft({ title: "  Bài ôn tập  " })).toBeNull();
    expect(validateAssignmentDraft({ title: "Bài", opensAt: "2026-01-01T08:00:00Z", dueAt: "2026-01-02T08:00:00Z", revealPolicy: "after_close" })).toBeNull();
  });
});

describe("assignment errors", () => {
  it("đổi lỗi nghiệp vụ và quyền thành lời nhắn an toàn", () => {
    expect(describeAssignmentError({ message: "quiz_not_playable" })).toContain("Quiz");
    expect(describeAssignmentError({ message: "assignment_not_editable" })).toContain("bản nháp");
    expect(describeAssignmentError({ code: "42501" })).toContain("đăng nhập");
    expect(describeAssignmentError({ message: "internal schema detail" })).not.toContain("schema");
  });
});
