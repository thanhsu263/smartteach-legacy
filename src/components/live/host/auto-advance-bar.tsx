"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { parseServerTime, type ServerClock } from "@/lib/live/clock";
import type { HostState } from "@/lib/live/types";
import { useNow } from "@/lib/live/use-now";
import styles from "./host.module.css";

type AutoAdvanceBarProps = {
  state: HostState;
  clock: ServerClock;
  busy: boolean;
  onTogglePause: () => void;
  /** Tới giờ: nhờ máy chủ mở câu kế. Trả true khi đã chuyển; false thì thử lại sau ít lâu. */
  onDue: () => Promise<boolean>;
};

/**
 * Dải điều khiển "tự động qua câu" của giáo viên: ở pha hiện đáp án đếm ngược tới lúc máy chủ mở câu kế, ở mọi pha
 * có nút Tạm dừng/Tiếp tục. Giờ chốt do MÁY CHỦ quyết; ở đây chỉ nhắc máy chủ khi đồng hồ ước lượng đã qua hạn (và
 * thử lại mỗi giây nếu máy chủ chưa coi là tới hạn), giống cách `QuestionView` xử lý hết giờ câu.
 */
export function AutoAdvanceBar({ state, clock, busy, onTogglePause, onDue }: AutoAdvanceBarProps) {
  const reveal = state.status === "reveal";
  const counting = reveal && !state.paused && state.reveal_ends_at !== null;
  const now = useNow(250, counting);
  const dueRef = useRef(onDue);

  const endsAt = parseServerTime(state.reveal_ends_at);
  const remaining = counting && Number.isFinite(endsAt) ? endsAt - (now + clock.offsetMs()) : Number.POSITIVE_INFINITY;
  // Chờ thêm 300ms sau hạn để chắc chắn máy chủ cũng đã qua hạn rồi mới nhắc.
  const late = counting && remaining <= -300;

  useEffect(() => {
    dueRef.current = onDue;
  });
  // `state.reveal_ends_at` đổi (Tiếp tục cho thêm 3 giây) thì chạy lại vòng nhắc.
  useEffect(() => {
    if (!late) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = async () => {
      const done = await dueRef.current();
      if (!cancelled && !done) timer = setTimeout(attempt, 1000);
    };
    void attempt();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [late, state.question_index, state.reveal_ends_at]);

  const isLast = state.question_index >= state.question_total;
  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  return (
    <div className={styles.autoBar} role="group" aria-label="Tự động qua câu">
      {/* Câu chữ cố định (không đổi theo từng giây) để trình đọc màn hình không đọc lại mỗi giây. */}
      <p className="visually-hidden" role="status">
        {state.paused
          ? "Tự động qua câu đang tạm dừng."
          : counting
            ? isLast
              ? "Sắp tự hiện kết quả cuối."
              : "Câu tiếp theo sẽ tự bắt đầu."
            : "Tự động qua câu đang bật."}
      </p>
      <p className={styles.autoText} aria-hidden="true">
        {state.paused
          ? "Tự động đang tạm dừng"
          : counting
            ? Number.isFinite(remaining)
              ? `${isLast ? "Hiện kết quả cuối" : "Sang câu kế"} sau ${seconds} giây`
              : "Tự động sang câu kế"
            : "Tự động qua câu đang bật"}
      </p>
      <Button variant="secondary" onClick={onTogglePause} disabled={busy}>
        {state.paused ? "Tiếp tục tự động" : "Tạm dừng tự động"}
      </Button>
    </div>
  );
}
