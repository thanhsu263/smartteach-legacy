import { examIssues } from "../validation";
import type { ExamForm } from "../types";
export type PrintLine = { text: string; role: "title" | "section" | "question" | "body" | "answer"; keepNext?: boolean };
/** Student model never contains answer keys; PDF/DOCX cannot leak them through hidden text. */
export function examPrintModel(form: ExamForm, audience: "student" | "teacher"): PrintLine[] {
  if (examIssues(form, true).length) throw new Error("Đề chưa đủ câu hỏi, đáp án hoặc điểm hợp lệ.");
  const total = form.document.sections.flatMap(s => s.questions).reduce((n, q) => n + (q.pointUnits ?? 0), 0) / 100;
  const lines: PrintLine[] = [{ text: form.title, role: "title" }, { text: `Thời gian: ${form.document.durationMinutes} phút · Tổng điểm: ${total.toLocaleString("vi-VN")}`, role: "body" }];
  if (audience === "student") lines.push({ text: "Họ và tên: ........................................ Lớp: ................", role: "body" });
  if (form.description) lines.push({ text: form.description, role: "body" });
  let number = 0;
  for (const section of form.document.sections) {
    lines.push({ text: section.title, role: "section", keepNext: true });
    for (const q of section.questions) {
      number++; lines.push({ text: `Câu ${number}. ${q.prompt} (${((q.pointUnits ?? 0) / 100).toLocaleString("vi-VN")} điểm)`, role: "question", keepNext: true });
      for (const [i, o] of q.options.entries()) lines.push({ text: `${String.fromCharCode(65 + i)}. ${o.label}`, role: "body" });
      if (q.kind === "short_text") lines.push({ text: "Trả lời: ................................................................................", role: "body" });
      if (audience === "teacher") lines.push({ text: "Đáp án: " + (q.kind === "short_text" ? q.accepted_answers.join(" | ") + (q.ignore_diacritics ? " (chấp nhận không dấu)" : "") : q.options.map((o, i) => o.is_correct ? String.fromCharCode(65 + i) : "").filter(Boolean).join(", ")), role: "answer" });
    }
  }
  return lines;
}
