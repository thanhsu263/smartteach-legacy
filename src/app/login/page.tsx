import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header>
        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.lead}>
          Thầy cô đăng nhập để lưu danh sách lớp và trò chơi yêu thích. Học sinh không cần tài khoản.
        </p>
      </header>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
