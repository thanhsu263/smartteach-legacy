"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TeacherShell } from "@/components/teacher-shell";

function isLiveCanvas(pathname: string) {
  return pathname === "/play" || /^\/host\/[^/]+(?:\/results)?$/.test(pathname);
}

function usesTeacherShell(pathname: string) {
  return ["/my-classes", "/my-quizzes", "/games", "/tools"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Tách chrome khỏi `<main>` để `notFound()` của Server Component giữ mã HTTP. */
export function AppHeader() {
  const pathname = usePathname();
  if (usesTeacherShell(pathname)) return <TeacherShell />;
  return pathname === "/" || pathname === "/login" || isLiveCanvas(pathname) ? null : <SiteHeader />;
}

export function AppFooter() {
  const pathname = usePathname();
  return pathname === "/" || pathname === "/login" || isLiveCanvas(pathname) || usesTeacherShell(pathname) ? null : <SiteFooter />;
}
