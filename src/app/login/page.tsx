import type { Metadata } from "next";
import Link from "next/link";
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
      <header className="page-head" data-surface="panel">
        <h1 className={styles.title}>Đăng nhập</h1>
        <p className={styles.lead}>
          Thầy cô đăng nhập để lưu danh sách lớp và trò chơi yêu thích. Học sinh không cần tài khoản.{" "}
          <Link href="/privacy">Xem cách ứng dụng dùng dữ liệu</Link>.
        </p>
      </header>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
