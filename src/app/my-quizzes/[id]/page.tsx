import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizEditor } from "@/components/quiz/quiz-editor";
import styles from "../my-quizzes.module.css";

export const metadata: Metadata = { title: "Soạn quiz" };

export default function QuizPage({ params }: PageProps<"/my-quizzes/[id]">) {
  return (
    <div className={`container ${styles.page}`}>
      <Suspense fallback={null}>
        <QuizContent params={params} />
      </Suspense>
    </div>
  );
}

/** Đọc id từ URL bên trong Suspense; dữ liệu quiz do trình duyệt tải qua RLS. */
async function QuizContent({ params }: Pick<PageProps<"/my-quizzes/[id]">, "params">) {
  const { id } = await params;
  return <QuizEditor quizId={id} />;
}
