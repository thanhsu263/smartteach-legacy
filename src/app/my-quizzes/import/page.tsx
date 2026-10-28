import type { Metadata } from "next";
import Link from "next/link";
import { ImportQuiz } from "@/components/quiz/import-quiz";
import styles from "../my-quizzes.module.css";

export const metadata: Metadata = { title: "Nhập quiz từ tệp" };

export default function ImportQuizPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className="page-head" data-surface="panel">
        <h1 className={styles.title}>Nhập quiz từ tệp</h1>
        <p className={styles.lead}>
          Đưa câu hỏi có sẵn vào quiz mới: tệp Excel (.xlsx), tệp CSV hoặc văn bản dán. Thầy cô xem trước và sửa lỗi trước khi tạo; chưa tạo
          thì chưa có gì được lưu.
        </p>
        <p className={styles.lead}>
          <Link href="/my-quizzes">Quay lại Quiz của tôi</Link>
        </p>
      </header>
      <ImportQuiz />
    </div>
  );
}
