"use client";

import { Button } from "@/components/button";
import type { PlayerState } from "@/lib/live/types";
import { formatDelta } from "@/lib/live/treasure";
import { useLeaderboard } from "@/lib/live/use-leaderboard";
import { ChestResult } from "./chest";
import styles from "./player.module.css";

/** Kết thúc phiên: hạng cuối của mình và bục top 3. */
export function Final({ state, token, onLeave }: { state: PlayerState; token: string; onLeave: () => void }) {
  const board = useLeaderboard(token, `${state.seq}`);
  const total = state.player_total ?? 0;

  return (
    <div className={styles.screen}>
      <header>
        <h1 className={styles.title}>Kết thúc!</h1>
        <p className={styles.lead}>
          {state.nickname}, bạn đứng hạng <strong>{state.rank ?? "-"}</strong>
          {total > 0 ? ` trong ${total} bạn` : ""} với <strong>{state.score}</strong> điểm.
        </p>
      </header>

      {state.treasure && state.treasure.opened > 0 ? (
        <section className={styles.review} aria-label="Kho báu">
          <h2 className={styles.reviewTitle}>Kho báu</h2>
          <p>
            Bạn đã mở {state.treasure.opened} rương: <strong>{formatDelta(state.treasure.delta)}</strong> so với điểm không có kho báu.
          </p>
          {state.last_chest?.status === "opened" ? <ChestResult chest={state.last_chest} note="Rương này đã tự mở cho bạn." /> : null}
        </section>
      ) : null}

      <section className={styles.review} aria-label="Bục vinh danh">
        <h2 className={styles.reviewTitle}>Top 3</h2>
        {board && board.ok ? (
          <ol className={styles.board}>
            {board.board.top.map((row) => (
              <li key={`${row.rank}-${row.nickname}`} className={styles.row} data-me={row.nickname === state.nickname}>
                <span className={styles.rank}>#{row.rank}</span>
                <span className={styles.rowName}>
                  {row.nickname}
                  {row.nickname === state.nickname ? " (bạn)" : ""}
                </span>
                <span className={styles.rowScore}>{row.score}</span>
              </li>
            ))}
          </ol>
        ) : board ? (
          <p className={styles.error}>{board.message}</p>
        ) : (
          <p className={styles.hint}>Đang tải bục vinh danh…</p>
        )}
      </section>

      <Button variant="primary" className={styles.big} onClick={onLeave}>
        Chơi phiên khác
      </Button>
    </div>
  );
}
