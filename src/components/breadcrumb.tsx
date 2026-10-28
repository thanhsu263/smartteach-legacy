import Link from "next/link";
import styles from "./breadcrumb.module.css";

export type BreadcrumbItem = {
  label: string;
  /** Mục cuối (trang hiện tại) không có href. */
  href?: string;
};

export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Đường dẫn" className={styles.breadcrumb}>
      {items.map((item, index) => (
        <span key={item.label} className={styles.item}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {item.href ? (
            <Link href={item.href} data-glass="row">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
