import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedQuizView } from "@/components/quiz/shared-quiz-view";
import styles from "../../../my-quizzes/my-quizzes.module.css";

export const metadata: Metadata = { title: "Quiz được chia sẻ" };

export default function SharedQuizPage({ params }: PageProps<"/shared/quiz/[token]">) {
  return (
    <div className={`container ${styles.page}`}>
      <Suspense fallback={null}>
        <SharedContent params={params} />
      </Suspense>
    </div>
  );
}

/** Đọc mã chia sẻ từ URL bên trong Suspense; nội dung do trình duyệt tải qua hàm có kiểm soát quyền. */
async function SharedContent({ params }: Pick<PageProps<"/shared/quiz/[token]">, "params">) {
  const { token } = await params;
  return <SharedQuizView token={token} />;
}
