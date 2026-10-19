import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/icons";
import { SiteNav } from "@/components/site-nav";
import { SiteNavFallback } from "@/components/site-nav-fallback";
import { siteConfig } from "@/config/site";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <LogoMark size={32} />
          <span>{siteConfig.name}</span>
        </Link>
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
      </div>
    </header>
  );
}
