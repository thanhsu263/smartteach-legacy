import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/auth/password-forms";
import styles from "@/components/auth/password-forms.module.css";
export const metadata: Metadata = { title: "Đặt lại mật khẩu", robots: { index: false }, referrer: "no-referrer" };
export default function ResetPasswordPage() {
  return <section className={styles.page}><h1>Đặt lại mật khẩu</h1><Suspense fallback={<p>Đang xác minh…</p>}><PasswordForm mode="reset" /></Suspense></section>;
}
