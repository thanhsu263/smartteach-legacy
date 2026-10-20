import { describe, expect, it } from "vitest";
import { MAX_QUESTIONS_PER_QUIZ } from "@/lib/quiz/limits";
import { parseQuizText } from "./text";
import { hasBlockingIssue } from "./types";

const errors = (parse: ReturnType<typeof parseQuizText>) => parse.issues.filter((issue) => issue.severity === "error");
const correct = (parse: ReturnType<typeof parseQuizText>, i: number) => parse.questions[i].question.options.filter((o) => o.is_correct).map((o) => o.label);

describe("văn bản dán theo cú pháp", () => {
  it("lựa chọn A. B) đánh dấu đúng bằng * trước chữ cái hoặc sau nội dung; bỏ tiền tố Câu N: và 1.", () => {
    const parse = parseQuizText(`Câu 1: Thủ đô của Việt Nam?
*A. Hà Nội
B) Huế
c. Đà Nẵng *

2. Số nào là số chẵn?
✓A. 2
B. 3
C. 4 *`);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question.prompt).toBe("Thủ đô của Việt Nam?");
    expect(correct(parse, 0)).toEqual(["Hà Nội", "Đà Nẵng"]);
    expect(parse.questions[0].question.kind).toBe("multi"); // hai đáp án đúng nên là nhiều đáp án
    expect(parse.questions[1].question.prompt).toBe("Số nào là số chẵn?");
    expect(correct(parse, 1)).toEqual(["2", "4"]);
    expect(parse.questions.map((q) => q.line)).toEqual([1, 6]);
  });

  it("dòng Đáp án: B hoặc A, C (nhiều dạng chữ), kể cả khi thiếu dấu hay viết hoa", () => {
    const parse = parseQuizText(`Một đáp án?
A. x
B. y
Đáp án: B

Nhiều đáp án?
A. x
B. y
C. z
dap an: A, C

Hai chữ cách khoảng trắng?
A. x
B. y
C. z
Answer: B C`);
    expect(errors(parse)).toEqual([]);
    expect(correct(parse, 0)).toEqual(["y"]);
    expect(parse.questions[0].question.kind).toBe("single");
    expect(correct(parse, 1)).toEqual(["x", "z"]);
    expect(parse.questions[1].question.kind).toBe("multi");
    expect(correct(parse, 2)).toEqual(["y", "z"]);
  });

  it("đúng/sai nhận ra từ hai lựa chọn Đúng và Sai (thứ tự nào cũng được)", () => {
    const parse = parseQuizText(`Trái Đất tròn.
A. Đúng
B. Sai
Đáp án: A

Cá biết bay.
A. Sai
B. Đúng
Đáp án: A`);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions.map((q) => q.question.kind)).toEqual(["true_false", "true_false"]);
    expect(parse.questions[0].question.options.map((o) => o.is_correct)).toEqual([true, false]); // Đúng
    expect(parse.questions[1].question.options.map((o) => o.is_correct)).toEqual([false, true]); // A là "Sai" nên đáp án là Sai
  });

  it("câu điền từ: Đáp án: a | b và Bỏ dấu: có; thời gian đặt bằng [30s] ở cuối dòng câu hỏi", () => {
    const parse = parseQuizText(`Con vật kêu meo meo? [30s]
Đáp án: con mèo | mèo
Bỏ dấu: có`);
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question).toMatchObject({
      kind: "short_text",
      prompt: "Con vật kêu meo meo?",
      time_limit_seconds: 30,
      accepted_answers: ["con mèo", "mèo"],
      ignore_diacritics: true,
    });
  });

  it("câu hỏi nhiều dòng; nhiều dòng trống giữa các câu; kiểu xuống dòng Windows", () => {
    const parse = parseQuizText("Câu hỏi dài\r\nmột phần nữa của câu hỏi?\r\nA. x\r\nB. y\r\nĐáp án: A\r\n\r\n\r\n\r\nCâu hai?\r\nA. p\r\nB. q\r\nĐáp án: B\r\n");
    expect(errors(parse)).toEqual([]);
    expect(parse.questions[0].question.prompt).toBe("Câu hỏi dài\nmột phần nữa của câu hỏi?");
    expect(parse.questions).toHaveLength(2);
    expect(parse.questions[1].line).toBe(9);
  });

  it("dòng không hiểu sau lựa chọn, lựa chọn ghi hai lần, đáp án không khớp: báo đúng dòng, các câu khác vẫn đọc", () => {
    const parse = parseQuizText(`Câu tốt?
A. x
B. y
Đáp án: A

Câu có dòng lạ?
A. x
B. y
cái này là gì
Đáp án: A

Câu trùng chữ cái?
A. x
A. y

Câu đáp án sai?
A. x
B. y
Đáp án: D`);
    expect(parse.questions.map((q) => q.question.prompt)).toEqual(["Câu tốt?"]);
    const list = errors(parse).map((issue) => [issue.line, issue.message]);
    expect(list[0][0]).toBe(9);
    expect(list[0][1]).toContain("Không hiểu dòng này");
    expect(list[1][0]).toBe(14);
    expect(list[1][1]).toContain("bị ghi hai lần");
    expect(list[2][0]).toBe(16);
    expect(list[2][1]).toContain('"D"');
    expect(hasBlockingIssue(parse)).toBe(true);
  });

  it("câu thiếu đáp án đúng, văn bản trống và quá 50 câu đều báo lỗi", () => {
    expect(errors(parseQuizText("Câu?\nA. x\nB. y"))[0].message).toContain("cần chọn đúng một đáp án đúng");
    expect(errors(parseQuizText("   \n\n  "))[0].message).toContain("Chưa có nội dung");
    const many = Array.from({ length: MAX_QUESTIONS_PER_QUIZ + 1 }, (_, i) => `Câu ${i + 1}?\nA. x\nB. y\nĐáp án: A`).join("\n\n");
    const parse = parseQuizText(many);
    expect(parse.questions).toHaveLength(MAX_QUESTIONS_PER_QUIZ + 1);
    expect(errors(parse)).toEqual([{ line: 0, severity: "error", message: expect.stringContaining(`tối đa ${MAX_QUESTIONS_PER_QUIZ} câu`) }]);
  });

  it("chuẩn hoá chữ như khi đọc tệp: bỏ ký tự vô hình khi dán từ Word hay web", () => {
    const zeroWidth = String.fromCharCode(0x200b);
    const parse = parseQuizText(`Hà${zeroWidth} Nội?\nA. x${zeroWidth}\nB. y\nĐáp án: A`);
    expect(parse.questions[0].question.prompt).toBe("Hà Nội?");
    expect(parse.questions[0].question.options[0].label).toBe("x");
  });
});
