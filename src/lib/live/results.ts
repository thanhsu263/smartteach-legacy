import type { QuestionKey } from "@/lib/live/types";

/** Kết quả của hàm `host_results` (chỉ chủ phiên, sau khi phiên kết thúc). */
export type RankedPlayer = {
  id: string;
  nickname: string;
  score: number;
  /** Null với người bị loại hoặc tự rời. */
  rank: number | null;
  removed: boolean;
  left: boolean;
  answered: number;
  correct: number;
  avg_response_ms: number | null;
  /** Tổng thay đổi điểm do rương kho báu đã mở (0 nếu không bật chế độ). */
  treasure_delta: number;
  treasure_chests: number;
};

export type QuestionResult = {
  index: number;
  prompt: string;
  kind: "single" | "true_false" | "multi" | "short_text";
  time_limit_seconds: number;
  options: string[];
  key: QuestionKey;
  correct: number;
  wrong: number;
  unanswered: number;
  option_counts: number[];
  avg_response_ms: number | null;
};

export type AnswerRow = {
  player: string;
  /** Số thứ tự câu từ 1. */
  q: number;
  answer: unknown;
  ok: boolean;
  points: number;
  ms: number;
};

export type HostResults = {
  id: string;
  quiz_title: string;
  created_at: string;
  ended_at: string | null;
  speed_bonus: boolean;
  treasure_mode: boolean;
  question_total: number;
  player_count: number;
  average_score: number;
  ranking: RankedPlayer[];
  questions: QuestionResult[];
  answers: AnswerRow[];
};

export type HistoryRow = {
  session_id: string;
  quiz_id: string | null;
  quiz_title: string;
  created_at: string;
  ended_at: string | null;
  player_count: number;
  average_score: number;
};

/** Giây với một chữ số thập phân ("3,4 giây"); "-" nếu chưa có số liệu. */
export function formatSeconds(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "-";
  return `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
}

/** Tỉ lệ đúng trong số người đã trả lời, làm tròn phần trăm; "-" nếu chưa ai trả lời. */
export function correctRate(question: Pick<QuestionResult, "correct" | "wrong">): string {
  const answered = question.correct + question.wrong;
  return answered === 0 ? "-" : `${Math.round((question.correct / answered) * 100)}%`;
}

export type MatrixCell = { status: "correct" | "wrong" | "none"; points: number; answer: unknown };

const LETTERS = "ABCDEF";

/** Đáp án một bạn đã chọn hoặc gõ, viết thành chữ ("Chọn B. Huế", "Gõ: ma"); rỗng nếu chưa trả lời. */
export function describeAnswer(options: readonly string[], answer: unknown): string {
  if (typeof answer === "string") return `Gõ: ${answer}`;
  const picked = (Array.isArray(answer) ? answer : typeof answer === "number" ? [answer] : [])
    .filter((value): value is number => Number.isInteger(value) && value >= 0)
    .sort((a, b) => a - b); // theo thứ tự lựa chọn chứ không theo thứ tự bấm
  if (picked.length === 0) return "";
  return `Chọn ${picked.map((i) => `${LETTERS[i] ?? i + 1}. ${options[i] ?? ""}`.trim()).join(", ")}`;
}

/** Ma trận người chơi x câu hỏi: ô nào cũng có chữ (Đúng, Sai, Bỏ trống), không chỉ màu. */
export function buildMatrix(results: Pick<HostResults, "ranking" | "answers" | "question_total">): { player: RankedPlayer; cells: MatrixCell[] }[] {
  const byKey = new Map<string, AnswerRow>();
  for (const row of results.answers) byKey.set(`${row.player}:${row.q}`, row);
  return results.ranking.map((player) => ({
    player,
    cells: Array.from({ length: results.question_total }, (_, i) => {
      const row = byKey.get(`${player.id}:${i + 1}`);
      if (!row) return { status: "none" as const, points: 0, answer: null };
      return { status: row.ok ? ("correct" as const) : ("wrong" as const), points: row.points, answer: row.answer };
    }),
  }));
}

export function describeCell(cell: MatrixCell): string {
  if (cell.status === "none") return "Bỏ trống";
  return cell.status === "correct" ? `Đúng, ${cell.points} điểm` : "Sai";
}

/** Ngày giờ ngắn gọn theo giờ Việt Nam; không đọc được thì trả chuỗi gốc. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
}
