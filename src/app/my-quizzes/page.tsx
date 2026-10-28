import type { Metadata } from "next";
import Link from "next/link";
import { QuizzesManager } from "@/components/quiz/quizzes-manager";
import styles from "./my-quizzes.module.css";

export const metadata: Metadata = { title: "Quiz của tôi" };

export default function MyQuizzesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className="page-head" data-surface="panel">
        <h1 className={styles.title}>Quiz của tôi</h1>
        <p className={styles.lead}>
          Soạn quiz với câu hỏi trắc nghiệm, đúng sai, nhiều đáp án và điền từ. Quiz mặc định chỉ thầy cô thấy; có thể chia sẻ bằng link để đồng nghiệp sao chép.
        </p>
        <p className={styles.lead}>
          <Link href="/host">Xem kết quả và xoá các buổi đã chơi</Link>
        </p>
      </header>
      <QuizzesManager />
    </div>
  );
}
