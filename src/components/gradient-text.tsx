import type { ReactNode } from "react";
import styles from "./gradient-text.module.css";

// React Bits GradientText, using the linear yoyo variant with SmartTeach's palette.
export function GradientText({ children, tone = "cobalt" }: { children: ReactNode; tone?: "cobalt" | "navy" }) {
  return <span className={styles.text} data-gradient-text={tone}>{children}</span>;
}
