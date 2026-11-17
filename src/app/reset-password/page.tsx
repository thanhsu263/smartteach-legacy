import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSplit } from "@/components/auth/auth-split";
import { PasswordForm } from "@/components/auth/password-forms";
export const metadata: Metadata = { title: "Đặt lại mật khẩu", robots: { index: false }, referrer: "no-referrer" };
export default function ResetPasswordPage() {
  return <AuthSplit title="Đặt lại mật khẩu"><Suspense fallback={<p>Đang xác minh…</p>}><PasswordForm mode="reset" /></Suspense></AuthSplit>;
}
