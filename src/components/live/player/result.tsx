"use client";

import { CheckIcon, ClockIcon, CloseIcon } from "@/components/icons";
import type { LeaderboardView, PlayerState } from "@/lib/live/types";
import { useLeaderboard } from "@/lib/live/use-leaderboard";
import { ReviewTiles } from "./answer-tiles";
import { answerStyle } from "./answer-styles";
import styles from "./player.module.css";

function Board({ top, myRank, nickname }: { top: LeaderboardView["top"]; myRank: number; nickname: string }) {
  return (
    <ol className={styles.board} aria-label="Bảng xếp hạng">
      {top.map((row) => {
        const me = row.nickname === nickname;
        return (
          <li key={`${row.rank}-${row.nickname}`} className={styles.row} data-me={me}>
            <span className={styles.rank}>#{row.rank}</span>
            <span className={styles.rowName}>
              {row.nickname}
              {me ? " (bạn)" : ""}
            </span>
            <span className={styles.rowScore}>{row.score}</span>
          </li>
        );
      })}
      {!top.some((row) => row.nickname === nickname) ? (
        <li className={styles.row} data-me="true">
          <span className={styles.rank}>#{myRank}</span>
          <span className={styles.rowName}>{nickname} (bạn)</span>
        </li>
      ) : null}
    </ol>
  );
}

/** Kết quả một câu sau khi đóng: đúng hay sai bằng chữ và biểu tượng, điểm, đáp án đúng và bảng xếp hạng. */
export function Result({ state, token }: { state: PlayerState; token: string }) {
  const board = useLeaderboard(token, `${state.seq}`);
  const question = state.question;
  const key = state.key;
  if (!question || !key) return null;

  const answered = state.answered === true;
  const tone = !answered ? "none" : state.is_correct ? "correct" : "wrong";
  const choice = question.kind !== "short_text";
  const mine = Array.isArray(state.your_answer) ? state.your_answer : typeof state.your_answer === "number" ? [state.your_answer] : [];
  const correctIndexes = "correct" in key ? key.correct : [];

  return (
    <div className={styles.screen}>
      <div className={styles.meta}>
        <span>
          Câu {state.question_index} / {state.question_total}
        </span>
        <span>{state.nickname}</span>
      </div>

      <div className={styles.verdict} data-tone={tone}>
        {tone === "correct" ? <CheckIcon size={36} /> : tone === "wrong" ? <CloseIcon size={36} /> : <ClockIcon size={36} />}
        <h1 className={styles.title}>{tone === "correct" ? "Đúng rồi!" : tone === "wrong" ? "Chưa đúng" : "Bạn chưa trả lời"}</h1>
      </div>

      <p className={styles.points}>{(state.points ?? 0) > 0 ? `+${state.points} điểm` : "Câu này bạn được 0 điểm"}</p>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Tổng điểm</dt>
          <dd>{state.score}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Thứ hạng</dt>
          <dd>{state.rank ?? "-"}</dd>
        </div>
      </dl>

      <section className={styles.review} aria-label="Đáp án đúng">
        <h2 className={styles.reviewTitle}>{question.prompt}</h2>
        {choice ? (
          <ReviewTiles options={question.options} correct={correctIndexes} mine={mine} />
        ) : (
          <div className={styles.card}>
            <p>
              Đáp án đúng:{" "}
              <strong>{"accepted_answers" in key ? key.accepted_answers.join(" / ") : ""}</strong>
            </p>
            {answered && typeof state.your_answer === "string" ? <p>Bạn trả lời: {state.your_answer}</p> : null}
          </div>
        )}
        {choice && answered && mine.length > 0 ? (
          <p className={styles.hint}>Bạn chọn: {mine.map((i) => answerStyle(i).letter).join(", ")}</p>
        ) : null}
      </section>

      <section className={styles.review} aria-label="Xếp hạng">
        <h2 className={styles.reviewTitle}>Xếp hạng</h2>
        {board && board.ok ? (
          <Board top={board.board.top} myRank={board.board.me.rank} nickname={state.nickname} />
        ) : board ? (
          <p className={styles.error}>{board.message}</p>
        ) : (
          <p className={styles.hint}>Đang tải xếp hạng…</p>
        )}
      </section>

      <p role="status" className={styles.waiting}>
        <ClockIcon aria-hidden="true" />
        <span>Chờ thầy cô sang câu tiếp theo…</span>
      </p>
    </div>
  );
}
