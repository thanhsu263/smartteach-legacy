import { QUESTION_KINDS } from "@/lib/quiz/types";
import { questionProblems } from "@/lib/quiz/validate";
import type { ExamForm, ExamIssue } from "./types";
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
export function examIssues(value: unknown, complete = false): ExamIssue[] {
  const issues: ExamIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (!record(value)) return [{ path: "exam", message: "Dữ liệu đề chưa hợp lệ." }];
  if (!text(value.title, 100) || !(value.title as string).trim()) add("title", "Tên đề cần từ 1 đến 100 ký tự.");
  if (!text(value.description, 1000)) add("description", "Mô tả tối đa 1000 ký tự.");
  if (new TextEncoder().encode(JSON.stringify(value)).length > 256 * 1024) add("exam", "Đề vượt dung lượng 256 KiB.");
  const d = value.document;
  if (!record(d) || d.schemaVersion !== 1 || !Number.isInteger(d.durationMinutes) || Number(d.durationMinutes) < 1 || Number(d.durationMinutes) > 180 || !Array.isArray(d.sections) || d.sections.length > 10) return [...issues, { path: "document", message: "Đề cần thời lượng 1–180 phút, tối đa 10 phần." }];
  let count = 0, points = 0;
  const ids = new Set<string>();
  for (const [si, section] of d.sections.entries()) {
    const path = `Phần ${si + 1}`;
    if (!record(section) || !text(section.title, 100) || !Array.isArray(section.questions) || typeof section.id !== "string" || ids.has(section.id)) { add(path, "Cấu trúc phần không hợp lệ hoặc ID trùng."); continue; }
    ids.add(section.id);
    if (!section.id.length || section.id.length > 100) add(path, "ID phần không hợp lệ.");
    if (complete && !(section.title as string).trim()) add(path, "Nhập tên phần.");
    if (complete && section.questions.length === 0) add(path, "Phần chưa có câu hỏi.");
    for (const [qi, q] of section.questions.entries()) {
      count++; const at = `${path}, câu ${qi + 1}`;
      if (!record(q) || typeof q.id !== "string" || ids.has(q.id) || !QUESTION_KINDS.includes(q.kind as never) || !text(q.prompt, 500) || typeof q.ignore_diacritics !== "boolean" || !Array.isArray(q.options) || q.options.length > 6 || !q.options.every(o => record(o) && text(o.label, 150) && typeof o.is_correct === "boolean") || !Array.isArray(q.accepted_answers) || q.accepted_answers.length > 10 || !q.accepted_answers.every(a => text(a, 100))) { add(at, "Câu hỏi, lựa chọn hoặc đáp án vượt giới hạn/không hợp lệ."); continue; }
      ids.add(q.id);
      if (!q.id.length || q.id.length > 100 || (q.kind === "short_text" && q.options.length !== 0) || (q.kind !== "short_text" && q.accepted_answers.length !== 0)) add(at, "ID hoặc trường đáp án không khớp loại câu.");
      if (q.pointUnits !== null && (!Number.isInteger(q.pointUnits) || Number(q.pointUnits) < 1 || Number(q.pointUnits) > 10000)) add(at, "Điểm cần từ 0,01 đến 100 và tối đa 2 chữ số thập phân.");
      points += Number(q.pointUnits) || 0;
      if (complete && (!(q.prompt as string).trim() || q.pointUnits === null)) add(at, "Cần nội dung câu hỏi và điểm.");
      if (complete) {
        const typed = q as unknown as ExamForm["document"]["sections"][number]["questions"][number];
        if (questionProblems(typed).length || (typed.kind !== "short_text" && typed.options.some(o => !o.label.trim())) || (typed.kind === "short_text" && typed.accepted_answers.some(a => !a.trim()))) add(at, "Cần kiểm tra đáp án đúng, lựa chọn và đáp án chấp nhận.");
      }
    }
  }
  if (count > 50 || (complete && count === 0)) add("questions", "Đề hoàn chỉnh cần từ 1 đến 50 câu.");
  if (points > 500000) add("points", "Tổng điểm tối đa 5000.");
  return issues;
}
