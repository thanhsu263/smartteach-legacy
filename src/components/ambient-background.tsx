import styles from "./ambient-background.module.css";

/** Lớp màu nền tĩnh, không tranh sự chú ý với nội dung hoặc chuyển động hệ thống. */
export function AmbientBackground() {
  return <div className={styles.ambient} aria-hidden="true" />;
}
