import type { LeaderboardRow } from "@/lib/live/types";
import styles from "./host.module.css";

/** Bảng xếp hạng top 5 sau mỗi câu. */
export function Leaderboard({ rows }: { rows: readonly LeaderboardRow[] }) {
  if (rows.length === 0) return <p className={styles.hint}>Chưa có ai trong bảng xếp hạng.</p>;
  return (
    <ol className={styles.leaderboard} aria-label="Bảng xếp hạng">
      {rows.map((row) => (
        <li key={`${row.rank}-${row.nickname}`} className={styles.leaderRow}>
          <span className={styles.rank}>#{row.rank}</span>
          <span className={styles.leaderName}>{row.nickname}</span>
          <span className={styles.leaderScore}>{row.score}</span>
        </li>
      ))}
    </ol>
  );
}
