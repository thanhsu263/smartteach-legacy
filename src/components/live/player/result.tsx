"use client";

import { CheckIcon, ClockIcon, CloseIcon } from "@/components/icons";
import { parseServerTime, type ServerClock } from "@/lib/live/clock";
import type { LeaderboardView, PlayerState } from "@/lib/live/types";
import { useLeaderboard } from "@/lib/live/use-leaderboard";
import { useNow } from "@/lib/live/use-now";
import { Chest } from "./chest";
import { ReviewTiles } from "./answer-tiles";
import { StreakChip } from "./streak-chip";
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
export function Result({ state, token, clock, onChestOpened }: { state: PlayerState; token: string; clock: ServerClock; onChestOpened: () => void }) {
  // Khoá theo cả điểm: mở rương đổi điểm mà không đổi seq, bảng xếp hạng phải tải lại để khớp tổng điểm.
  const board = useLeaderboard(token, `${state.seq}-${state.score}`);
  const auto = state.auto_advance === true;
  const nextAt = state.next_at ? parseServerTime(state.next_at) : Number.NaN;
  const counting = auto && state.paused !== true && Number.isFinite(nextAt);
  const now = useNow(500, counting);
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

      <StreakChip streak={state.streak} />

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

      {state.chest ? <Chest chest={state.chest} token={token} onOpened={onChestOpened} /> : null}

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
        {!auto ? (
          <span>Chờ thầy cô sang câu tiếp theo…</span>
        ) : state.paused === true ? (
          <span>Thầy cô đang tạm dừng. Câu tiếp theo bắt đầu khi thầy cô tiếp tục.</span>
        ) : (
          <>
            {/* Câu chữ cố định cho trình đọc màn hình; số giây đổi mỗi nhịp chỉ để nhìn. */}
            <span className="visually-hidden">{state.question_index! >= state.question_total ? "Kết quả cuối sẽ tự hiện." : "Câu tiếp theo sẽ tự bắt đầu, bạn không cần bấm gì."}</span>
            <span aria-hidden="true">
              {state.question_index! >= state.question_total ? "Kết quả cuối hiện" : "Câu tiếp theo bắt đầu"}
              {counting ? ` sau ${Math.max(0, Math.ceil((nextAt - (now + clock.offsetMs())) / 1000))} giây` : " ngay"}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
