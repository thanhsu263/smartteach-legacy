/**
 * Các khu vực chỉ dành cho giáo viên đã đăng nhập. Khi thêm khu vực mới, thêm cả vào `matcher`
 * của `src/proxy.ts` (matcher phải là danh sách chuỗi viết thẳng nên không dùng lại hằng số này được).
 */
export const PROTECTED_PREFIXES = ["/dashboard", "/assignments", "/my-classes", "/my-quizzes", "/my-exams", "/shared", "/host", "/membership", "/admin", "/help/sources", "/account", "/feedback"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
