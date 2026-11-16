import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { recoveryRedirect } from "@/lib/auth/password";
import styles from "@/components/auth/password-forms.module.css";
export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false }, referrer: "no-referrer" };
export default function ForgotPasswordPage() {
  return <section className={styles.page}><h1>Quên mật khẩu</h1><p>Nhận liên kết để đặt lại mật khẩu SmartTeach.</p><ForgotPasswordForm redirectTo={recoveryRedirect(process.env.APP_BASE_URL)} /></section>;
}
