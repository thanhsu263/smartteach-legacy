"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { ClockIcon } from "@/components/icons";
import { parseServerTime, type ServerClock } from "@/lib/live/clock";
import type { LiveResult } from "@/lib/live/rpc";
import type { AnswerValue, PlayerState } from "@/lib/live/types";
import { useNow } from "@/lib/live/use-now";
import { AnswerTiles } from "./answer-tiles";
import { ChestResult } from "./chest";
import { Countdown } from "./countdown";
import { StreakChip } from "./streak-chip";
import styles from "./player.module.css";

type QuestionProps = {
  state: PlayerState;
  clock: ServerClock;
  submit: (answer: AnswerValue) => Promise<LiveResult<object>>;
};

/**
 * Câu hỏi đang mở. Một đáp án mỗi câu: sau khi gửi thì khoá. Gửi lỗi (mất mạng...) thì giữ nguyên lựa chọn
 * và chữ đã gõ để thử lại. Phải dùng `key` theo số thứ tự câu để mỗi câu bắt đầu sạch.
 */
export function Question({ state, clock, submit }: QuestionProps) {
  const question = state.question;
  // Tải lại trang giữa câu: máy chủ trả lại đáp án đã gửi của chính mình để hiện đúng ô đã chọn.
  const mine = state.your_answer;
  const [selected, setSelected] = useState<number[]>(() => (typeof mine === "number" ? [mine] : Array.isArray(mine) ? mine : []));
  const [text, setText] = useState(() => (typeof mine === "string" ? mine : ""));
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(state.answered === true);
  const [error, setError] = useState<string | null>(null);
  const textId = useId();
  const now = useNow(250);

  if (!question) return null;

  const totalMs = question.time_limit_seconds * 1000;
  const closesAt = parseServerTime(state.closes_at);
  const remaining = Number.isFinite(closesAt) ? Math.max(0, Math.min(totalMs, closesAt - (now + clock.offsetMs()))) : totalMs;
  const timeUp = state.time_up === true || remaining <= 0;
  const locked = sent || pending || timeUp;

  async function send(answer: AnswerValue) {
    if (locked) return;
    setPending(true);
    setError(null);
    const result = await submit(answer);
    setPending(false);
    // "Đã trả lời rồi" nghĩa là máy chủ đã nhận (ví dụ lần gửi trước bị mất phản hồi): coi như xong.
    if (result.ok || result.reason === "already_answered") {
      setSent(true);
      return;
    }
    setError(result.message);
  }

  function pick(index: number) {
    if (locked) return;
    if (question?.kind === "multi") {
      setSelected((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b)));
      return;
    }
    // Một đáp án và đúng/sai: chạm một lần là gửi.
    setSelected([index]);
    void send(index);
  }

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim() !== "") void send(text.trim());
  }

  return (
    <div className={styles.screen}>
      <div className={styles.meta}>
        <span>
          Câu {state.question_index} / {state.question_total}
        </span>
        <span>{state.score} điểm</span>
      </div>

      <Countdown remainingMs={remaining} totalMs={totalMs} />

      <StreakChip streak={state.streak} />
      {/* Rương của câu trước mà máy chủ tự mở (học sinh chưa kịp mở): báo để biết vì sao điểm đổi. */}
      {state.last_chest?.status === "opened" ? (
        <div role="status" className={`${styles.chestNotice} animate-fade-up`}>
          <ChestResult chest={state.last_chest} note="Rương câu trước đã tự mở cho bạn." />
        </div>
      ) : null}

      <h1 className={styles.title}>{question.prompt}</h1>
      {question.kind === "multi" ? <p className={styles.hint}>Chọn tất cả đáp án đúng rồi bấm Gửi đáp án.</p> : null}

      {question.kind === "short_text" ? (
        <form onSubmit={submitText} className={styles.answerForm}>
          <div className={styles.field}>
            <label htmlFor={textId}>Câu trả lời của bạn</label>
            <input
              id={textId}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              maxLength={200}
              value={text}
              disabled={locked}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" className={styles.big} disabled={locked || text.trim() === ""}>
            {pending ? "Đang gửi…" : "Gửi đáp án"}
          </Button>
        </form>
      ) : (
        <>
          <AnswerTiles options={question.options} selected={selected} disabled={locked} onPick={pick} />
          {question.kind === "multi" ? (
            <Button variant="primary" className={styles.big} disabled={locked || selected.length === 0} onClick={() => void send(selected)}>
              {pending ? "Đang gửi…" : "Gửi đáp án"}
            </Button>
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {error}
        </p>
      ) : null}

      {sent ? (
        <p role="status" className={`${styles.waiting} animate-fade-up`}>
          <ClockIcon aria-hidden="true" />
          <span>Đã gửi đáp án. Chờ cả lớp…</span>
        </p>
      ) : timeUp ? (
        <p role="status" className={`${styles.waiting} animate-fade-up`}>
          <ClockIcon aria-hidden="true" />
          <span>Hết giờ. Chờ kết quả…</span>
        </p>
      ) : null}
    </div>
  );
}
