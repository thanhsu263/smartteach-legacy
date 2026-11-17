/** Hồ sơ nhập khi tạo tài khoản; lưu vào user_metadata của Supabase Auth. */

const SEPARATORS = /[\s.\-()]/g;

/** Gộp khoảng trắng thừa; trả null khi tên rỗng hoặc dài quá 80 ký tự. */
export function normalizeFullName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

/**
 * Số di động Việt Nam: 10 chữ số bắt đầu bằng 0 (đầu 3, 5, 7, 8, 9),
 * hoặc dạng +84/84 tương ứng. Trả về dạng 0xxxxxxxxx, hoặc null khi sai.
 */
export function normalizeVietnamPhone(raw: string): string | null {
  let digits = raw.trim().replace(SEPARATORS, "");
  if (digits.startsWith("+84")) digits = `0${digits.slice(3)}`;
  else if (/^84\d{9}$/.test(digits)) digits = `0${digits.slice(2)}`;
  return /^0[35789]\d{8}$/.test(digits) ? digits : null;
}
