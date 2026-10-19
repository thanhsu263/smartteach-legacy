import type { Metadata } from "next";
import { QuizzesManager } from "@/components/quiz/quizzes-manager";
import styles from "./my-quizzes.module.css";

export const metadata: Metadata = { title: "Quiz của tôi" };

export default function MyQuizzesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header>
        <h1 className={styles.title}>Quiz của tôi</h1>
        <p className={styles.lead}>
          Soạn quiz với câu hỏi trắc nghiệm, đúng sai, nhiều đáp án và điền từ. Quiz mặc định chỉ thầy cô thấy; có thể chia sẻ bằng link để đồng nghiệp sao chép.
        </p>
      </header>
      <QuizzesManager />
    </div>
  );
}
