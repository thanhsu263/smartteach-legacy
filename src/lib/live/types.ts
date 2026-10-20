import type { QuestionKind } from "@/lib/quiz/types";

/** Pha của một phiên chơi trực tiếp (khớp cột `status` của `live_sessions`). */
export type LiveStatus = "lobby" | "question" | "reveal" | "ended";

/** Đề của một câu như người chơi thấy: không có khoá đáp án. */
export type PublicQuestion = {
  kind: QuestionKind;
  prompt: string;
  time_limit_seconds: number;
  options: string[];
};

/** Khoá đáp án; chỉ có sau khi câu đã đóng. */
export type QuestionKey = { correct: number[] } | { accepted_answers: string[]; ignore_diacritics: boolean };

/** Loại rương: thắng (3 câu đúng liền nhau) hoặc an ủi (3 câu sai hoặc bỏ trống liền nhau). */
export type ChestKind = "win" | "comfort";

/** Rương của một học sinh: chưa mở thì chỉ có loại (hiệu ứng được máy chủ giấu tới khi mở). */
export type ChestView =
  | { status: "pending"; kind: ChestKind }
  | { status: "opened"; kind: ChestKind; label: string; op: "add" | "sub" | "mul" | "div"; operand: number; before: number; after: number };

export type TreasureFeedItem = { nickname: string; label: string; kind: ChestKind };

export type LeaderboardRow ={ rank: number; nickname: string; score: number };

export type Distribution = {
  correct: number;
  wrong: number;
  unanswered: number;
  /** Số lượt chọn từng lựa chọn (rỗng với câu điền từ). */
  options: number[];
};

export type HostPlayer = {
  id: string;
  nickname: string;
  score: number;
  removed: boolean;
  answered: boolean;
};

/** Kết quả của hàm `host_state` (màn hình giáo viên và màn chiếu). */
export type HostState = {
  id: string;
  pin: string;
  status: LiveStatus;
  locked: boolean;
  speed_bonus: boolean;
  seq: number;
  server_now: string;
  expires_at: string;
  quiz_title: string;
  question_total: number;
  /** Số thứ tự câu hiện tại từ 1; 0 khi còn ở phòng chờ. */
  question_index: number;
  opened_at: string | null;
  closes_at: string | null;
  players: HostPlayer[];
  answered_count: number;
  /** Tự động qua câu: hết giờ thì hiện đáp án `reveal_seconds` giây rồi máy chủ mở câu kế. */
  auto_advance: boolean;
  reveal_seconds: number;
  paused: boolean;
  /** Giờ máy chủ sẽ mở câu kế; null khi không ở pha hiện đáp án, tắt tự động hoặc đang tạm dừng. */
  reveal_ends_at: string | null;
  /** Chế độ giải trí kho báu. `treasure_feed` (các rương vừa mở, mới nhất trước) chỉ có khi bật. */
  treasure_mode: boolean;
  treasure_feed?: TreasureFeedItem[];
  question?: PublicQuestion;
  key?: QuestionKey;
  distribution?: Distribution;
  leaderboard?: LeaderboardRow[];
};

export type PlayerPhase = LiveStatus | "removed";

/** Kết quả của hàm `player_state`. Các trường tuỳ chọn phụ thuộc pha. */
export type PlayerState = {
  session_id: string;
  phase: PlayerPhase;
  seq: number;
  server_now: string;
  nickname: string;
  score: number;
  question_total: number;
  player_count?: number;
  question_index?: number;
  question?: PublicQuestion;
  opened_at?: string;
  closes_at?: string;
  time_up?: boolean;
  /** Đã nộp đáp án cho câu hiện tại. */
  answered?: boolean;
  /** Chỉ sau khi câu đóng. */
  key?: QuestionKey;
  your_answer?: AnswerValue | null;
  is_correct?: boolean;
  points?: number;
  rank?: number;
  player_total?: number;
  /** Chỉ ở pha hiện đáp án: phiên có tự động qua câu không, có đang tạm dừng không, và giờ máy chủ mở câu kế. */
  auto_advance?: boolean;
  paused?: boolean;
  next_at?: string | null;
  /** Chỉ khi phiên bật kho báu: chuỗi đang chạy, và rương của câu vừa đóng (ở pha hiện đáp án). */
  streak?: { win: number; lose: number };
  chest?: ChestView;
};

export type LeaderboardView = {
  top: LeaderboardRow[];
  me: { rank: number; score: number; nickname: string };
};

/** Một đáp án: chỉ số lựa chọn (một đáp án, đúng/sai), mảng chỉ số (nhiều đáp án) hoặc chuỗi (điền từ). */
export type AnswerValue = number | number[] | string;

/** Mã kết quả của `join_session`. */
export type JoinCode =
  | "ok"
  | "invalid_pin"
  | "session_started"
  | "room_locked"
  | "invalid_nickname"
  | "nickname_taken"
  | "room_full";

/** Tình trạng kết nối với phiên: có tin báo, chỉ hỏi định kỳ, hoặc không liên lạc được. */
export type ConnectionStatus = "live" | "polling" | "offline";

/** Tin báo Realtime: chỉ mang số thứ tự pha, tuyệt đối không có dữ liệu khác. */
export type SignalPayload = { seq: number };
