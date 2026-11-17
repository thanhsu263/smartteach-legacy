import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { AuthHeading, AuthSplit } from "@/components/auth/auth-split";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthSplit>
      {/* Tiêu đề nằm trong LoginForm để đổi thành "Tạo tài khoản" khi chuyển chế độ. */}
      <Suspense fallback={<AuthHeading title="Đăng nhập" />}><LoginForm /></Suspense>
    </AuthSplit>
  );
}
