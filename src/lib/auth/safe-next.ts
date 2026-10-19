/**
 * Chỉ chấp nhận đường dẫn nội bộ cho tham số `next` sau đăng nhập, để không bị lợi dụng
 * chuyển hướng người dùng sang trang ngoài (open redirect).
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  // Phải bắt đầu bằng một dấu "/" duy nhất; "//host", "/\host" và chuỗi có ký tự điều khiển bị loại.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, "http://localhost");
    if (parsed.origin !== "http://localhost") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
