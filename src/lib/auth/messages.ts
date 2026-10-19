type ErrorLike = { code?: string; message?: string } | null | undefined;

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu chưa đúng.",
  email_not_confirmed: "Email chưa được xác nhận. Thầy cô kiểm tra hộp thư và bấm liên kết xác nhận nhé.",
  user_already_exists: "Email này đã có tài khoản. Thầy cô chuyển sang đăng nhập nhé.",
  email_exists: "Email này đã có tài khoản. Thầy cô chuyển sang đăng nhập nhé.",
  weak_password: "Mật khẩu cần ít nhất 6 ký tự.",
  validation_failed: "Email chưa đúng định dạng.",
  over_request_rate_limit: "Thầy cô thử quá nhiều lần. Đợi một lát rồi thử lại nhé.",
  over_email_send_rate_limit: "Đã gửi quá nhiều email. Đợi một lát rồi thử lại nhé.",
  signup_disabled: "Hiện chưa mở đăng ký tài khoản mới.",
};

const GENERIC = "Có lỗi xảy ra. Thầy cô thử lại nhé.";
const OFFLINE = "Không kết nối được máy chủ. Thầy cô kiểm tra mạng rồi thử lại nhé.";

function looksOffline(message: string | undefined) {
  return /failed to fetch|networkerror|network request failed|load failed/i.test(message ?? "");
}

/** Đổi lỗi của Supabase Auth thành lời nhắn tiếng Việt, rõ bước tiếp theo. */
export function describeAuthError(error: ErrorLike): string {
  if (!error) return GENERIC;
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (looksOffline(error.message)) return OFFLINE;
  return GENERIC;
}
