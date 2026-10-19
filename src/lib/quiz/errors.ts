import {
  MAX_ACCEPTED_ANSWERS,
  MAX_ANSWER_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_PROMPT_LENGTH,
  MAX_QUESTIONS_PER_QUIZ,
  MAX_QUIZZES,
  MAX_TITLE_LENGTH,
  MIN_OPTIONS_PER_QUESTION,
} from "@/lib/quiz/limits";
import type { ProblemCode } from "@/lib/quiz/types";

type ErrorLike = { code?: string; message?: string } | null | undefined;

const GENERIC = "Có lỗi xảy ra. Thầy cô thử lại nhé.";

/** Đổi lỗi từ PostgREST/Postgres thành lời nhắn tiếng Việt, rõ bước tiếp theo; không lộ thông báo kỹ thuật. */
export function describeQuizError(error: ErrorLike): string {
  if (!error) return GENERIC;
  const message = error.message ?? "";

  if (message.includes("quiz_limit_exceeded")) {
    return `Thầy cô đã có ${MAX_QUIZZES} quiz, là giới hạn tối đa. Xoá bớt quiz cũ rồi tạo quiz mới nhé.`;
  }
  if (message.includes("question_limit_exceeded")) {
    return `Một quiz chứa tối đa ${MAX_QUESTIONS_PER_QUIZ} câu hỏi.`;
  }
  if (message.includes("option_limit_exceeded")) {
    return `Một câu hỏi có tối đa ${MAX_OPTIONS_PER_QUESTION} lựa chọn.`;
  }
  if (message.includes("shared_quiz_not_found")) {
    return "Không tìm thấy quiz này. Link có thể đã bị thu hồi hoặc chưa đúng.";
  }
  if (message.includes("quiz_not_found") || message.includes("question_not_found")) {
    return "Không tìm thấy quiz hoặc câu hỏi này. Có thể nó đã bị xoá.";
  }
  if (message.includes("reorder_mismatch")) {
    return "Danh sách câu hỏi đã thay đổi ở nơi khác. Thầy cô tải lại trang rồi sắp xếp lại nhé.";
  }
  if (message.includes("not_authenticated")) {
    return "Thầy cô đăng nhập để dùng chức năng này nhé.";
  }
  if (error.code === "23514") {
    return (
      `Nội dung chưa hợp lệ: tên quiz tối đa ${MAX_TITLE_LENGTH} ký tự, câu hỏi tối đa ${MAX_PROMPT_LENGTH}, ` +
      `mỗi lựa chọn tối đa ${MAX_OPTION_LENGTH}, mỗi đáp án điền từ tối đa ${MAX_ANSWER_LENGTH} ký tự ` +
      `(${MAX_ACCEPTED_ANSWERS} đáp án), và không được để trống.`
    );
  }
  if (error.code === "42501" || error.code === "PGRST301") {
    return "Phiên đăng nhập không còn hiệu lực. Thầy cô đăng nhập lại nhé.";
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "Không kết nối được máy chủ. Thầy cô kiểm tra mạng rồi thử lại nhé.";
  }
  return GENERIC;
}

const PROBLEM_TEXT: Record<ProblemCode, string> = {
  no_questions: "Quiz chưa có câu hỏi nào.",
  too_few_options: `Cần ít nhất ${MIN_OPTIONS_PER_QUESTION} lựa chọn.`,
  correct_count: "Cần chọn đúng một đáp án đúng.",
  no_correct: "Cần chọn ít nhất một đáp án đúng.",
  bad_true_false: "Cần đúng hai lựa chọn Đúng và Sai, và chọn một đáp án đúng.",
  no_answers: "Cần ít nhất một đáp án chấp nhận.",
  duplicate_options: "Có hai lựa chọn trùng nhau.",
};

/** Lời nhắn cho riêng một lỗi, viết hoa chữ đầu (dùng ngay dưới biểu mẫu của câu hỏi). */
export function problemText(code: ProblemCode): string {
  return PROBLEM_TEXT[code];
}

/** Lời nhắn cho một lỗi chặn việc chơi; `position` là số thứ tự câu (từ 1), 0 là lỗi cả quiz. */
export function describeProblem(code: ProblemCode, position: number): string {
  const text = PROBLEM_TEXT[code];
  if (position <= 0) return text;
  return `Câu ${position}: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
