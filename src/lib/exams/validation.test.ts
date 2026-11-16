import { describe, expect, it } from "vitest";
import { emptyExam, emptyQuestion } from "./types";
import { examIssues } from "./validation";
describe("exam authoring validation", () => {
  it("nháp thiếu đáp án lưu được, đề hoàn chỉnh bị chặn", () => {
    const form = emptyExam(); form.title = "Đề Toán 6";
    form.document.sections = [{ id: crypto.randomUUID(), title: "Phần I", questions: [emptyQuestion("single")] }];
    expect(examIssues(form)).toEqual([]); expect(examIssues(form, true).length).toBeGreaterThan(0);
    const q = form.document.sections[0].questions[0]; q.prompt = "2+2=?"; q.options = [{ label: "4", is_correct: true }, { label: "5", is_correct: false }]; q.pointUnits = 25;
    expect(examIssues(form, true)).toEqual([]);
    q.pointUnits = 1.5; expect(examIssues(form).some(i => i.message.includes("Điểm"))).toBe(true);
  });
  it("giới hạn duration, cấu trúc, duplicate IDs và untrusted types", () => {
    expect(examIssues(null)).not.toEqual([]);
    const form = emptyExam(); form.title = "Đề"; form.document.durationMinutes = 181;
    expect(examIssues(form).length).toBeGreaterThan(0);
    form.document.durationMinutes = 45; const q = emptyQuestion("short_text");
    form.document.sections = [{ id: "section", title: "I", questions: [q, q] }];
    expect(examIssues(form).some(i => i.path.includes("câu"))).toBe(true);
  });
});
