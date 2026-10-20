import {
  DEFAULT_TIME_LIMIT,
  MAX_ACCEPTED_ANSWERS,
  MAX_OPTIONS_PER_QUESTION,
  TIME_LIMITS,
} from "@/lib/quiz/limits";
import { describeProblem } from "@/lib/quiz/errors";
import { FALSE_LABEL, TRUE_LABEL, type QuestionInput, type QuestionKind } from "@/lib/quiz/types";
import { checkDraft, toPayload } from "@/lib/quiz/validate";
import { clean, fold, oneLine } from "./normalize";
import type { ImportedQuestion, ImportIssue, RawQuestion } from "./types";

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const slotName = (slot: number) => LETTERS[slot] ?? String(slot + 1);

const TRUE_WORDS = new Set(["dung", "d", "true", "t", "yes", "y", "co"]);
const FALSE_WORDS = new Set(["sai", "s", "false", "f", "no", "n", "khong"]);

/** Dạng câu từ ô "Loại câu"; null nếu không nhận ra. */
function parseKind(text: string): QuestionKind | null {
  const key = fold(text);
  if (key === "") return null;
  if (/(nhieu|multi|multiple)/.test(key)) return "multi";
  if (/(dungsai|truefalse|tf|dungorsai)/.test(key)) return "true_false";
  if (/(dien|short|text|tuluan|ngan)/.test(key)) return "short_text";
  if (/(mot|single|tracnghiem|chon1|motdapan)/.test(key)) return "single";
  return null;
}

/** Hai lựa chọn được viết là Đúng và Sai (theo thứ tự nào cũng được). */
function isTrueFalseOptions(options: RawQuestion["options"]): boolean {
  if (options.length !== 2) return false;
  const keys = options.map((option) => fold(option.label)).sort();
  return keys[0] === "dung" && keys[1] === "sai";
}

/**
 * Mục "đáp án đúng" thành vị trí ô (slot): chữ cái A-F, số 1-6 (đếm từ lựa chọn thứ nhất) hoặc nguyên văn một lựa chọn.
 * Trả về lỗi bằng lời cho mục không nhận ra.
 */
function resolveToken(token: string, options: RawQuestion["options"]): { slot: number } | { error: string } {
  const text = token.trim();
  const upper = text.toUpperCase();
  if (/^[A-F]$/.test(upper)) {
    const slot = LETTERS.indexOf(upper as (typeof LETTERS)[number]);
    return options.some((option) => option.slot === slot) ? { slot } : { error: `Đáp án đúng "${text}" không có lựa chọn ${upper} tương ứng.` };
  }
  if (/^[1-6]$/.test(text)) {
    const slot = Number(text) - 1;
    return options.some((option) => option.slot === slot) ? { slot } : { error: `Đáp án đúng "${text}" không có lựa chọn thứ ${text} tương ứng.` };
  }
  const match = options.find((option) => fold(option.label) === fold(text) && fold(text) !== "");
  if (match) return { slot: match.slot };
  return { error: `Đáp án đúng "${text}" không khớp lựa chọn nào (dùng chữ cái A-F, số 1-6 hoặc đúng nội dung lựa chọn).` };
}

export type BuildResult = { question: ImportedQuestion | null; issues: ImportIssue[] };

/**
 * Biến một câu hỏi thô thành `QuestionInput` hợp lệ: suy ra loại, đổi "đáp án đúng" thành các lựa chọn đúng, kiểm tra bằng
 * ĐÚNG các hàm của trình soạn (`checkDraft`, `questionProblems` qua `checkDraft().warnings`) nên luật giống hệt soạn tay.
 * Mọi vấn đề chặn việc chơi đều là lỗi ở đây: tệp nhập phải cho ra quiz chơi được ngay.
 */
export function buildQuestion(raw: RawQuestion, ordinal: number): BuildResult {
  const issues: ImportIssue[] = [];
  const error = (message: string) => issues.push({ line: raw.line, severity: "error", message });
  const warn = (message: string) => issues.push({ line: raw.line, severity: "warning", message });

  const prompt = clean(raw.prompt);
  const options = raw.options.map((option) => ({ slot: option.slot, label: oneLine(option.label) })).filter((option) => option.label !== "");
  const accepted = [...new Set(raw.accepted.map(oneLine).filter((answer) => answer !== ""))];

  // 1. Loại câu: ghi rõ thì theo đó, bỏ trống thì suy ra.
  let kind: QuestionKind | null;
  if (raw.kindText.trim() !== "") {
    kind = parseKind(raw.kindText);
    if (!kind) {
      error(`Loại câu "${raw.kindText.trim()}" không hợp lệ (dùng: một đáp án, đúng/sai, nhiều đáp án, điền từ).`);
      return { question: null, issues };
    }
  } else if (options.length === 0 && (accepted.length > 0 || raw.correctTokens.length > 0)) {
    kind = "short_text";
  } else if (isTrueFalseOptions(options)) {
    kind = "true_false";
  } else if (raw.correctSlots.length + raw.correctTokens.length > 1) {
    kind = "multi";
  } else {
    kind = "single";
  }

  // 2. Đáp án đúng.
  let correct = new Set<number>(raw.correctSlots);
  let trueFalseAnswer: boolean | null = null;

  if (kind === "true_false") {
    const token = raw.correctTokens[0] ?? "";
    const key = fold(token);
    if (raw.correctSlots.length === 1) {
      const label = options.find((option) => option.slot === raw.correctSlots[0])?.label ?? "";
      trueFalseAnswer = TRUE_WORDS.has(fold(label)) ? true : FALSE_WORDS.has(fold(label)) ? false : null;
    } else if (key !== "") {
      // Chữ cái: theo nhãn của lựa chọn tương ứng nếu có; không có lựa chọn thì A là Đúng, B là Sai.
      const letter = /^[ab]$/i.test(token.trim()) ? token.trim().toUpperCase() : "";
      const byOption = letter ? options.find((option) => option.slot === (letter === "A" ? 0 : 1)) : undefined;
      const word = byOption ? fold(byOption.label) : letter === "A" ? "dung" : letter === "B" ? "sai" : key;
      trueFalseAnswer = TRUE_WORDS.has(word) ? true : FALSE_WORDS.has(word) ? false : null;
    }
    if (trueFalseAnswer === null) {
      error('Câu đúng/sai cần ghi đáp án đúng là "Đúng" hoặc "Sai".');
    }
  } else if (kind === "single" || kind === "multi") {
    for (const token of raw.correctTokens) {
      const resolved = resolveToken(token, options);
      if ("error" in resolved) error(resolved.error);
      else correct.add(resolved.slot);
    }
  } else {
    correct = new Set();
  }

  // 3. Câu điền từ: đáp án chấp nhận; thiếu thì lấy từ ô "đáp án đúng".
  let acceptedFinal = accepted;
  if (kind === "short_text" && acceptedFinal.length === 0) {
    acceptedFinal = [...new Set(raw.correctTokens.map(oneLine).filter((answer) => answer !== ""))];
  }
  if (kind === "short_text" && acceptedFinal.length > MAX_ACCEPTED_ANSWERS) {
    error(`Tối đa ${MAX_ACCEPTED_ANSWERS} đáp án chấp nhận.`);
  }

  // 4. Thời gian.
  let time: number = DEFAULT_TIME_LIMIT;
  if (raw.timeText.trim() !== "") {
    const parsed = Number(raw.timeText.trim().replace(/s$/i, ""));
    if ((TIME_LIMITS as readonly number[]).includes(parsed)) {
      time = parsed;
    } else {
      warn(`Thời gian "${raw.timeText.trim()}" không có trong danh sách (${TIME_LIMITS.join(", ")} giây): dùng ${DEFAULT_TIME_LIMIT} giây.`);
    }
  }

  if (issues.some((issue) => issue.severity === "error")) return { question: null, issues };

  // 5. Dựng bản nháp rồi kiểm bằng đúng luật của trình soạn.
  const draft: QuestionInput = {
    kind,
    prompt,
    time_limit_seconds: time as QuestionInput["time_limit_seconds"],
    ignore_diacritics: kind === "short_text" ? raw.ignoreDiacritics : false,
    accepted_answers: kind === "short_text" ? acceptedFinal : [],
    options:
      kind === "short_text"
        ? []
        : kind === "true_false"
          ? [
              { label: TRUE_LABEL, is_correct: trueFalseAnswer === true },
              { label: FALSE_LABEL, is_correct: trueFalseAnswer === false },
            ]
          : options.map((option) => ({ label: option.label, is_correct: correct.has(option.slot) })),
  };

  if (options.length > MAX_OPTIONS_PER_QUESTION) error(`Tối đa ${MAX_OPTIONS_PER_QUESTION} lựa chọn.`);
  const checked = checkDraft(draft);
  if (checked.prompt) error(`Câu hỏi: ${checked.prompt}`);
  if (checked.general) error(checked.general);
  checked.options.forEach((message, index) => {
    if (message) error(`Lựa chọn ${slotName(options[index]?.slot ?? index)}: ${message}`);
  });
  checked.answers.forEach((message, index) => {
    if (message) error(`Đáp án chấp nhận ${index + 1}: ${message}`);
  });
  for (const code of checked.warnings) error(describeProblem(code, ordinal));

  if (issues.some((issue) => issue.severity === "error")) return { question: null, issues };
  return { question: { line: raw.line, question: toPayload(draft) }, issues };
}
