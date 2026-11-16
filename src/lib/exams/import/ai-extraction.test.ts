import { describe, expect, it } from "vitest";
import { parseAiExtraction } from "./ai-extraction";
const sources = [{ text: "Câu 1 (1 điểm). Số nào là số nguyên tố?\nA. 12\nB. 17\nĐáp án: B", locator: { page: 1 } }];
const question = { section: "I", kind: "single", prompt: "Số nào là số nguyên tố?", options: [{ label: "12", is_correct: false }, { label: "17", is_correct: true }], accepted_answers: [], ignore_diacritics: false, points: 1, excerpt: sources[0].text, answerExcerpt: "Đáp án: B", locatorIndex: 0 };
describe("AI extraction source boundary", () => {
  it("có nguồn thật, giữ lựa chọn/điểm và đoạn đáp án", () => {
    const result = parseAiExtraction({ questions: [question], unparsed: [] }, sources, "Đề thử");
    expect(result.form.document.sections[0].questions[0].options[1].is_correct).toBe(true);
    expect(result.provenance[0].locator).toEqual({ page: 1 });
    expect(result.form.document.sections[0].questions[0].pointUnits).toBe(100);
  });
  it("thiếu hoặc giả nguồn đáp án phải xóa key model tự đưa vào", () => {
    for (const answerExcerpt of [null, "Đáp án: C", "17 là số nguyên tố"]) {
      const r = parseAiExtraction({ questions: [{ ...question, answerExcerpt }], unparsed: [] }, sources, "Đề thử");
      expect(r.form.document.sections[0].questions[0].options.every(o => !o.is_correct)).toBe(true);
      expect(r.warnings.some(w => w.includes("bổ sung"))).toBe(true);
    }
  });
  it("key trích có chữ B nhưng model chọn A không được dùng làm khóa chấm", () => {
    const r = parseAiExtraction({ questions: [{ ...question, options: [{ label: "12", is_correct: true }, { label: "17", is_correct: false }] }], unparsed: [] }, sources, "Đề thử");
    expect(r.form.document.sections[0].questions[0].options.every(o => !o.is_correct)).toBe(true);
  });
  it("không chấp nhận câu bịa, locator giả hoặc nhận thiếu nội dung", () => {
    for (const raw of [{ questions: [{ ...question, prompt: "Câu không có trong nguồn" }], unparsed: [] }, { questions: [{ ...question, locatorIndex: 20 }], unparsed: [] }, { questions: [question], unparsed: ["bỏ câu 2"] }]) expect(() => parseAiExtraction(raw, sources, "Đề")).toThrow("invalid_extract");
  });
  it("đọc câu Word có lựa chọn ở đoạn tiếp theo", () => {
    const split = [{ text: "Số nào là số nguyên tố?", locator: { paragraph: 1 } }, { text: "A. 12\nB. 17\nĐáp án: B", locator: { paragraph: 2 } }];
    const r = parseAiExtraction({ questions: [{ ...question, excerpt: split.map(s => s.text).join("\n") }], unparsed: [] }, split, "Đề");
    expect(r.form.document.sections[0].questions[0].options[1].is_correct).toBe(true);
  });
  it("không mượn khóa đáp án của câu khác dù đoạn khóa có thật trong tài liệu", () => {
    const source = [{ text: "Câu 1. Số nào là số nguyên tố?\nA. 12\nB. 17\nCâu 2. Chọn màu xanh.\nA. Đỏ\nB. Xanh\nĐáp án câu 2: B", locator: { page: 1 } }];
    const result = parseAiExtraction({ questions: [{ ...question, excerpt: "Câu 1. Số nào là số nguyên tố?\nA. 12\nB. 17", answerExcerpt: "Đáp án câu 2: B" }], unparsed: [] }, source, "Đề");
    expect(result.form.document.sections[0].questions[0].options.every(o => !o.is_correct)).toBe(true);
  });
  it("giới hạn số câu/lựa chọn vẫn được ép ở server dù grammar schema đã đơn giản hóa", () => {
    expect(() => parseAiExtraction({ questions: Array(51).fill(question), unparsed: [] }, sources, "Đề")).toThrow("invalid_extract");
    expect(() => parseAiExtraction({ questions: [{ ...question, options: Array(7).fill(question.options[0]) }], unparsed: [] }, sources, "Đề")).toThrow("invalid_extract");
  });
  it("không lấy điểm model tự điền khi nguồn không ghi trọng số", () => {
    const source = [{ text: sources[0].text.replace(" (1 điểm)", ""), locator: { page: 1 } }];
    const result = parseAiExtraction({ questions: [{ ...question, excerpt: source[0].text }], unparsed: [] }, source, "Đề");
    expect(result.form.document.sections[0].questions[0].pointUnits).toBeNull();
    expect(result.warnings.some(w => w.includes("xác nhận điểm"))).toBe(true);
  });
});
