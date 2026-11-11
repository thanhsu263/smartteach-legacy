import type { Metadata } from "next";
import Link from "next/link";
import { SessionHub } from "@/components/live/host/session-hub";
import { SessionHistory } from "@/components/live/results/session-history";
import styles from "./host.module.css";

export const metadata: Metadata = { title: "Các buổi đã chơi" };

/**
 * Mọi buổi đã chơi của giáo viên, kể cả của quiz đã xoá. Nhờ đây thầy cô luôn xem được kết quả và xoá ngay dữ liệu
 * người chơi, không phải chờ hạn 90 ngày.
 */
export default function SessionsPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={`${styles.hero} on-primary`}>
        <div>
          <p className={styles.eyebrow}>Theo dõi sau giờ học</p>
          <h1 className={styles.title}>Các buổi đã chơi</h1>
          <p className={styles.heroMessage}>Xem lại kết quả, giữ quyền kiểm soát dữ liệu</p>
        </div>
        <p className={styles.lead}>
          Kết quả mọi buổi chơi trực tiếp của thầy cô. Dữ liệu người chơi tự xoá sau khoảng 90 ngày; thầy cô xoá ngay được từng buổi.
        </p>
      </header>
      <SessionHub />
      <SessionHistory />
      <p className={styles.back}>
        <Link href="/my-quizzes">Về Quiz của tôi</Link>
      </p>
    </div>
  );
}
