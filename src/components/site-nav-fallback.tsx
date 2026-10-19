import Link from "next/link";
import { loginNav, mainNav } from "@/config/navigation";
import styles from "./site-nav.module.css";

/**
 * Điều hướng tĩnh hiện trong lúc SiteNav (cần đường dẫn hiện tại) chờ ở các trang có tham số
 * trên URL. Chỉ có liên kết, chưa có đánh dấu trang hiện tại hay trạng thái đăng nhập.
 */
export function SiteNavFallback() {
  return (
    <nav aria-label="Điều hướng chính" className={styles.nav}>
      <ul className={`${styles.list} ${styles.fallbackList}`}>
        {mainNav.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={styles.link}>
              {item.label}
            </Link>
          </li>
        ))}
        <li className={styles.login}>
          <Link href={loginNav.href} className={styles.link}>
            {loginNav.label}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
