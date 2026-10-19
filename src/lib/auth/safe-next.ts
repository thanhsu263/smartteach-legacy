const LOCAL_ORIGIN = "http://localhost";

/**
 * Chỉ chấp nhận đường dẫn nội bộ cho tham số `next` sau đăng nhập, để không bị lợi dụng
 * chuyển hướng người dùng sang trang ngoài (open redirect).
 *
 * Lưu ý: chuẩn hoá URL có thể biến một đường dẫn trông vô hại như "/..//host" thành "//host",
 * một địa chỉ cùng giao thức trỏ ra ngoài. Vì vậy phải kiểm tra lại trên kết quả đã chuẩn hoá.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  // Phải bắt đầu bằng một dấu "/" duy nhất; "//host", "/\host" và chuỗi có ký tự điều khiển bị loại.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const parsed = new URL(value, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN) return fallback;
    const normalized = parsed.pathname + parsed.search + parsed.hash;
    if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
    if (new URL(normalized, LOCAL_ORIGIN).origin !== LOCAL_ORIGIN) return fallback;
    return normalized;
  } catch {
    return fallback;
  }
}

/**
 * Địa chỉ đầy đủ để chuyển hướng tới trang đích, đảm bảo cùng gốc với `origin`.
 * Lớp kiểm tra thứ hai cho nơi dùng `next` để dựng URL tuyệt đối.
 */
export function internalRedirectUrl(next: string | null | undefined, origin: string, fallback: string): URL {
  const target = new URL(safeNextPath(next, fallback), origin);
  return target.origin === origin ? target : new URL(fallback, origin);
}
