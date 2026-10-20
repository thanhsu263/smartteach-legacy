import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { buildTemplateCsv, TEMPLATE_HEADER, TEMPLATE_ROWS, TEXT_SYNTAX_EXAMPLE } from "./template";
import { rowsToQuestions } from "./rows";
import { SAMPLE_QUESTIONS } from "./sample-expected";
import { parseQuizText } from "./text";
import { readXlsxGrid } from "./xlsx";
import { IMPORT_MAX_BYTES } from "./types";

const fixtures = join(__dirname, "../../../../tests/fixtures");
const questionsOf = (parse: { questions: { question: unknown }[] }) => parse.questions.map((q) => q.question);

describe("tệp mẫu, tệp .xlsx và văn bản dán cho cùng một bộ câu hỏi", () => {
  it("tệp mẫu CSV do ứng dụng tạo ra đọc lại đúng bốn dạng câu", () => {
    const parse = rowsToQuestions(parseCsv(buildTemplateCsv()).grid);
    expect(parse.issues).toEqual([]);
    expect(questionsOf(parse)).toEqual(SAMPLE_QUESTIONS);
  });

  it("tệp mẫu bắt đầu bằng BOM và dòng sep=, để Excel (kể cả máy đặt vùng tiếng Việt) mở đúng cột và chữ có dấu", () => {
    const csv = buildTemplateCsv();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).startsWith("sep=,\r\n")).toBe(true);
    expect(csv).toContain(TEMPLATE_HEADER.join(","));
    // Ô có dấu phẩy hoặc ngoặc kép được bao trong ngoặc kép.
    expect(csv).toContain('"A, C"');
  });

  it("tệp quiz-mau.csv trong kho khớp với bản do ứng dụng tạo (chạy lại make-quiz-xlsx.mjs nếu lệch)", () => {
    expect(readFileSync(join(fixtures, "quiz-mau.csv"), "utf8")).toBe(buildTemplateCsv());
  });

  it("văn bản dán ví dụ cho cùng kết quả như tệp mẫu", () => {
    const parse = parseQuizText(TEXT_SYNTAX_EXAMPLE);
    expect(parse.issues).toEqual([]);
    expect(questionsOf(parse)).toEqual(SAMPLE_QUESTIONS);
  });

  it("tệp quiz-mau.xlsx (cột Thời gian là số) đọc ra cùng bảng ô và cùng bộ câu như CSV", async () => {
    const bytes = readFileSync(join(fixtures, "quiz-mau.xlsx"));
    const result = await readXlsxGrid(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Bảng ô khớp: hàng tiêu đề rồi bốn hàng mẫu (ô trống là chuỗi rỗng, số 20 thành "20").
    expect(result.grid[0]).toEqual([...TEMPLATE_HEADER]);
    expect(result.grid.slice(1).map((row) => [...row, ...Array(TEMPLATE_HEADER.length).fill("")].slice(0, TEMPLATE_HEADER.length))).toEqual(TEMPLATE_ROWS);
    const parse = rowsToQuestions(result.grid);
    expect(parse.issues).toEqual([]);
    expect(questionsOf(parse)).toEqual(SAMPLE_QUESTIONS);
  });

  it("tệp .xlsx hỏng hoặc không phải Excel, và tệp quá lớn: báo bằng lời dễ hiểu", async () => {
    const notZip = new TextEncoder().encode("đây không phải tệp xlsx");
    const bad = await readXlsxGrid(notZip.buffer as ArrayBuffer);
    expect(bad).toMatchObject({ ok: false });
    expect(!bad.ok && bad.message).toContain("Không đọc được");

    const big = await readXlsxGrid(new ArrayBuffer(IMPORT_MAX_BYTES + 1));
    expect(big).toMatchObject({ ok: false });
    expect(!big.ok && big.message).toContain("quá lớn");
  });
});
