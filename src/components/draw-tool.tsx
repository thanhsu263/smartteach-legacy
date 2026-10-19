"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/button";
import { NameListInput } from "@/components/name-list-input";
import { ToolStage } from "@/components/tool-stage";
import { parseNames, pickIndex } from "@/lib/utilities/draw";
import styles from "./draw-tool.module.css";

const ROLL_MS = 900;
const ROLL_INTERVAL_MS = 70;

export function DrawTool() {
  const [text, setText] = useState("");
  const [noRepeat, setNoRepeat] = useState(true);
  const [taken, setTaken] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const timers = useRef<{ interval?: number; timeout?: number }>({});
  const noRepeatId = useId();

  const names = parseNames(text);
  const allTaken = noRepeat && names.length > 0 && taken.length >= names.length;
  const canDraw = names.length > 0 && !allTaken && rolling === null;

  function clearTimers() {
    window.clearInterval(timers.current.interval);
    window.clearTimeout(timers.current.timeout);
  }

  useEffect(() => clearTimers, []);

  function changeNames(value: string) {
    clearTimers();
    setRolling(null);
    setText(value);
    // Danh sách đổi thì các vị trí đã bốc không còn đúng người nữa.
    setTaken([]);
    setCurrent(null);
  }

  function draw() {
    const excluded = new Set(noRepeat ? taken : []);
    const index = pickIndex(names.length, excluded);
    if (index === null) return;

    const settle = () => {
      setRolling(null);
      setCurrent(index);
      setTaken((previous) => [...previous, index]);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }

    setCurrent(null);
    setRolling(names[Math.floor(Math.random() * names.length)]);
    timers.current.interval = window.setInterval(() => {
      setRolling(names[Math.floor(Math.random() * names.length)]);
    }, ROLL_INTERVAL_MS);
    timers.current.timeout = window.setTimeout(() => {
      window.clearInterval(timers.current.interval);
      settle();
    }, ROLL_MS);
  }

  function restart() {
    clearTimers();
    setRolling(null);
    setTaken([]);
    setCurrent(null);
  }

  const shown = rolling ?? (current !== null ? names[current] : null);
  const remaining = names.length - taken.length;

  return (
    <ToolStage label="Bốc thăm tên">
      <div className={styles.tool}>
        <div className={styles.result} data-rolling={rolling !== null}>
          {shown ? (
            <p className={styles.name}>{shown}</p>
          ) : (
            <p className={styles.placeholder}>
              {allTaken ? "Đã bốc hết cả lớp" : "Bấm “Bốc thăm” để gọi một bạn"}
            </p>
          )}
        </div>
        <p role="status" className="visually-hidden">
          {rolling === null && current !== null ? `Đã bốc: ${names[current]}` : ""}
        </p>

        <div className={styles.actions}>
          <Button variant="primary" onClick={draw} disabled={!canDraw}>
            Bốc thăm
          </Button>
          <Button variant="secondary" onClick={restart} disabled={taken.length === 0 && current === null}>
            Bốc lại từ đầu
          </Button>
        </div>

        {allTaken ? (
          <p className={styles.note}>
            Đã bốc hết cả lớp. Thầy cô bấm “Bốc lại từ đầu” hoặc bỏ chọn “Không bốc lại người đã bốc” để tiếp tục.
          </p>
        ) : null}

        <div className={styles.option}>
          <input
            id={noRepeatId}
            type="checkbox"
            checked={noRepeat}
            onChange={(event) => setNoRepeat(event.target.checked)}
          />
          <label htmlFor={noRepeatId}>Không bốc lại người đã bốc</label>
          {noRepeat && names.length > 0 ? (
            <span className={styles.remaining}>
              Còn {remaining} / {names.length} bạn
            </span>
          ) : null}
        </div>

        <div className={styles.names}>
          <NameListInput value={text} onChange={changeNames} />
        </div>

        {taken.length > 0 ? (
          <div className={styles.history}>
            <h2 className={styles.historyTitle}>Đã bốc</h2>
            <ol className={styles.historyList}>
              {taken.map((index, order) => (
                <li key={`${order}-${index}`}>{names[index]}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </ToolStage>
  );
}
