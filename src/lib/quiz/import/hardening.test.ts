import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { parseImportFile } from "./index";
import { rowsToQuestions } from "./rows";
import { buildTemplateCsv } from "./template";
import { parseQuizText } from "./text";
import { IMPORT_MAX_BYTES, IMPORT_MAX_LINE, IMPORT_MAX_TEXT } from "./types";
import { readXlsxGrid } from "./xlsx";

const HEADER = ["Câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng"];
const errors = (parse: { issues: { severity: string; message: string; line: number }[] }) => parse.issues.filter((issue) => issue.severity === "error");
const fixtures = join(__dirname, "../../../../tests/fixtures");

describe("đáp án đúng có thể là vị trí hoặc nội dung: không chọn ngầm khi hai cách hiểu trỏ tới hai lựa chọn khác nhau", () => {
  it("lựa chọn là các số 2, 3, 4, 5 mà đáp án ghi 2 hoặc 3 thì báo lỗi rõ thay vì chọn nhầm", () => {
    for (const answer of ["2", "3", "4"]) {
      const parse = rowsToQuestions([HEADER, ["Số nào?", "2", "3", "4", "5", answer]]);
      expect(parse.questions, `đáp án ${answer}`).toEqual([]);
      expect(errors(parse)[0].message).toContain("chưa rõ ý");
      expect(errors(parse)[0].message).toContain(`"${answer}"`);
    }
  });

  it("lựa chọn đánh số theo đúng thứ tự (1, 2, 3, 4) thì hai cách hiểu trùng nhau nên không lỗi", () => {
    const parse = rowsToQuestions([HEADER, ["Số nào?", "1", "2", "3", "4", "3"]]);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question.options.filter((o) => o.is_correct).map((o) => o.label)).toEqual(["3"]);
  });

  it("chữ cái cũng vậy: lựa chọn C, A, B mà đáp án ghi A là mơ hồ; viết rõ bằng cách khác thì rõ", () => {
    const ambiguous = rowsToQuestions([HEADER, ["Chữ nào?", "C", "A", "B", "", "A"]]);
    expect(ambiguous.questions).toEqual([]);
    expect(errors(ambiguous)[0].message).toContain("chưa rõ ý");
    // Nhãn lựa chọn đúng thứ tự A, B, C: hai cách hiểu trùng.
    expect(errors(rowsToQuestions([HEADER, ["Chữ nào?", "A", "B", "C", "", "B"]]))).toEqual([]);
  });

  it("khi không có lựa chọn ở vị trí đó thì chỉ còn cách hiểu là nội dung (đáp án 5 với các lựa chọn 2, 3, 4, 5)", () => {
    const parse = rowsToQuestions([HEADER, ["Số nào?", "2", "3", "4", "5", "5"]]);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question.options.filter((o) => o.is_correct).map((o) => o.label)).toEqual(["5"]);
  });

  it("văn bản dán cũng bị chặn cùng cách", () => {
    const parse = parseQuizText("Số nào?\nA. 2\nB. A\nC. 4\nĐáp án: A");
    expect(parse.questions).toEqual([]);
    expect(errors(parse)[0].message).toContain("chưa rõ ý");
  });
});

describe("hàng tiêu đề không nhất thiết là hàng đầu tiên", () => {
  it("có dòng tiêu đề trang và hàng trống phía trên thì vẫn thấy tiêu đề; số dòng báo lỗi là số hàng gốc", () => {
    const parse = rowsToQuestions([
      ["Bộ câu hỏi Toán lớp 5", "", "", "", "", ""],
      [""],
      ["Ghi chú: điền đáp án bằng chữ cái"],
      HEADER, // hàng 4
      ["Câu đúng?", "a", "b", "", "", "A"], // hàng 5
      ["Câu thiếu đáp án?", "a", "b", "", "", ""], // hàng 6
    ]);
    expect(parse.questions.map((q) => q.line)).toEqual([5]);
    expect(errors(parse).map((issue) => issue.line)).toEqual([6]);
  });

  it("tiêu đề nằm quá xa (sau 10 hàng) thì báo không thấy cột, nói rõ đã tìm trong bao nhiêu hàng", () => {
    const filler = Array.from({ length: 10 }, (_, i) => [`ghi chú ${i}`]);
    const parse = rowsToQuestions([...filler, HEADER, ["Câu?", "a", "b", "", "", "A"]]);
    expect(parse.questions).toEqual([]);
    expect(errors(parse)[0].message).toContain("10 hàng đầu");
    expect(errors(parse)[0].line).toBe(1);
  });
});

describe("CSV: dấu ngoặc kép chưa đóng", () => {
  it("báo dòng nơi ngoặc được mở (kể cả sau dòng sep= và xuống dòng trong ô)", () => {
    expect(parseCsv('Câu hỏi,Đáp án đúng\nCâu 1,A\n"Chưa đóng,B\nCâu 3,C\n').unterminatedQuoteLine).toBe(3);
    expect(parseCsv('sep=,\nCâu hỏi,Đáp án đúng\n"Chưa đóng,B\n').unterminatedQuoteLine).toBe(3);
    // Ô nhiều dòng đã đóng đúng thì không sao, và dòng đếm tiếp đúng sau nó.
    expect(parseCsv('a,b\n"dòng 1\ndòng 2",x\n"mở lại,y').unterminatedQuoteLine).toBe(4);
    expect(parseCsv('a,b\n"đóng đủ ""trích"" dẫn",x\n').unterminatedQuoteLine).toBeNull();
    expect(parseCsv(buildTemplateCsv()).unterminatedQuoteLine).toBeNull();
  });

  it("parseImportFile từ chối tệp có ngoặc kép chưa đóng bằng lời nhắn nêu số dòng, thay vì đọc ra một câu rác", async () => {
    const file = new File(['Câu hỏi,Đáp án đúng\n"Chưa đóng,A\nCâu 2,B\n'], "loi.csv");
    const parse = await parseImportFile(file);
    expect(parse.questions).toEqual([]);
    expect(parse.issues[0].message).toContain("dòng 2");
    expect(parse.issues[0].message).toContain("chưa đóng");
  });
});

describe("văn bản dán: giới hạn kích thước và độ dài dòng", () => {
  it("dòng quá dài bị từ chối ngay (không chạy biểu thức chính quy) bằng lỗi có số dòng", () => {
    const started = Date.now();
    const parse = parseQuizText(`Câu bình thường?\nA. x\nB. y\nĐáp án: A\n\nCâu${" ".repeat(60_000)}hỏi?\nA. x\nB. y\nĐáp án: A`);
    expect(Date.now() - started).toBeLessThan(500);
    expect(parse.questions).toEqual([]);
    expect(parse.issues).toEqual([{ line: 6, severity: "error", message: expect.stringContaining(`tối đa ${IMPORT_MAX_LINE}`) }]);
  });

  it("dòng đúng giới hạn vẫn đọc được; văn bản quá dài bị từ chối", () => {
    const longPrompt = "x".repeat(IMPORT_MAX_LINE);
    const parse = parseQuizText(`${longPrompt}\nA. a\nB. b\nĐáp án: A`);
    // Dòng đề dài 2000 ký tự vượt giới hạn 500 ký tự của câu hỏi nên báo lỗi của câu hỏi, không phải lỗi độ dài dòng.
    expect(errors(parse)[0].message).toContain("Tối đa 500 ký tự");
    const huge = parseQuizText("a\n".repeat(IMPORT_MAX_TEXT / 2 + 10));
    expect(huge.questions).toEqual([]);
    expect(huge.issues[0].message).toContain("quá dài");
  });
});

describe("tệp .xlsx lạ: chặn zip bomb trước khi giải nén", () => {
  const bytesOf = (entries: Record<string, number>) =>
    zipSync(Object.fromEntries(Object.entries(entries).map(([name, size]) => [name, [new Uint8Array(size), { level: 1 }]])));

  it("một mục khai báo giải nén 40 MB (tệp nén chỉ vài chục KB) bị từ chối ngay, không giải nén", async () => {
    const bomb = bytesOf({ "xl/worksheets/sheet1.xml": 40_000_000 });
    expect(bomb.length).toBeLessThan(IMPORT_MAX_BYTES / 4);
    const started = Date.now();
    const result = await readXlsxGrid(bomb.buffer as ArrayBuffer);
    expect(Date.now() - started).toBeLessThan(3000); // chưa giải nén nên nhanh (đọc không chạy hàng chục giây)
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("giải nén quá lớn");
  }, 60_000);

  it("một mục lớn hơn giới hạn một mục dù cả tệp chưa vượt giới hạn tổng cũng bị từ chối", async () => {
    const result = await readXlsxGrid(bytesOf({ "xl/worksheets/sheet1.xml": 25_000_000 }).buffer as ArrayBuffer);
    expect(!result.ok && result.message).toContain("giải nén quá lớn");
  }, 60_000);

  it("nhiều mục mỗi mục vừa phải nhưng tổng vượt giới hạn cũng bị từ chối", async () => {
    const bomb = bytesOf({ "a.xml": 10_000_000, "b.xml": 10_000_000, "c.xml": 10_000_000, "d.xml": 10_000_000 });
    const result = await readXlsxGrid(bomb.buffer as ArrayBuffer);
    expect(!result.ok && result.message).toContain("giải nén quá lớn");
  }, 60_000);

  it("tệp mẫu hợp lệ không bị chặn nhầm; tệp không phải zip vẫn báo lỗi định dạng như cũ", async () => {
    const sample = readFileSync(join(fixtures, "quiz-mau.xlsx"));
    expect((await readXlsxGrid(sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength) as ArrayBuffer)).ok).toBe(true);
    const notZip = await readXlsxGrid(strToU8("không phải zip").buffer as ArrayBuffer);
    expect(!notZip.ok && notZip.message).toContain("Không đọc được");
  });
});

describe("parseImportFile (điểm vào giáo viên dùng)", () => {
  it("đọc tệp mẫu CSV và tệp mẫu .xlsx qua File như trình duyệt", async () => {
    const csv = await parseImportFile(new File([readFileSync(join(fixtures, "quiz-mau.csv"))], "quiz-mau.csv"));
    expect(csv.issues).toEqual([]);
    expect(csv.questions).toHaveLength(4);
    const xlsx = await parseImportFile(new File([readFileSync(join(fixtures, "quiz-mau.xlsx"))], "quiz-mau.xlsx"));
    expect(xlsx.issues).toEqual([]);
    expect(xlsx.questions.map((q) => q.question)).toEqual(csv.questions.map((q) => q.question));
  });

  it("từ chối tệp .xls cũ, đuôi lạ, tệp quá lớn và CSV lỗi mã hoá bằng lời nhắn có bước tiếp theo", async () => {
    expect((await parseImportFile(new File(["x"], "cu.xls"))).issues[0].message).toContain("Lưu thành");
    expect((await parseImportFile(new File(["x"], "bai.docx"))).issues[0].message).toContain("Chỉ nhận tệp .csv hoặc .xlsx");
    const big = new File(["x"], "lon.csv");
    Object.defineProperty(big, "size", { value: IMPORT_MAX_BYTES + 1 });
    expect((await parseImportFile(big)).issues[0].message).toContain("quá lớn");
    expect((await parseImportFile(new File(["Câu h�i,A\n"], "hong.csv"))).issues[0].message).toContain("UTF-8");
  });
});
