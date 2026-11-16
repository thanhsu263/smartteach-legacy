import { emptyExam, emptyQuestion } from "../types";
import { examIssues } from "../validation";
import { QUESTION_KINDS, type QuestionKind } from "@/lib/quiz/types";
import { TEMPLATE_COLUMNS, type ExamParse } from "./types";
export function rowsToExam(rows: string[][]): ExamParse {
  const result: ExamParse = { form: { ...emptyExam(), title: "Đề đã nhập" }, issues: [] };
  const issue = (row: number, message: string, fixable = false) => result.issues.push({ severity: "error", locator: { row }, message, fixable });
  if (!rows.length || rows.length > 501) { issue(0, "Tệp cần có tiêu đề và không quá 500 hàng dữ liệu."); return result; }
  const headers = rows[0].map(h => h.replace(/^\uFEFF/, "").trim().toLowerCase());
  if (new Set(headers).size !== headers.length || TEMPLATE_COLUMNS.some(h => !headers.includes(h)) || headers.some(h => !TEMPLATE_COLUMNS.includes(h))) { issue(1, "Tiêu đề cột cần khớp đầy đủ với mẫu SmartTeach v1."); return result; }
  for (const [index, row] of rows.slice(1).entries()) {
    if (!row.some(cell => cell.trim())) continue;
    if (row.length > headers.length) { issue(index + 2, "Hàng có nhiều ô hơn tiêu đề."); continue; }
    const get = (key: string) => (row[headers.indexOf(key)] ?? "").trim();
    const kind = get("kind") as QuestionKind;
    if (!QUESTION_KINDS.includes(kind)) { issue(index + 2, "Loại câu cần là single, multi, true_false hoặc short_text."); continue; }
    const q = emptyQuestion(kind); q.prompt = get("prompt");
    q.options = [];
    const correct = get("correct").split("|").map(s => s.trim()).filter(Boolean);
    if (correct.some(s => !/^[A-F]$/.test(s))) issue(index + 2, "Đáp án lựa chọn cần A–F, ngăn bằng | khi có nhiều đáp án.");
    for (let i = 0; i < 6; i++) {
      const label = get(`option_${String.fromCharCode(97 + i)}`);
      if (!label) {
        if (correct.includes(String.fromCharCode(65 + i))) issue(index + 2, "Đáp án trỏ tới lựa chọn rỗng.");
        if (Array.from({ length: 5 - i }, (_, j) => get(`option_${String.fromCharCode(98 + i + j)}`)).some(Boolean)) issue(index + 2, "Không để ô lựa chọn rỗng giữa các lựa chọn có nội dung.");
      } else q.options.push({ label, is_correct: correct.includes(String.fromCharCode(65 + i)) });
    }
    try { const a: unknown = get("accepted_answers") ? JSON.parse(get("accepted_answers")) : []; if (!Array.isArray(a) || !a.every(x => typeof x === "string")) throw new Error(); q.accepted_answers = a; } catch { issue(index + 2, 'accepted_answers cần là mảng JSON, ví dụ ["mèo","con mèo"].'); }
    if (get("ignore_diacritics") && !["true", "false"].includes(get("ignore_diacritics"))) issue(index + 2, "ignore_diacritics cần true hoặc false.");
    q.ignore_diacritics = get("ignore_diacritics") === "true";
    const p = get("points").replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(p)) { q.pointUnits = null; issue(index + 2, "Điểm cần là số, tối đa 2 chữ số thập phân.", true); } else q.pointUnits = Math.round(Number(p) * 100);
    const name = get("section") || "Phần 1";
    let section = result.form.document.sections.find(s => s.title === name);
    if (!section) { section = { id: crypto.randomUUID(), title: name, questions: [] }; result.form.document.sections.push(section); }
    section.questions.push(q);
    const single = { ...result.form, document: { ...result.form.document, sections: [{ ...section, questions: [q] }] } };
    for (const problem of examIssues(single, true)) issue(index + 2, problem.message, true);
    if (kind === "short_text" && (q.options.length || correct.length)) issue(index + 2, "Câu trả lời ngắn không dùng lựa chọn A–F.");
    if (kind !== "short_text" && q.accepted_answers.length) issue(index + 2, "Câu lựa chọn không dùng accepted_answers.");
  }
  for (const problem of examIssues(result.form)) issue(0, `${problem.path}: ${problem.message}`);
  if (!result.form.document.sections.some(s => s.questions.length)) issue(0, "Chưa nhận được câu hỏi nào.");
  return result;
}
