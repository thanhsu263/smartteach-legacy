"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { parseServerTime, type ServerClock } from "@/lib/live/clock";
import type { HostState } from "@/lib/live/types";
import { useNow } from "@/lib/live/use-now";
import { OptionBoard } from "./option-board";
import styles from "./host.module.css";

type QuestionViewProps = {
  state: HostState;
  clock: ServerClock;
  busy: boolean;
  /** Giáo viên bấm "Hiện đáp án" (đóng câu sớm). */
  onShowAnswer: () => void;
  /** Hết giờ: nhờ máy chủ đóng câu. Trả true khi đã đóng (hoặc không cần nữa); false thì thử lại sau ít lâu. */
  onTimeUp: () => Promise<boolean>;
};

/** Câu đang mở: đề cỡ lớn, đếm giờ theo giờ máy chủ, số người đã trả lời. KHÔNG có khoá đáp án (màn hình này được chiếu). */
export function QuestionView({ state, clock, busy, onShowAnswer, onTimeUp }: QuestionViewProps) {
  const question = state.question;
  const now = useNow(250);
  const timeUpRef = useRef(onTimeUp);

  const total = (question?.time_limit_seconds ?? 0) * 1000;
  const closesAt = parseServerTime(state.closes_at);
  const raw = Number.isFinite(closesAt) ? closesAt - (now + clock.offsetMs()) : total;
  const remaining = Math.max(0, Math.min(total, raw));
  // Chờ thêm 300ms sau hạn chót để chắc chắn máy chủ cũng đã qua hạn rồi mới đóng câu.
  const late = raw <= -300;

  useEffect(() => {
    timeUpRef.current = onTimeUp;
  });
  // Máy chủ chỉ đóng khi giờ của nó đã qua hạn nên nếu đồng hồ trình duyệt đi trước thì lần này trả false và ta thử lại
  // mỗi giây; mất mạng cũng thử lại (lỗi được báo ở màn hình).
  useEffect(() => {
    if (!late) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = async () => {
      const done = await timeUpRef.current();
      if (!cancelled && !done) timer = setTimeout(attempt, 1000);
    };
    void attempt();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [late, state.question_index]);

  if (!question) return null;
  const active = state.players.filter((player) => !player.removed).length;
  const seconds = Math.ceil(remaining / 1000);
  const percent = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <div className={styles.screen}>
      <div className={styles.meta}>
        <span>
          Câu {state.question_index} / {state.question_total}
        </span>
        <span>{state.quiz_title}</span>
      </div>

      <div className={styles.timer} role="timer" aria-label="Thời gian còn lại">
        <p className={styles.seconds}>{seconds > 0 ? `Còn ${seconds} giây` : "Hết giờ"}</p>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.bar} style={{ width: `${percent}%` }} data-low={seconds <= 5} />
        </div>
      </div>

      <h1 className={styles.prompt}>{question.prompt}</h1>

      {question.kind === "short_text" ? (
        <p className={styles.notice}>Các bạn gõ câu trả lời ngắn trên điện thoại.</p>
      ) : (
        <OptionBoard options={question.options} />
      )}

      <p className={styles.answered} aria-live="off">
        <span>
          {state.answered_count} / {active}
        </span>
        <span>bạn đã trả lời</span>
      </p>

      <div className={styles.controls}>
        <Button variant="primary" className={styles.primary} onClick={onShowAnswer} disabled={busy}>
          Hiện đáp án
        </Button>
        <span className={styles.shortcut}>{late ? "Hết giờ, đang chốt đáp án…" : "Nhấn Space để hiện đáp án sớm."}</span>
      </div>
    </div>
  );
}
