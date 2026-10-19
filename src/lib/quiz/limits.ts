/** Phải khớp với migration `supabase/migrations/20261021090000_quizzes.sql` (giới hạn thật do cơ sở dữ liệu ép). */
export const MAX_QUIZZES = 50;
export const MAX_QUESTIONS_PER_QUIZ = 50;
export const MAX_OPTIONS_PER_QUESTION = 6;
export const MIN_OPTIONS_PER_QUESTION = 2;
export const MAX_ACCEPTED_ANSWERS = 10;

export const MAX_TITLE_LENGTH = 100;
export const MAX_PROMPT_LENGTH = 500;
export const MAX_OPTION_LENGTH = 150;
export const MAX_ANSWER_LENGTH = 100;

/** Thời gian trả lời mỗi câu (giây) mà giáo viên được chọn. */
export const TIME_LIMITS = [10, 20, 30, 60, 90] as const;
export const DEFAULT_TIME_LIMIT = 20;
