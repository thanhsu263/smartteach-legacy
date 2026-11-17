"use client";

import { useAuth } from "@/components/auth-provider";
import { ButtonLink } from "@/components/button";
import { loginNav } from "@/config/navigation";
import styles from "./site-header.module.css";

/** Hành động duy nhất của header tập trung: vào không gian dạy học khi đã đăng nhập, ngược lại là Đăng nhập. */
export function SiteHeaderAction() {
  const { status } = useAuth();
  // Giữ chỗ trong lúc chờ phiên để không nháy sai nhãn.
  if (status === "loading") return <span className={styles.actionPlaceholder} aria-hidden="true" />;
  return status === "signed-in" ? (
    <ButtonLink href="/dashboard" variant="secondary" size="sm">
      Không gian dạy học
    </ButtonLink>
  ) : (
    <ButtonLink href={loginNav.href} variant="secondary" size="sm">
      {loginNav.label}
    </ButtonLink>
  );
}
