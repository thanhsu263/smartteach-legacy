import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/auth/password-forms";
import styles from "@/components/auth/password-forms.module.css";
export const metadata: Metadata = { title: "Bảo mật tài khoản", robots: { index: false } };
export default function SecurityPage() {
  return <section className={styles.page}><h1>Bảo mật tài khoản</h1><p>Đổi mật khẩu của tài khoản đang đăng nhập.</p><Suspense fallback={null}><PasswordForm mode="change" /></Suspense></section>;
}
