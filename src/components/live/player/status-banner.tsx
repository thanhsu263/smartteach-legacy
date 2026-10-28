import styles from "./player.module.css";

/** Báo mất kết nối khi các lần hỏi liên tiếp thất bại; tự biến mất khi phục hồi. */
export function StatusBanner({ offline }: { offline: boolean }) {
  if (!offline) return null;
  return (
    <p role="status" className={`${styles.banner} animate-fade-up`}>
      Mất kết nối. Đang thử lại…
    </p>
  );
}
