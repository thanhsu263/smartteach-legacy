import { MAX_QUESTIONS_PER_QUIZ } from "@/lib/quiz/limits";
import { buildQuestion } from "./build";
import { fold } from "./normalize";
import { IMPORT_MAX_LINE, IMPORT_MAX_TEXT, type ImportedQuestion, type ImportIssue, type ImportParse, type RawQuestion } from "./types";

// Lựa chọn: "A. nội dung", "A) nội dung", đánh dấu đúng bằng `*` đứng trước chữ cái hoặc sau nội dung.
const OPTION = /^\s*(\*|✓|✔)?\s*([A-Fa-f])\s*[.)]\s+(.+?)\s*(\*)?\s*$/;
const ANSWER = /^\s*(?:đáp án|dap an|đ\/a|answer)(?:\s+đúng)?\s*[:：]\s*(.+?)\s*$/i;
const IGNORE = /^\s*(?:bỏ dấu|bo dau|không phân biệt dấu|khong phan biet dau)\s*[:：]\s*(.+?)\s*$/i;
const TIME_TAIL = /\s*\[\s*(\d+)\s*s?\s*\]\s*$/i;
const PROMPT_PREFIX = /^\s*(?:(?:câu|cau)\s*\d+\s*[:.)\-–]\s*|\d+\s*[.)]\s+)/i;

const YES = new Set(["co", "x", "1", "true", "yes", "y", "dung"]);

/**
 * Văn bản dán (ví dụ từ Word) theo cú pháp: các câu cách nhau bằng dòng trống. Dòng đầu của câu là nội dung (tiền tố
 * "Câu 1:" hoặc "1." bị bỏ, có thể kết thúc bằng [30s] để đặt thời gian); tiếp theo là các lựa chọn `A.` `B)`...; đáp án
 * đúng đánh dấu bằng `*` hoặc dòng `Đáp án: B` / `Đáp án: A, C`. Không có lựa chọn mà có `Đáp án: mèo | con mèo` là câu
 * điền từ (thêm dòng `Bỏ dấu: có` nếu không phân biệt dấu).
 */
export function parseQuizText(text: string): ImportParse {
  const issues: ImportIssue[] = [];
  const questions: ImportedQuestion[] = [];

  // Giới hạn đầu vào trước khi chạy các biểu thức chính quy: dòng dài bất thường (hàng chục nghìn khoảng trắng) làm chúng
  // chậm theo bình phương, đủ treo tab.
  if (text.length > IMPORT_MAX_TEXT) {
    return {
      questions,
      issues: [{ line: 0, severity: "error", message: `Văn bản quá dài (tối đa ${IMPORT_MAX_TEXT / 1000} nghìn ký tự). Thầy cô tách thành nhiều lần dán nhé.` }],
    };
  }
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const tooLong = lines.flatMap((content, index) => (content.length > IMPORT_MAX_LINE ? [{ n: index + 1, length: content.length }] : []));
  if (tooLong.length > 0) {
    return {
      questions,
      issues: tooLong.slice(0, 5).map(({ n, length }) => ({
        line: n,
        severity: "error" as const,
        message: `Dòng này dài ${length} ký tự (tối đa ${IMPORT_MAX_LINE}). Thầy cô xuống dòng giữa các phần nhé.`,
      })),
    };
  }

  // Gom các khối cách nhau bằng dòng trống, nhớ số dòng gốc.
  const blocks: { start: number; lines: { n: number; text: string }[] }[] = [];
  lines.forEach((content, index) => {
    if (content.trim() === "") return;
    const previous = lines[index - 1];
    if (index === 0 || previous === undefined || previous.trim() === "" || blocks.length === 0) {
      blocks.push({ start: index + 1, lines: [] });
    }
    blocks[blocks.length - 1].lines.push({ n: index + 1, text: content });
  });

  if (blocks.length === 0) {
    return { questions, issues: [{ line: 0, severity: "error", message: "Chưa có nội dung nào để đọc." }] };
  }

  for (const block of blocks) {
    const raw: RawQuestion = {
      line: block.start,
      kindText: "",
      prompt: "",
      options: [],
      correctSlots: [],
      correctTokens: [],
      accepted: [],
      ignoreDiacritics: false,
      timeText: "",
    };
    const promptLines: string[] = [];
    let broken = false;

    block.lines.forEach(({ n, text: content }, position) => {
      if (position === 0) {
        let first = content.replace(PROMPT_PREFIX, "");
        const time = TIME_TAIL.exec(first);
        if (time) {
          raw.timeText = time[1];
          first = first.replace(TIME_TAIL, "");
        }
        promptLines.push(first);
        return;
      }
      const answer = ANSWER.exec(content);
      if (answer) {
        if (raw.options.length > 0) raw.correctTokens.push(...answer[1].split(/[,;\s]+/).filter((token) => token !== ""));
        else raw.accepted.push(...answer[1].split("|"));
        return;
      }
      const ignore = IGNORE.exec(content);
      if (ignore) {
        raw.ignoreDiacritics = YES.has(fold(ignore[1]));
        return;
      }
      const option = OPTION.exec(content);
      if (option) {
        const slot = option[2].toUpperCase().charCodeAt(0) - 65;
        if (raw.options.some((existing) => existing.slot === slot)) {
          issues.push({ line: n, severity: "error", message: `Lựa chọn ${option[2].toUpperCase()} bị ghi hai lần trong cùng một câu.` });
          broken = true;
          return;
        }
        raw.options.push({ slot, label: option[3] });
        if (option[1] || option[4]) raw.correctSlots.push(slot);
        return;
      }
      if (raw.options.length === 0) {
        // Câu hỏi nhiều dòng: dòng chưa phải lựa chọn hay đáp án là phần tiếp của nội dung.
        promptLines.push(content);
        return;
      }
      issues.push({ line: n, severity: "error", message: `Không hiểu dòng này: "${content.trim().slice(0, 60)}". Lựa chọn viết dạng "A. nội dung", đáp án dạng "Đáp án: B".` });
      broken = true;
    });
    raw.prompt = promptLines.join("\n");
    if (broken) continue;

    const built = buildQuestion(raw, questions.length + 1);
    issues.push(...built.issues);
    if (built.question) questions.push(built.question);
  }

  if (questions.length > MAX_QUESTIONS_PER_QUIZ) {
    issues.push({
      line: 0,
      severity: "error",
      message: `Một quiz tối đa ${MAX_QUESTIONS_PER_QUIZ} câu, văn bản có ${questions.length} câu. Thầy cô tách thành nhiều lần nhé.`,
    });
  }
  return { questions, issues };
}
