import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readExamCsv } from "./csv";
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
    for (const raw of [{ questions: [{ ...question, prompt: "Câu không có trong nguồn" }], unparsed: [] }, { questions: [{ ...question, locatorIndex: 20 }], unparsed: [] }, { questions: [], unparsed: ["bỏ câu 2"] }]) expect(() => parseAiExtraction(raw, sources, "Đề")).toThrow("invalid_extract");
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

// P9.2 online: Gemini output for with-keys.csv failed as a whole job. These are plausible, faithful model outputs.
describe("AI extraction với corpus with-keys.csv", () => {
  const corpus = readExamCsv(readFileSync("tests/fixtures/exams/ai/with-keys.csv", "utf8")).map((row, index) => ({ text: row.join(" | "), locator: { row: index + 1 } }));
  const rows = (a: number, b: number) => corpus.slice(a, b + 1).map(s => s.text).join("\n");
  const base = () => [
    { section: "Phần I. Trắc nghiệm", kind: "single", prompt: "Số nào sau đây là số nguyên tố?", options: ["12", "17", "21", "27"].map((label, i) => ({ label, is_correct: i === 1 })), accepted_answers: [] as string[], ignore_diacritics: false, points: 1.25 as number | null, excerpt: rows(2, 6), answerExcerpt: corpus[7].text as string | null, locatorIndex: 2 },
    { section: "Phần I. Trắc nghiệm", kind: "true_false", prompt: "Trái Đất quay quanh Mặt Trời. Chọn Đúng hoặc Sai.", options: [{ label: "Đúng", is_correct: true }, { label: "Sai", is_correct: false }], accepted_answers: [] as string[], ignore_diacritics: false, points: 0.75 as number | null, excerpt: rows(8, 10), answerExcerpt: corpus[11].text as string | null, locatorIndex: 8 },
    { section: "Phần II. Vận dụng", kind: "multi", prompt: "Chọn tất cả các số chẵn.", options: ["2", "3", "4", "5", "6"].map((label, i) => ({ label, is_correct: i % 2 === 0 })), accepted_answers: [] as string[], ignore_diacritics: false, points: 2.5 as number | null, excerpt: rows(13, 18), answerExcerpt: corpus[19].text as string | null, locatorIndex: 13 },
    { section: "Phần II. Vận dụng", kind: "short_text", prompt: "Con vật nào kêu meo meo?", options: [] as { label: string; is_correct: boolean }[], accepted_answers: ["mèo", "con mèo"], ignore_diacritics: true, points: null as number | null, excerpt: corpus[20].text, answerExcerpt: corpus[21].text as string | null, locatorIndex: 20 },
  ];
  type Q = ReturnType<typeof base>[number];
  const tweak = (i: number, patch: Partial<Q>) => base().map((q, j) => (j === i ? { ...q, ...patch } : q));
  const questionsOf = (r: ReturnType<typeof parseAiExtraction>) => r.form.document.sections.flatMap(s => s.questions);
  it("trích đủ 4 câu, khóa và điểm theo golden", () => {
    const qs = questionsOf(parseAiExtraction({ questions: base(), unparsed: [] }, corpus, "Đề"));
    expect(qs.map(q => q.pointUnits)).toEqual([125, 75, 250, null]);
    expect(qs.map(q => q.options.flatMap((o, i) => (o.is_correct ? [i] : [])))).toEqual([[1], [0], [0, 2, 4], []]);
    expect(qs[3].accepted_answers).toEqual(["mèo", "con mèo"]);
  });
  it("phần model báo chưa đọc (tiêu đề, chỉ dẫn giả) thành cảnh báo cho giáo viên, không hủy cả job", () => {
    const r = parseAiExtraction({ questions: base(), unparsed: [corpus[0].text, corpus[22].text, "  "] }, corpus, "Đề");
    expect(questionsOf(r)).toHaveLength(4);
    expect(r.warnings.filter(w => w.startsWith("AI chưa đưa vào đề"))).toHaveLength(2);
  });
  it("giới hạn số cảnh báo phần chưa đọc", () => {
    const r = parseAiExtraction({ questions: base(), unparsed: Array.from({ length: 25 }, (_, i) => `phần ${i}`) }, corpus, "Đề");
    expect(r.warnings.filter(w => w.startsWith("AI chưa đưa vào đề"))).toHaveLength(20);
    expect(r.warnings.some(w => w.startsWith("Còn 5 phần"))).toBe(true);
  });
  it("bỏ accepted_answers model điền cho câu chọn đáp án", () => {
    const qs = questionsOf(parseAiExtraction({ questions: tweak(2, { accepted_answers: ["A", "C", "E"] }), unparsed: [] }, corpus, "Đề"));
    expect(qs[2].accepted_answers).toEqual([]);
    expect(qs[2].options.filter(o => o.is_correct)).toHaveLength(3);
  });
  it("chỉ giữ đáp án ngắn có nguyên văn trong khóa", () => {
    const r = parseAiExtraction({ questions: tweak(3, { accepted_answers: ["mèo", "con mèo", "meo"] }), unparsed: [] }, corpus, "Đề");
    expect(questionsOf(r)[3].accepted_answers).toEqual(["mèo", "con mèo"]);
    expect(r.warnings.some(w => w.includes("đã bỏ đáp án chấp nhận"))).toBe(true);
    const none = parseAiExtraction({ questions: tweak(3, { accepted_answers: ["meo"] }), unparsed: [] }, corpus, "Đề");
    expect(questionsOf(none)[3].accepted_answers).toEqual([]);
    expect(none.warnings.some(w => w.includes("bổ sung"))).toBe(true);
  });
  it("locator trỏ vào dòng tên phần ngay trên câu vẫn ghi đúng vị trí câu", () => {
    const r = parseAiExtraction({ questions: tweak(0, { locatorIndex: 1, excerpt: rows(1, 6) }), unparsed: [] }, corpus, "Đề");
    expect(r.provenance[0].locator).toEqual({ row: 3 });
  });
  it("vẫn từ chối trích đoạn không nguyên văn hoặc câu không có trong nguồn", () => {
    for (const questions of [tweak(0, { excerpt: "Câu 1 (1,25 điểm): Số nào sau đây là số nguyên tố? 12, 17, 21, 27" }), tweak(1, { prompt: "Mặt Trời quay quanh Trái Đất." })])
      expect(() => parseAiExtraction({ questions, unparsed: [] }, corpus, "Đề")).toThrow("invalid_extract");
  });
});
