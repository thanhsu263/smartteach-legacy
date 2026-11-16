/** Recovery always uses the configured application URL, never a caller-supplied Host. */
export function recoveryRedirect(base: string | undefined): string | null {
  try {
    const url = new URL(base ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) return null;
    return `${url.origin}/auth/callback?next=%2Freset-password`;
  } catch { return null; }
}

export function passwordIssue(password: string, confirmation: string): string | null {
  if (password.length < 6) return "Mật khẩu cần ít nhất 6 ký tự; máy chủ có thể yêu cầu mạnh hơn.";
  if (password.length > 256) return "Mật khẩu tối đa 256 ký tự.";
  if (password !== confirmation) return "Hai mật khẩu chưa khớp.";
  return null;
}

export function passwordError(code?: string): string | null {
  const messages: Record<string, string> = {
    reauthentication_needed: "Cần xác minh lại. Hãy nhận mã xác minh rồi nhập mã trong email.",
    reauthentication_not_valid: "Mã xác minh chưa đúng hoặc đã hết hạn. Hãy nhận mã mới.",
    same_password: "Mật khẩu mới cần khác mật khẩu hiện tại.",
    weak_password: "Mật khẩu chưa đáp ứng chính sách bảo mật. Hãy dùng mật khẩu dài hơn, có chữ hoa, chữ thường, số và ký tự đặc biệt.",
    session_not_found: "Phiên xác thực đã hết hạn. Hãy yêu cầu liên kết mới.",
    otp_expired: "Liên kết đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu liên kết mới.",
  };
  return code ? messages[code] ?? null : null;
}
