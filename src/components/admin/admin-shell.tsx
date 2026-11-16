"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";
const links = [
  ["/admin", "Tổng quan"],
  ["/admin/users", "Tài khoản"],
  ["/admin/ai", "AI/API"],
  ["/admin/rag/documents", "Tài liệu RAG"],
  ["/admin/library", "Duyệt học liệu"],
  ["/admin/games", "Danh mục game"],
  ["/admin/memberships", "Thành viên/đơn"],
  ["/admin/settings", "Cấu hình website"],
  ["/admin/audit", "Nhật ký"],
  ["/admin/operations", "Vận hành"],
  ["/admin/feedback", "Góp ý"],
] as const;
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}>
          SmartTeach · Quản trị
        </Link>
        <nav aria-label="Điều hướng quản trị">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href ||
                (href !== "/admin" && path.startsWith(href + "/"))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard">Về không gian dạy học</Link>
      </aside>
      <div className={styles.workspace}>{children}</div>
    </div>
  );
}
