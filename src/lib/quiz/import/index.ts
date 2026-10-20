import { parseCsv, tooLarge } from "./csv";
import { rowsToQuestions } from "./rows";
import { parseQuizText } from "./text";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, type ImportParse } from "./types";
import { readXlsxGrid } from "./xlsx";

export * from "./types";
export { buildTemplateCsv, TEXT_SYNTAX_EXAMPLE, TEMPLATE_HEADER, TEMPLATE_ROWS } from "./template";
export { parseQuizText } from "./text";
export { rowsToQuestions } from "./rows";
export { parseCsv } from "./csv";

const fail = (message: string): ImportParse => ({ questions: [], issues: [{ line: 0, severity: "error", message }] });

const mb = Math.round(IMPORT_MAX_BYTES / 1_000_000);

/** Tên quiz gợi ý từ tên tệp: bỏ đuôi, đổi gạch dưới và gạch ngang thành khoảng trắng. */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Đọc một tệp .csv hoặc .xlsx giáo viên chọn. Mọi thứ diễn ra ở trình duyệt. */
export async function parseImportFile(file: File): Promise<ImportParse> {
  const name = file.name.toLowerCase();
  if (file.size > IMPORT_MAX_BYTES) return fail(`Tệp quá lớn (tối đa ${mb} MB). Thầy cô tách thành nhiều tệp nhỏ hơn nhé.`);

  if (name.endsWith(".xlsx")) {
    const result = await readXlsxGrid(file);
    if (!result.ok) return fail(result.message);
    const parsed = rowsToQuestions(result.grid);
    if (result.truncated > 0) parsed.issues.push(truncatedWarning(result.truncated));
    return parsed;
  }
  if (name.endsWith(".xls")) {
    return fail("Đây là tệp Excel cũ (.xls). Thầy cô mở tệp bằng Excel rồi chọn Lưu thành, định dạng Excel (.xlsx) hoặc CSV UTF-8 nhé.");
  }
  if (name.endsWith(".csv")) {
    const csv = parseCsv(await file.text());
    if (csv.encodingSuspect) {
      return fail("Tệp CSV có chữ bị lỗi mã hoá (chữ có dấu thành �). Thầy cô lưu tệp ở dạng CSV UTF-8 (hoặc dùng .xlsx) rồi chọn lại nhé.");
    }
    const parsed = rowsToQuestions(csv.grid);
    if (csv.truncated > 0) parsed.issues.push(truncatedWarning(csv.truncated));
    return parsed;
  }
  return fail("Chỉ nhận tệp .csv hoặc .xlsx.");
}

function truncatedWarning(extra: number) {
  return {
    line: 0,
    severity: "warning" as const,
    message: `Chỉ đọc ${IMPORT_MAX_ROWS} hàng đầu, bỏ ${extra} hàng còn lại.`,
  };
}

/** Đọc đoạn văn bản dán theo cú pháp. */
export function parseImportText(text: string): ImportParse {
  return parseQuizText(text);
}

export { tooLarge };
