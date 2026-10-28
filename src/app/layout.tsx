import "./globals.css";
import "@/styles/tokens.css";
import "@/styles/glass.css";
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AmbientBackground } from "@/components/ambient-background";
import { AuthProvider } from "@/components/auth-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { LiquidGlass } from "@/components/liquid-glass";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>
        <AmbientBackground />
        <LiquidGlass />
        <AuthProvider>
          <FavoritesProvider>
            <a className="skip-link" href="#main">
              Bỏ qua tới nội dung
            </a>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
