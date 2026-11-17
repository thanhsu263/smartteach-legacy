import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { SiteHeaderAction } from "@/components/site-header-action";
import { siteConfig } from "@/config/site";
import styles from "./site-header.module.css";

/** Header tập trung cho trang công khai ngoài shell (học sinh, chia sẻ, quyền riêng tư, 404): logo và một hành động. */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} data-glass="row">
          <LogoMark size={32} />
          <span>{siteConfig.name}</span>
        </Link>
        <SiteHeaderAction />
      </div>
    </header>
  );
}
