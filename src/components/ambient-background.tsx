import styles from "./ambient-background.module.css";

/** Nền động trang trí; phản ứng theo chuột do liquid-glass.ts ghi --mx, --my, --spot-o. */
export function AmbientBackground() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <span className={`${styles.blob} ${styles.a}`} />
      <span className={`${styles.blob} ${styles.b}`} />
      <span className={`${styles.blob} ${styles.c}`} />
      <span className={styles.dots} />
      <span className={styles.spot} />
      <span className={styles.grain} />
    </div>
  );
}
