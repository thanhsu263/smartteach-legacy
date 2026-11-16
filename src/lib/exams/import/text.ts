import { rowsToExam } from "./rows";
import { TEMPLATE_COLUMNS, type ExamParse, type SourceText } from "./types";
export function textToExam(sections: SourceText[]): ExamParse {
  const rows = [TEMPLATE_COLUMNS]; const locations: SourceText["locator"][] = [];
  const errors: ExamParse["issues"] = [];
  const full = sections.map(s => s.text).join("\n");
  if (full.length > 100000 || !full.replace(/^\uFEFF/, "").trimStart().startsWith("SMARTTEACH-EXAM:1")) return { ...rowsToExam([]), issues: [{ severity: "error", locator: {}, message: "Tệp cần bắt đầu bằng SMARTTEACH-EXAM:1 và không vượt 100.000 ký tự. Dùng tệp mẫu hoặc chọn AI khi có Premium." }] };
  let part = "Phần 1", fields: Record<string, string> | null = null, at: SourceText["locator"] = {}, last = "";
  const map: Record<string, string> = { "LOẠI": "kind", "ĐIỂM": "points", "NỘI DUNG": "prompt", "ĐÁP ÁN": "correct", "CHẤP NHẬN": "accepted_answers", "BỎ DẤU": "ignore_diacritics", A: "option_a", B: "option_b", C: "option_c", D: "option_d", E: "option_e", F: "option_f" };
  const finish = () => { if (fields) { rows.push(TEMPLATE_COLUMNS.map(c => c === "section" ? part : fields![c] ?? "")); locations.push(at); fields = null; } };
  for (const source of sections) for (const raw of source.text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line === "SMARTTEACH-EXAM:1") continue;
    if (line.startsWith("PHẦN:")) { finish(); part = line.slice(5).trim(); last = ""; continue; }
    if (/^CÂU:\s*\d+$/.test(line)) { finish(); fields = {}; at = source.locator; last = ""; continue; }
    if (line.startsWith("| ") && fields && last) { fields[last] += "\n" + line.slice(2); continue; }
    const match = /^(LOẠI|ĐIỂM|NỘI DUNG|ĐÁP ÁN|CHẤP NHẬN|BỎ DẤU|[A-F]):\s*(.*)$/.exec(line);
    if (!fields || !match || Object.hasOwn(fields, map[match[1]])) { errors.push({ severity: "error", locator: source.locator, message: `Dòng không đúng mẫu hoặc trường trùng: ${line.slice(0, 70)}` }); continue; }
    last = map[match[1]]; fields[last] = match[2];
  }
  finish(); const result = rowsToExam(rows);
  result.issues = [...errors, ...result.issues.map(issue => ({ ...issue, locator: issue.locator.row && issue.locator.row >= 2 ? locations[issue.locator.row - 2] ?? issue.locator : issue.locator }))];
  return result;
}
