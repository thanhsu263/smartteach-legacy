"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Giữ một root layout duy nhất nhưng chỉ render header/footer cho các route
 * thường. `main` vẫn được root layout server-render trực tiếp để route 404 và
 * metadata không bị biến thành fallback client.
 */
function isLiveCanvas(pathname: string) {
  return pathname === "/play" || /^\/host\/[^/]+(?:\/results)?$/.test(pathname);
}

function ownsChrome(pathname: string) {
  return pathname === "/" || isLiveCanvas(pathname);
}

export function AppHeader() {
  const pathname = usePathname();

  return ownsChrome(pathname) ? null : <SiteHeader />;
}

export function AppFooter() {
  const pathname = usePathname();

  return ownsChrome(pathname) ? null : <SiteFooter />;
}
