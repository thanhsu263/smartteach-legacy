import { MAX_QUESTIONS_PER_QUIZ } from "@/lib/quiz/limits";
import { buildQuestion } from "./build";
import { fold } from "./normalize";
import { IMPORT_HEADER_SCAN_ROWS, type Grid, type ImportedQuestion, type ImportIssue, type ImportParse, type RawQuestion } from "./types";

type Column = "kind" | "prompt" | "correct" | "time" | "accepted" | "ignore" | { option: number };

/** Nhận ra một tiêu đề cột (đã `fold`) là cột gì; null nếu không biết. Chấp nhận nhiều cách gọi cho cùng một cột. */
function classify(key: string): Column | null {
  if (key === "") return null;
  if (["loai", "loaicau", "dang", "dangcau", "kind", "type"].includes(key)) return "kind";
  if (["cauhoi", "noidung", "noidungcauhoi", "question", "prompt", "de"].includes(key)) return "prompt";
  if (["dapandung", "dapan", "dung", "correct", "answer", "dapancorrect"].includes(key)) return "correct";
  if (["thoigian", "thoigiangiay", "giay", "time", "timelimit"].includes(key)) return "time";
  if (key.startsWith("dapanchapnhan") || key.startsWith("chapnhan") || key.startsWith("accepted") || key === "dapandienwu") return "accepted";
  if (key.startsWith("bodau") || key.startsWith("ignorediacritics") || key === "khongphandau") return "ignore";
  // Lựa chọn: "Lựa chọn A", "Đáp án A", "Phương án 1", "A", "1"...
  const option = /^(?:luachon|dapan|phuongan|option|choice)?([a-f1-6])$/.exec(key);
  if (option) {
    const value = option[1];
    return { option: /[a-f]/.test(value) ? value.charCodeAt(0) - 97 : Number(value) - 1 };
  }
  return null;
}

const YES = new Set(["co", "x", "1", "true", "yes", "y", "dung"]);

/** Tách ô "đáp án đúng" thành từng mục: ngăn bằng dấu phẩy, chấm phẩy, gạch đứng hoặc xuống dòng. */
function splitTokens(cell: string): string[] {
  return cell
    .split(/[,;|\n]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/**
 * Bảng ô (từ CSV hoặc .xlsx) thành danh sách câu hỏi. Hàng đầu tiên không trống là hàng tiêu đề; mỗi hàng sau là một câu.
 * Lỗi và cảnh báo ghi kèm số hàng gốc (đếm từ 1 như trong Excel).
 */
export function rowsToQuestions(grid: Grid): ImportParse {
  const issues: ImportIssue[] = [];
  const questions: ImportedQuestion[] = [];

  const firstFilled = grid.findIndex((row) => row.some((cell) => cell.trim() !== ""));
  if (firstFilled < 0) {
    return { questions, issues: [{ line: 0, severity: "error", message: "Tệp không có dữ liệu." }] };
  }
  // Hàng tiêu đề là hàng đầu tiên (trong IMPORT_HEADER_SCAN_ROWS hàng đầu) có cột "Câu hỏi"; phía trên nó có thể có dòng tiêu
  // đề trang hay ghi chú. Số dòng báo lỗi vẫn là số hàng gốc nên đếm từ hàng đầu của tệp.
  let headerIndex = grid.slice(0, IMPORT_HEADER_SCAN_ROWS).findIndex((row) => row.some((cell) => classify(fold(cell)) === "prompt"));
  if (headerIndex < 0) headerIndex = firstFilled;

  const columns = new Map<number, Column>();
  grid[headerIndex].forEach((cell, index) => {
    const column = classify(fold(cell));
    if (column !== null && !([...columns.values()] as Column[]).some((existing) => JSON.stringify(existing) === JSON.stringify(column))) {
      columns.set(index, column);
    }
  });
  const has = (name: Column) => [...columns.values()].some((column) => JSON.stringify(column) === JSON.stringify(name));
  if (!has("prompt")) {
    return {
      questions,
      issues: [
        {
          line: headerIndex + 1,
          severity: "error",
          message: `Không thấy cột "Câu hỏi" trong ${IMPORT_HEADER_SCAN_ROWS} hàng đầu của tệp. Thầy cô tải tệp mẫu rồi điền theo đúng tên cột nhé.`,
        },
      ],
    };
  }

  const dataRows = grid.slice(headerIndex + 1);
  dataRows.forEach((row, offset) => {
    if (row.every((cell) => cell.trim() === "")) return;
    const line = headerIndex + 2 + offset;
    const raw: RawQuestion = {
      line,
      kindText: "",
      prompt: "",
      options: [],
      correctSlots: [],
      correctTokens: [],
      accepted: [],
      ignoreDiacritics: false,
      timeText: "",
    };
    columns.forEach((column, index) => {
      const cell = row[index] ?? "";
      if (column === "kind") raw.kindText = cell;
      else if (column === "prompt") raw.prompt = cell;
      else if (column === "correct") raw.correctTokens = splitTokens(cell);
      else if (column === "time") raw.timeText = cell;
      else if (column === "accepted") raw.accepted = cell.split(/[|\n]+/);
      else if (column === "ignore") raw.ignoreDiacritics = YES.has(fold(cell));
      else if (cell.trim() !== "") raw.options.push({ slot: column.option, label: cell });
    });
    raw.options.sort((a, b) => a.slot - b.slot);

    const built = buildQuestion(raw, questions.length + 1);
    issues.push(...built.issues);
    if (built.question) questions.push(built.question);
  });

  if (questions.length + issues.filter((issue) => issue.severity === "error").length === 0) {
    issues.push({ line: 0, severity: "error", message: "Tệp chưa có câu hỏi nào dưới hàng tiêu đề." });
  }
  if (questions.length > MAX_QUESTIONS_PER_QUIZ) {
    issues.push({
      line: 0,
      severity: "error",
      message: `Một quiz tối đa ${MAX_QUESTIONS_PER_QUIZ} câu, tệp có ${questions.length} câu. Thầy cô tách thành nhiều tệp nhé.`,
    });
  }
  return { questions, issues };
}
