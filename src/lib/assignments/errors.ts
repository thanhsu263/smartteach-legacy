import { MAX_ASSIGNMENTS } from "./limits";

type ErrorLike = { code?: string; message?: string } | null | undefined;

const GENERIC = "Có lỗi xảy ra. Thầy cô thử lại nhé.";

/** Lỗi RPC assignment được đổi thành hướng dẫn ngắn, không lộ nội dung SQL. */
export function describeAssignmentError(error: ErrorLike): string {
  if (!error) return GENERIC;
  const message = error.message ?? "";
  if (message.includes("premium_required") || error.code === "PT402") return "Thầy cô cần Premium còn hạn để soạn hoặc phát hành đề. Vào Gói thành viên để nâng cấp hoặc gia hạn nhé.";
  if (message.includes("assignment_limit_exceeded")) return `Thầy cô đã có ${MAX_ASSIGNMENTS} bài đã giao, là giới hạn tối đa.`;
  if (message.includes("quiz_not_playable")) return "Quiz chưa đủ điều kiện để giao. Thầy cô kiểm tra lại câu hỏi và đáp án nhé.";
  if (message.includes("class_not_found")) return "Không tìm thấy lớp này. Có thể lớp đã bị xoá.";
  if (message.includes("quiz_not_found")) return "Không tìm thấy quiz này. Có thể quiz đã bị xoá.";
  if (message.includes("assignment_not_found")) return "Không tìm thấy bài đã giao này. Có thể bài đã bị xoá.";
  if (message.includes("assignment_not_editable")) return "Chỉ có thể sửa bài đang là bản nháp.";
  if (message.includes("assignment_not_publishable")) return "Bài này không thể phát hành ở trạng thái hiện tại.";
  if (message.includes("assignment_not_closable")) return "Chỉ có thể đóng bài đang phát hành.";
  if (message.includes("assignment_schedule_invalid")) return "Hạn nộp cần sau thời điểm mở bài.";
  if (message.includes("not_authenticated") || error.code === "42501" || error.code === "PGRST301") {
    return "Phiên đăng nhập không còn hiệu lực. Thầy cô đăng nhập lại nhé.";
  }
  if (error.code === "23514" || message.includes("PT400")) return "Thông tin bài giao chưa hợp lệ. Thầy cô kiểm tra lại rồi thử lại nhé.";
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return "Không kết nối được máy chủ. Thầy cô kiểm tra mạng rồi thử lại nhé.";
  return GENERIC;
}
