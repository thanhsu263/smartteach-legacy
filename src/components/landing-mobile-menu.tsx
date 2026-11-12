import type { ReactNode, Ref } from "react";
import styles from "@/app/page.module.css";

export function LandingMobileMenu({ menuRef, children }: { menuRef: Ref<HTMLDetailsElement>; children: ReactNode }) {
  return (
    <details ref={menuRef} className={styles.mobileMenu}>
      <summary className={styles.mobileMenuButton} aria-label="Menu" aria-controls="site-menu">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </summary>
      <nav id="site-menu" className={styles.mobileMenuPanel} aria-label="Điều hướng landing trên điện thoại">
        {children}
      </nav>
    </details>
  );
}
