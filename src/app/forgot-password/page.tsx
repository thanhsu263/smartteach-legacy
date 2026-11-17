import type { Metadata } from "next";
import { AuthSplit } from "@/components/auth/auth-split";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { recoveryRedirect } from "@/lib/auth/password";
export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false }, referrer: "no-referrer" };
export default function ForgotPasswordPage() {
  return <AuthSplit title="Quên mật khẩu"><ForgotPasswordForm redirectTo={recoveryRedirect(process.env.APP_BASE_URL)} /></AuthSplit>;
}
