import { describe, expect, it } from "vitest";
import { MAX_QUESTIONS_PER_QUIZ } from "@/lib/quiz/limits";
import { rowsToQuestions } from "./rows";
import { hasBlockingIssue } from "./types";

const HEADER = ["Loại câu", "Câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Thời gian (giây)", "Đáp án chấp nhận", "Bỏ dấu"];
const row = (kind: string, prompt: string, options: string[], correct: string, time = "", accepted = "", ignore = "") => [
  kind,
  prompt,
  ...Array.from({ length: 4 }, (_, i) => options[i] ?? ""),
  correct,
  time,
  accepted,
  ignore,
];
const errors = (parse: ReturnType<typeof rowsToQuestions>) => parse.issues.filter((issue) => issue.severity === "error");

describe("bảng ô thành câu hỏi", () => {
  it("bốn dạng câu, đáp án đúng ghi bằng chữ cái, số hoặc nguyên văn lựa chọn", () => {
    const parse = rowsToQuestions([
      HEADER,
      row("Một đáp án", "Câu 1", ["a", "b", "c", "d"], "B", "20"),
      row("Một đáp án", "Câu 2", ["a", "b", "c", "d"], "3"),
      row("Một đáp án", "Câu 3", ["Hà Nội", "Huế"], "huế"),
      row("Nhiều đáp án", "Câu 4", ["x", "y", "z"], "A, C", "30"),
      row("Nhiều đáp án", "Câu 5", ["x", "y", "z"], "1; 2"),
      row("Đúng/sai", "Câu 6", [], "Sai"),
      row("Điền từ", "Câu 7", [], "", "10", "mèo | con mèo", "có"),
    ]);
    expect(errors(parse)).toEqual([]);
    const picked = (i: number) => parse.questions[i].question.options.filter((o) => o.is_correct).map((o) => o.label);
    expect(picked(0)).toEqual(["b"]);
    expect(picked(1)).toEqual(["c"]);
    expect(picked(2)).toEqual(["Huế"]);
    expect(picked(3)).toEqual(["x", "z"]);
    expect(picked(4)).toEqual(["x", "y"]);
    expect(parse.questions[0].question.time_limit_seconds).toBe(20);
    expect(parse.questions[5].question).toMatchObject({ kind: "true_false", options: [{ label: "Đúng", is_correct: false }, { label: "Sai", is_correct: true }] });
    expect(parse.questions[6].question).toMatchObject({ kind: "short_text", accepted_answers: ["mèo", "con mèo"], ignore_diacritics: true, time_limit_seconds: 10, options: [] });
    expect(parse.questions.map((q) => q.line)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("để trống cột Loại thì tự suy ra", () => {
    const parse = rowsToQuestions([
      HEADER,
      row("", "Điền từ", [], "", "", "mèo"),
      row("", "Đúng sai", ["Đúng", "Sai"], "A"),
      row("", "Nhiều", ["1", "2", "3"], "A,B"),
      row("", "Một", ["1", "2", "3"], "C"),
      row("", "Điền từ chỉ có đáp án đúng", [], "chó"),
    ]);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions.map((q) => q.question.kind)).toEqual(["short_text", "true_false", "multi", "single", "short_text"]);
    expect(parse.questions[1].question.options.map((o) => o.is_correct)).toEqual([true, false]);
    expect(parse.questions[4].question.accepted_answers).toEqual(["chó"]);
  });

  it("nhận nhiều cách gọi tên cột (có dấu hay không, hoa hay thường) và cột lựa chọn kiểu số", () => {
    const parse = rowsToQuestions([
      ["LOAI CAU", "cau hoi", "Phương án 1", "Phương án 2", "dap an dung", "THOI GIAN"],
      ["", "Có tên cột lạ", "x", "y", "2", "60"],
    ]);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question).toMatchObject({ kind: "single", time_limit_seconds: 60 });
    expect(parse.questions[0].question.options.filter((o) => o.is_correct).map((o) => o.label)).toEqual(["y"]);
  });

  it("ô lựa chọn trống ở giữa vẫn giữ đúng chữ cái (A, C, D -> chọn C là lựa chọn thứ hai)", () => {
    const parse = rowsToQuestions([HEADER, ["", "Câu có khoảng trống", "a", "", "c", "d", "C"]]);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question.options).toEqual([
      { label: "a", is_correct: false },
      { label: "c", is_correct: true },
      { label: "d", is_correct: false },
    ]);
    // Chữ cái trỏ vào ô trống bị báo.
    const bad = rowsToQuestions([HEADER, ["", "Trỏ vào ô trống", "a", "", "c", "d", "B"]]);
    expect(errors(bad)[0].message).toContain('"B" không có lựa chọn B');
  });

  it("báo lỗi đúng hàng gốc và bỏ qua hàng trống; hàng lỗi không chặn các hàng đúng nhưng chặn việc tạo quiz", () => {
    const parse = rowsToQuestions([
      ["", "", "", "", "", "", "", "", "", ""], // hàng trống đầu (không phải tiêu đề)
      HEADER, // hàng 2 là tiêu đề
      row("Một đáp án", "Hàng 3 đúng", ["a", "b"], "A"),
      row("Một đáp án", "Hàng 4 thiếu đáp án đúng", ["a", "b"], ""),
      ["", "", "", "", "", "", "", "", "", ""], // hàng 5 trống
      row("Một đáp án", "Hàng 6 chỉ một lựa chọn", ["a"], "A"),
      row("Nhiều đáp án", "", ["a", "b"], "A"), // hàng 7 thiếu câu hỏi
    ]);
    expect(parse.questions.map((q) => q.line)).toEqual([3]);
    expect(errors(parse).map((issue) => issue.line)).toEqual([4, 6, 7]);
    expect(errors(parse)[0].message).toContain("cần chọn đúng một đáp án đúng");
    expect(errors(parse)[1].message).toContain("cần ít nhất 2 lựa chọn");
    expect(errors(parse)[2].message).toContain("Câu hỏi: Nhập nội dung câu hỏi");
    expect(hasBlockingIssue(parse)).toBe(true);
  });

  it("đáp án đúng không khớp, loại câu lạ, đúng/sai không rõ đáp án đều báo lỗi dễ hiểu", () => {
    const parse = rowsToQuestions([
      HEADER,
      row("Một đáp án", "Đáp án lạ", ["a", "b"], "Z"),
      row("Câu lạ", "Loại lạ", ["a", "b"], "A"),
      row("Đúng/sai", "Không rõ", [], "có lẽ"),
      row("Một đáp án", "Hai đáp án trùng", ["a", "A"], "A"),
    ]);
    const messages = errors(parse).map((issue) => issue.message);
    expect(messages[0]).toContain('Đáp án đúng "Z" không khớp');
    expect(messages[1]).toContain('Loại câu "Câu lạ" không hợp lệ');
    expect(messages[2]).toContain('"Đúng" hoặc "Sai"');
    expect(messages[3]).toContain("hai lựa chọn trùng nhau");
  });

  it("thời gian ngoài danh sách chỉ là cảnh báo và dùng mặc định 20 giây; vẫn tạo được quiz", () => {
    const parse = rowsToQuestions([HEADER, row("Một đáp án", "Thời gian lạ", ["a", "b"], "A", "45")]);
    expect(parse.questions[0].question.time_limit_seconds).toBe(20);
    expect(parse.issues).toEqual([{ line: 2, severity: "warning", message: expect.stringContaining('"45"') }]);
    expect(hasBlockingIssue(parse)).toBe(false);
  });

  it("chuẩn hoá chữ: gõ dấu kiểu tổ hợp thành dựng sẵn, bỏ ký tự vô hình và điều khiển, cắt khoảng trắng", () => {
    // Dựng từ mã ký tự để mã nguồn không chứa ký tự vô hình: dấu tổ hợp, khoảng rộng bằng không, ký tự điều khiển.
    const grave = String.fromCharCode(0x300);
    const circumflex = String.fromCharCode(0x302);
    const dotBelow = String.fromCharCode(0x323);
    const zeroWidth = String.fromCharCode(0x200b);
    const bell = String.fromCharCode(7);
    const decomposed = `  Ha${grave} No${circumflex}${dotBelow}i${zeroWidth}?${bell} `;
    const parse = rowsToQuestions([HEADER, row("Một đáp án", decomposed, [`a${zeroWidth}b`, "c"], "A")]);
    expect(parse.questions[0].question.prompt).toBe("Hà Nội?");
    expect(parse.questions[0].question.options[0].label).toBe("ab");
  });

  it("giới hạn độ dài theo đúng luật của trình soạn", () => {
    const parse = rowsToQuestions([
      HEADER,
      row("Một đáp án", "x".repeat(501), ["a", "b"], "A"),
      row("Một đáp án", "Lựa chọn dài", ["y".repeat(151), "b"], "A"),
      row("Điền từ", "Đáp án dài", [], "", "", "z".repeat(101)),
    ]);
    const messages = errors(parse).map((issue) => issue.message);
    expect(messages[0]).toContain("Tối đa 500 ký tự");
    expect(messages[1]).toContain("Lựa chọn A");
    expect(messages[1]).toContain("Tối đa 150 ký tự");
    expect(messages[2]).toContain("Tối đa 100 ký tự");
  });

  it("quá 50 câu thì báo lỗi mức tệp (vẫn trả các câu đã đọc để xem trước)", () => {
    const many = Array.from({ length: MAX_QUESTIONS_PER_QUIZ + 1 }, (_, i) => row("Một đáp án", `Câu ${i + 1}`, ["a", "b"], "A"));
    const parse = rowsToQuestions([HEADER, ...many]);
    expect(parse.questions).toHaveLength(MAX_QUESTIONS_PER_QUIZ + 1);
    expect(errors(parse)).toEqual([{ line: 0, severity: "error", message: expect.stringContaining(`tối đa ${MAX_QUESTIONS_PER_QUIZ} câu`) }]);
    expect(hasBlockingIssue(parse)).toBe(true);
  });

  it("thiếu cột Câu hỏi, tệp trống hoặc chỉ có tiêu đề đều báo rõ và không có câu nào", () => {
    expect(errors(rowsToQuestions([["Cột lạ", "Cột khác"], ["a", "b"]]))[0].message).toContain('cột "Câu hỏi"');
    expect(errors(rowsToQuestions([]))[0].message).toContain("không có dữ liệu");
    expect(errors(rowsToQuestions([[""], [""]]))[0].message).toContain("không có dữ liệu");
    const onlyHeader = rowsToQuestions([HEADER]);
    expect(onlyHeader.questions).toEqual([]);
    expect(errors(onlyHeader)[0].message).toContain("chưa có câu hỏi");
    expect(hasBlockingIssue(onlyHeader)).toBe(true);
  });

  it("đáp án chấp nhận trùng nhau chỉ giữ một, và bỏ dấu chỉ có nghĩa với câu điền từ", () => {
    const parse = rowsToQuestions([HEADER, row("Điền từ", "Trùng", [], "", "", "mèo | mèo |  mèo ", "có"), row("Một đáp án", "Không điền từ", ["a", "b"], "A", "", "", "có")]);
    expect(parse.questions[0].question.accepted_answers).toEqual(["mèo"]);
    expect(parse.questions[1].question.ignore_diacritics).toBe(false);
  });
});
