/**
 * Các khu vực chỉ dành cho giáo viên đã đăng nhập. Khi thêm khu vực mới, thêm cả vào `matcher`
 * của `src/proxy.ts` (matcher phải là danh sách chuỗi viết thẳng nên không dùng lại hằng số này được).
 */
export const PROTECTED_PREFIXES = ["/my-classes", "/my-quizzes", "/shared", "/host"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
