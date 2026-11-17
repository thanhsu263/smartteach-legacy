"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TeacherShell } from "@/components/teacher-shell";

function isLiveCanvas(pathname: string) {
  return pathname === "/play" || /^\/host\/[^/]+(?:\/results)?$/.test(pathname);
}

function usesTeacherShell(pathname: string) {
  // Q3: hub `/host` vào shell; `/host/[id]` và kết quả vẫn là canvas.
  if (pathname === "/host") return true;
  return ["/dashboard", "/assignments", "/my-classes", "/my-quizzes", "/my-exams", "/library", "/games", "/tools", "/membership", "/help/sources", "/account", "/feedback"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Trang xác thực dùng bố cục chia đôi riêng (AuthSplit), không có header/footer site. */
function isAuthSplit(pathname: string) {
  return pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password";
}

/** Tách chrome khỏi `<main>` để `notFound()` của Server Component giữ mã HTTP. */
export function AppHeader() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  if (usesTeacherShell(pathname)) return <TeacherShell />;
  return pathname === "/" || isAuthSplit(pathname) || isLiveCanvas(pathname) ? null : <SiteHeader />;
}

export function AppFooter() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return pathname === "/" || isAuthSplit(pathname) || isLiveCanvas(pathname) || usesTeacherShell(pathname) ? null : <SiteFooter />;
}
