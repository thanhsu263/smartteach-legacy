import styles from "./player.module.css";

/** Đếm giờ: số giây bằng chữ và thanh chạy tuyến tính. Chỉ để hiển thị; hạn chót thật do máy chủ quyết định. */
export function Countdown({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const seconds = Math.ceil(remainingMs / 1000);
  const percent = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  return (
    <div className={styles.timer} role="timer" aria-label="Thời gian còn lại">
      <p className={styles.seconds}>{seconds > 0 ? `Còn ${seconds} giây` : "Hết giờ"}</p>
      <div className={styles.track} aria-hidden="true">
        <div className={styles.bar} style={{ width: `${percent}%` }} data-low={seconds <= 5} />
      </div>
    </div>
  );
}
