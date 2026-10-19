import type { LeaderboardRow } from "@/lib/live/types";
import styles from "./host.module.css";

/** Bục cuối buổi: top 3 (đồng hạng vẫn hiện đúng thứ hạng). Có danh sách chữ nên không phụ thuộc vào hình bục. */
export function Podium({ rows }: { rows: readonly LeaderboardRow[] }) {
  if (rows.length === 0) return <p className={styles.hint}>Phiên kết thúc mà chưa có người chơi nào.</p>;
  return (
    <ol className={styles.podium} aria-label="Top 3">
      {rows.slice(0, 3).map((row, index) => (
        <li key={`${row.rank}-${row.nickname}`} className={styles.step} data-place={Math.min(index + 1, 3)}>
          <span className={styles.stepRank}>#{row.rank}</span>
          <span className={styles.stepName}>{row.nickname}</span>
          <span className={styles.stepScore}>{row.score} điểm</span>
        </li>
      ))}
    </ol>
  );
}
