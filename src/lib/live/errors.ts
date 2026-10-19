import type { JoinCode } from "@/lib/live/types";

type ErrorLike = { code?: string; message?: string } | null | undefined;

const GENERIC = "Có lỗi xảy ra. Bạn thử lại nhé.";

/** Lời nhắn theo mã lỗi nghiệp vụ của các hàm `host_*` và `*_answer` (xem migration live_sessions). */
const MESSAGES: [string, string][] = [
  // Học sinh.
  ["invalid_token", "Mã tham gia không còn hiệu lực. Bạn vào lại phòng bằng PIN nhé."],
  ["answer_closed", "Hết giờ rồi nên câu trả lời không được nhận."],
  ["already_answered", "Bạn đã trả lời câu này rồi."],
  ["participant_removed", "Giáo viên đã mời bạn rời phòng."],
  ["invalid_answer", "Câu trả lời chưa hợp lệ. Bạn kiểm tra lại rồi gửi nhé."],
  // Giáo viên.
  ["session_already_active", "Thầy cô đang có một phiên chưa kết thúc. Kết thúc phiên đó trước khi bắt đầu phiên mới."],
  ["quiz_not_playable", "Quiz chưa chơi được: cần ít nhất một câu và mọi câu đều hợp lệ. Thầy cô xem mục \"Cần sửa trước khi chơi\"."],
  ["quiz_not_found", "Không tìm thấy quiz này. Có thể nó đã bị xoá."],
  ["pin_unavailable", "Chưa tạo được mã PIN. Thầy cô thử lại sau ít giây."],
  ["session_not_found", "Không tìm thấy phiên chơi này."],
  ["session_ended", "Phiên chơi đã kết thúc."],
  ["invalid_transition", "Bước này chưa làm được ở thời điểm hiện tại. Thầy cô làm mới trang rồi thử lại."],
  ["participant_not_found", "Không tìm thấy người chơi này. Có thể bạn ấy đã được loại."],
  ["not_authenticated", "Thầy cô đăng nhập để dùng chức năng này nhé."],
];

const NETWORK = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

/** Đổi lỗi từ PostgREST/Postgres sang tiếng Việt; không bao giờ lộ thông báo kỹ thuật. */
export function describeLiveError(error: ErrorLike): string {
  if (!error) return GENERIC;
  const message = error.message ?? "";
  for (const [needle, text] of MESSAGES) {
    if (message.includes(needle)) return text;
  }
  if (NETWORK.test(message)) return "Mất kết nối. Bạn kiểm tra mạng, ứng dụng sẽ tự thử lại.";
  if (error.code === "42501" || error.code === "PGRST301") return "Phiên đăng nhập không còn hiệu lực. Thầy cô đăng nhập lại nhé.";
  return GENERIC;
}

/** Lời nhắn cho mã kết quả của `join_session` (không phải exception nên tách riêng). */
export function describeJoinCode(code: JoinCode | string): string {
  switch (code) {
    case "invalid_pin":
      return "PIN chưa đúng hoặc phòng đã đóng. Bạn kiểm tra lại PIN trên màn hình của thầy cô nhé.";
    case "too_many_attempts":
      return "Đã thử quá nhiều lần. Bạn đợi vài phút rồi nhập lại, hoặc nhờ thầy cô giúp.";
    case "session_started":
      return "Trò chơi đã bắt đầu nên chưa vào thêm được. Bạn hỏi thầy cô nhé.";
    case "room_locked":
      return "Thầy cô đã khoá phòng, chưa vào thêm được.";
    case "invalid_nickname":
      return "Biệt danh cần từ 1 đến 20 ký tự và không có ký tự điều khiển.";
    case "nickname_taken":
      return "Biệt danh này đã có bạn dùng. Bạn chọn biệt danh khác nhé.";
    case "room_full":
      return "Phòng đã đủ người nên chưa vào thêm được.";
    default:
      return GENERIC;
  }
}

/** Lỗi nghĩa là mã tham gia hỏng hẳn: không nên thử lại mà phải vào lại phòng. */
export function isFatalPlayerError(error: ErrorLike): boolean {
  const message = error?.message ?? "";
  return message.includes("invalid_token") || message.includes("participant_removed");
}
