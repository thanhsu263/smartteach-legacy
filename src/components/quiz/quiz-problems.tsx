import { describeProblem } from "@/lib/quiz/errors";
import type { QuizProblem } from "@/lib/quiz/types";
import styles from "./quiz-problems.module.css";

/** Những gì còn thiếu để quiz chơi được; hiện lời xác nhận khi đã đủ. */
export function QuizProblems({ problems }: { problems: readonly QuizProblem[] }) {
  if (problems.length === 0) {
    return (
      <p role="status" className={styles.ready}>
        Quiz đã đủ để chơi: mọi câu hỏi đều hợp lệ.
      </p>
    );
  }
  return (
    <section aria-labelledby="quiz-problems-title" className={styles.problems}>
      <h2 id="quiz-problems-title" className={styles.title}>
        Cần sửa trước khi chơi
      </h2>
      <ul className={styles.list}>
        {problems.map((problem) => (
          <li key={`${problem.position}-${problem.code}`}>{describeProblem(problem.code, problem.position)}</li>
        ))}
      </ul>
    </section>
  );
}
