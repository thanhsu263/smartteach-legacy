import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { loginNav, mainNav, privacyNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const links = [...mainNav, loginNav, privacyNav];
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.about}>
          <p className={styles.brand}>
            <LogoMark size={28} />
            <span>{siteConfig.name}</span>
          </p>
          <p className={styles.note}>
            Làm cho giáo viên Việt Nam: mở lên là dùng được, không cần cài đặt.
          </p>
        </div>
        <nav aria-label="Liên kết cuối trang">
          <ul className={styles.links}>
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={styles.legalBar}>
        <div className={`container ${styles.legal}`}>
          <p>
            © {siteConfig.copyrightYear} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
