import type { Metadata } from "next";
import { QuizzesManager } from "@/components/quiz/quizzes-manager";
import styles from "./my-quizzes.module.css";

export const metadata: Metadata = { title: "Quiz của tôi" };

export default function MyQuizzesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}><h1>Quiz của tôi</h1><p>Soạn quiz, lưu câu hỏi và tổ chức buổi chơi trực tiếp cùng lớp.</p></header>
      <QuizzesManager />
    </div>
  );
}
