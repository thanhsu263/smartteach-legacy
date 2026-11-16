import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/glass.css";
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";
import { AmbientBackground } from "@/components/ambient-background";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { AuthProvider } from "@/components/auth-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { ChatWidget } from "@/components/chat/chat-widget";
import { siteConfig } from "@/config/site";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f0f5ff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>
        <AmbientBackground />
        <AuthProvider>
          <FavoritesProvider>
            <a className="skip-link" href="#main">Bỏ qua tới nội dung</a>
            <Suspense fallback={null}>
              <AppHeader />
            </Suspense>
            <main id="main">{children}</main>
            <Suspense fallback={null}><ChatWidget /></Suspense>
            <Suspense fallback={null}>
              <AppFooter />
            </Suspense>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
