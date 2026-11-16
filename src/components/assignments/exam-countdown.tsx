"use client";
import { useEffect, useRef, useState } from "react";
/** Anchor to server time with a monotonic clock; editing the system clock cannot extend a test. */
export function ExamCountdown({ deadline, serverNow, onExpire }: { deadline: string; serverNow: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const expireRef = useRef(onExpire);
  useEffect(() => { expireRef.current = onExpire; }, [onExpire]);
  useEffect(() => {
    const initial = Date.parse(deadline) - Date.parse(serverNow), started = performance.now();
    let fired = false;
    const tick = () => {
      const next = Math.max(0, Math.ceil((initial - (performance.now() - started)) / 1000)); setRemaining(next);
      if (next === 0 && !fired) { fired = true; expireRef.current(); }
    };
    const timer = setInterval(tick, 250); queueMicrotask(tick);
    return () => clearInterval(timer);
  }, [deadline, serverNow]);
  return <p aria-label="Thời gian còn lại">{remaining === null ? "Đang đồng bộ thời gian…" : remaining === 0 ? "Đã hết thời gian làm bài" : `Còn ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</p>;
}
