"use client";

import { useEffect, useId, useReducer, useRef, useState } from "react";
import { Button } from "@/components/button";
import { ToolStage } from "@/components/tool-stage";
import { playFinishBeeps, prepareAudio } from "@/lib/utilities/beep";
import {
  MAX_MINUTES,
  createTimer,
  durationFrom,
  formatTime,
  pauseTimer,
  resetTimer,
  startTimer,
  tickTimer,
  type TimerState,
} from "@/lib/utilities/countdown";
import styles from "./countdown-tool.module.css";

type Action =
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "tick"; now: number }
  | { type: "reset" }
  | { type: "setDuration"; durationMs: number };

function reducer(state: TimerState, action: Action): TimerState {
  switch (action.type) {
    case "start":
      return startTimer(state, action.now);
    case "pause":
      return pauseTimer(state, action.now);
    case "tick":
      return tickTimer(state, action.now);
    case "reset":
      return resetTimer(state);
    case "setDuration":
      return createTimer(action.durationMs);
  }
}

const PRESET_MINUTES = [1, 3, 5, 10] as const;
const DEFAULT_MINUTES = 5;
const TICK_MS = 200;

export function CountdownTool() {
  const [state, dispatch] = useReducer(reducer, createTimer(DEFAULT_MINUTES * 60_000));
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const [seconds, setSeconds] = useState("0");
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  const minutesId = useId();
  const secondsId = useId();
  const soundId = useId();

  const running = state.status === "running";
  const editable = state.status === "idle" || state.status === "finished";

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => dispatch({ type: "tick", now: Date.now() }), TICK_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const finished = state.status === "finished";
  useEffect(() => {
    if (finished && soundOn) playFinishBeeps(audioRef.current);
    // Chỉ phát khi vừa chuyển sang hết giờ, không phát lại khi bật tắt âm báo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function applyDuration(minutesText: string, secondsText: string) {
    setMinutes(minutesText);
    setSeconds(secondsText);
    dispatch({
      type: "setDuration",
      durationMs: durationFrom(Number(minutesText), Number(secondsText || "0")),
    });
  }

  function start() {
    audioRef.current = prepareAudio(audioRef.current);
    dispatch({ type: "start", now: Date.now() });
  }

  const progress =
    state.durationMs > 0 ? Math.min(1, Math.max(0, 1 - state.remainingMs / state.durationMs)) : 0;
  const canStart = state.durationMs > 0 && !running;

  return (
    <ToolStage label="Đồng hồ đếm ngược">
      <div className={styles.tool}>
        <div className={styles.display} data-status={state.status}>
          <p role="timer" aria-label="Thời gian còn lại" className={styles.time}>
            {formatTime(state.remainingMs)}
          </p>
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p role="status" className={styles.finished}>
            {finished ? "Hết giờ!" : ""}
          </p>
        </div>

        <div className={styles.controls}>
          {running ? (
            <Button variant="secondary" onClick={() => dispatch({ type: "pause", now: Date.now() })}>
              Tạm dừng
            </Button>
          ) : (
            <Button variant="primary" onClick={start} disabled={!canStart}>
              {state.status === "paused" ? "Chạy tiếp" : "Bắt đầu"}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => dispatch({ type: "reset" })}
            disabled={state.status === "idle"}
          >
            Đặt lại
          </Button>
        </div>

        <fieldset className={styles.setup} disabled={!editable}>
          <legend className={styles.legend}>Chọn thời gian</legend>
          <div className={styles.presets}>
            {PRESET_MINUTES.map((preset) => (
              <Button
                key={preset}
                variant="secondary"
                aria-pressed={state.durationMs === preset * 60_000}
                onClick={() => applyDuration(String(preset), "0")}
              >
                {preset} phút
              </Button>
            ))}
          </div>
          <div className={styles.custom}>
            <div className={styles.field}>
              <label htmlFor={minutesId}>Phút</label>
              <input
                id={minutesId}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_MINUTES}
                step={1}
                value={minutes}
                onChange={(event) => applyDuration(event.target.value, seconds)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={secondsId}>Giây</label>
              <input
                id={secondsId}
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step={1}
                value={seconds}
                onChange={(event) => applyDuration(minutes, event.target.value)}
              />
            </div>
          </div>
          {state.durationMs === 0 ? (
            <p role="alert" className={styles.error}>
              Nhập số phút từ 0 đến {MAX_MINUTES} và số giây từ 0 đến 59, tổng lớn hơn 0.
            </p>
          ) : null}
        </fieldset>

        <div className={styles.sound}>
          <input
            id={soundId}
            type="checkbox"
            checked={soundOn}
            onChange={(event) => setSoundOn(event.target.checked)}
          />
          <label htmlFor={soundId}>Phát âm báo khi hết giờ</label>
        </div>
      </div>
    </ToolStage>
  );
}
