/** Credential chỉ được phép đi trong fragment (`#credential=…`), không trong query/referrer. */
export function credentialFromFragment(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const value = new URLSearchParams(hash.slice(1)).get("credential");
  return value && /^[A-F0-9]{32}$/i.test(value) ? value.toUpperCase() : null;
}
/** Địa chỉ sạch để gọi `history.replaceState` ngay sau exchange thành công/thất bại. */
export function withoutCredentialFragment(pathname: string, search = ""): string {
  return `${pathname}${search}`;
}
type ErrorLike = { code?: string; message?: string } | null | undefined;

/** Không phân biệt code/credential/revoke/expiry để tránh hỗ trợ dò credential. */
export function describeStudentAssignmentError(error: ErrorLike): string {
  const message = error?.message ?? "";
  if (message.includes("attempt_not_found")) return "Phiên làm bài không còn hiệu lực. Bạn nhập lại mã bài và mã học sinh nhé.";
  if (message.includes("attempt_not_editable") || message.includes("attempt_not_submittable")) return "Bài này hiện không thể tiếp tục hoặc nộp. Bạn kiểm tra lại thời hạn với thầy cô nhé.";
  if (message.includes("invalid_answer")) return "Câu trả lời chưa hợp lệ. Bạn kiểm tra lại rồi lưu nhé.";
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return "Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.";
  return "Không vào được bài này. Bạn kiểm tra lại mã bài và mã học sinh nhé.";
}
