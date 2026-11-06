import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/icons";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <section className={`${styles.showcase} on-primary`} aria-label="Giới thiệu SmartTeach">
        <div className={styles.showcaseBrand}><LogoMark size={48} /><span>SmartTeach</span></div>
        <div className={styles.showcaseCopy}>
          <p>Không gian dành cho giáo viên</p>
          <p className={styles.showcaseTitle}>Chuẩn bị bài dạy, kết nối lớp học và bắt đầu thật nhẹ nhàng.</p>
          <span>Quiz, trò chơi và tiện ích lớp học cùng ở một nơi.</span>
        </div>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.previewBar}><span>Quiz trực tiếp</span><b>04 / 10</b></div>
          <strong>Trái Đất quay quanh Mặt Trời mất bao lâu?</strong>
          <div className={styles.answers}><span>A. 24 giờ</span><span data-selected="true">B. 365 ngày</span><span>C. 30 ngày</span><span>D. 12 giờ</span></div>
        </div>
      </section>
      <section className={styles.authPanel}>
        <div className={styles.mobileBrand}><LogoMark size={40} /><span>SmartTeach</span></div>
        <header className={styles.intro}><h1>Đăng nhập</h1><p>Chào mừng trở lại! Đăng nhập để tiếp tục cùng lớp học.</p></header>
        <Suspense fallback={null}><LoginForm /></Suspense>
      </section>
    </div>
  );
}
