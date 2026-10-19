export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type TimerState = {
  status: TimerStatus;
  /** Thời lượng đã chọn, tính bằng mili giây. */
  durationMs: number;
  remainingMs: number;
  /** Mốc thời gian kết thúc khi đang chạy; dùng mốc thay vì đếm tick để không trôi giờ. */
  endsAt: number | null;
};

export const MAX_MINUTES = 99;

export function createTimer(durationMs: number): TimerState {
  return { status: "idle", durationMs, remainingMs: durationMs, endsAt: null };
}

/** Đổi số phút và giây nhập tay thành mili giây; giá trị không hợp lệ cho kết quả 0. */
export function durationFrom(minutes: number, seconds: number): number {
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds)) return 0;
  if (minutes < 0 || seconds < 0 || seconds > 59 || minutes > MAX_MINUTES) return 0;
  return (minutes * 60 + seconds) * 1000;
}

export function startTimer(state: TimerState, now: number): TimerState {
  if (state.status === "running" || state.durationMs <= 0) return state;
  const remainingMs = state.status === "finished" ? state.durationMs : state.remainingMs;
  if (remainingMs <= 0) return state;
  return { ...state, status: "running", remainingMs, endsAt: now + remainingMs };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.status !== "running" || state.endsAt === null) return state;
  return {
    ...state,
    status: "paused",
    remainingMs: Math.max(0, state.endsAt - now),
    endsAt: null,
  };
}

export function tickTimer(state: TimerState, now: number): TimerState {
  if (state.status !== "running" || state.endsAt === null) return state;
  const remainingMs = state.endsAt - now;
  if (remainingMs <= 0) return { ...state, status: "finished", remainingMs: 0, endsAt: null };
  return { ...state, remainingMs };
}

export function resetTimer(state: TimerState): TimerState {
  return createTimer(state.durationMs);
}

/** Hiển thị MM:SS, làm tròn lên để số 00:01 giữ tới khi thật sự hết giờ. */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
