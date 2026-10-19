import { Button } from "@/components/button";
import type { HostState } from "@/lib/live/types";
import { Leaderboard } from "./leaderboard";
import { OptionBoard } from "./option-board";
import styles from "./host.module.css";

type RevealViewProps = {
  state: HostState;
  busy: boolean;
  onNext: () => void;
};

/** Sau khi đóng câu: đáp án đúng, số lượt chọn từng lựa chọn, thống kê, top 5 và nút sang câu tiếp theo. */
export function RevealView({ state, busy, onNext }: RevealViewProps) {
  const question = state.question;
  const key = state.key;
  if (!question || !key) return null;
  const isLast = state.question_index >= state.question_total;
  const distribution = state.distribution;

  return (
    <div className={styles.screen}>
      <div className={styles.meta}>
        <span>
          Câu {state.question_index} / {state.question_total}
        </span>
        <span>{state.quiz_title}</span>
      </div>

      <h1 className={styles.prompt}>{question.prompt}</h1>

      {"correct" in key ? (
        <OptionBoard options={question.options} correct={key.correct} counts={distribution?.options} />
      ) : (
        <div className={styles.notice}>
          <p>
            Đáp án đúng: <strong>{key.accepted_answers.join(" / ")}</strong>
          </p>
        </div>
      )}

      {distribution ? (
        <dl className={styles.stats} aria-label="Thống kê câu này">
          <div className={styles.stat}>
            <dt>Đúng</dt>
            <dd>{distribution.correct}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Chưa đúng</dt>
            <dd>{distribution.wrong}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Chưa trả lời</dt>
            <dd>{distribution.unanswered}</dd>
          </div>
        </dl>
      ) : null}

      <section aria-label="Xếp hạng">
        <h2 className={styles.reviewTitle}>Xếp hạng</h2>
        <Leaderboard rows={state.leaderboard ?? []} />
      </section>

      <div className={styles.controls}>
        <Button variant="primary" className={styles.primary} onClick={onNext} disabled={busy}>
          {isLast ? "Xem kết quả" : "Câu tiếp theo"}
        </Button>
        <span className={styles.shortcut}>Nhấn Space để tiếp tục.</span>
      </div>
    </div>
  );
}
