import type { QuestionInput } from "@/lib/quiz/types";

/** Giới hạn của việc nhập tệp (đọc hoàn toàn ở trình duyệt). */
export const IMPORT_MAX_BYTES = 1_000_000;
export const IMPORT_MAX_ROWS = 500;
/** Văn bản dán: tổng độ dài và độ dài một dòng (dòng dài bất thường làm các biểu thức chính quy chậm theo bình phương). */
export const IMPORT_MAX_TEXT = 1_000_000;
export const IMPORT_MAX_LINE = 2000;
/** Tệp .xlsx là zip: kích thước SAU khi giải nén của một mục và của cả tệp (xem `zip-guard.ts`). */
export const IMPORT_MAX_ENTRY_BYTES = 20_000_000;
export const IMPORT_MAX_UNZIPPED_BYTES = 30_000_000;
/** Hàng tiêu đề phải nằm trong chừng này hàng đầu (phía trên có thể có dòng tiêu đề trang). */
export const IMPORT_HEADER_SCAN_ROWS = 10;

/** Bảng ô văn bản (CSV hoặc trang tính đầu tiên của .xlsx): mỗi phần tử là một hàng. */
export type Grid = string[][];

/** `line` là số dòng/hàng của tệp hoặc văn bản gốc (từ 1), 0 là vấn đề của cả tệp. */
export type ImportIssue = { line: number; severity: "error" | "warning"; message: string };

export type ImportedQuestion = { line: number; question: QuestionInput };

/**
 * Kết quả đọc một tệp hoặc đoạn văn bản. Có `error` (mức tệp) thì không có câu hỏi nào. Còn lỗi chặn trong `issues`
 * thì giao diện không cho tạo quiz; cảnh báo thì vẫn tạo được.
 */
export type ImportParse = {
  questions: ImportedQuestion[];
  issues: ImportIssue[];
};

export const hasBlockingIssue = (parse: ImportParse): boolean => parse.questions.length === 0 || parse.issues.some((issue) => issue.severity === "error");

/** Một câu hỏi thô vừa đọc từ một hàng hoặc một khối văn bản, chưa suy ra loại và chưa kiểm hợp lệ. */
export type RawQuestion = {
  line: number;
  /** Ô "Loại câu" nguyên văn (có thể rỗng: sẽ suy ra). */
  kindText: string;
  prompt: string;
  /** Lựa chọn theo ô/chữ cái gốc: `slot` 0 là A, 1 là B... (ô trống bị bỏ qua nhưng giữ vị trí). */
  options: { slot: number; label: string }[];
  /** Các lựa chọn được đánh dấu đúng ngay trên lựa chọn (cú pháp dán dùng dấu `*`), theo `slot`. */
  correctSlots: number[];
  /** Ô/dòng "Đáp án đúng" nguyên văn đã tách thành từng mục (chữ cái, số hoặc nguyên văn lựa chọn). */
  correctTokens: string[];
  /** Đáp án chấp nhận của câu điền từ. */
  accepted: string[];
  ignoreDiacritics: boolean;
  /** Thời gian nguyên văn (rỗng nếu không ghi). */
  timeText: string;
};
