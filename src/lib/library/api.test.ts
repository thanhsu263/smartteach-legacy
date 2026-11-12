import { describe, expect, it } from "vitest";
import { validateLibraryFilter, validatePublicationDraft } from "./api";

const id = "00000000-0000-4000-8000-000000000000";

describe("library validation", () => {
  it("chấp nhận publication có taxonomy hợp lệ", () => {
    expect(validatePublicationDraft({ quizId: id, title: "Ôn tập", description: "", subject: "toan", grades: ["6"] })).toBeNull();
  });
  it("chặn taxonomy, title và page không bounded", () => {
    expect(validatePublicationDraft({ quizId: id, title: "", description: "", subject: "toan", grades: ["6"] })).toBeTruthy();
    expect(validatePublicationDraft({ quizId: id, title: "A", description: "", subject: "toan" as never, grades: [] })).toBeTruthy();
    expect(validateLibraryFilter({ query: "x".repeat(81) })).toBeTruthy();
    expect(validateLibraryFilter({ limit: 25 })).toBeTruthy();
    expect(validateLibraryFilter({ offset: -1 })).toBeTruthy();
  });
});
