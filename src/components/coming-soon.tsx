import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import styles from "./coming-soon.module.css";

type ComingSoonProps = {
  title: string;
  children: ReactNode;
};

/** Trang tạm cho các mục sẽ có ở phase sau; liên kết từ header và footer luôn mở được. */
export function ComingSoon({ title, children }: ComingSoonProps) {
  return (
    <div className={`container ${styles.wrap}`}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>{children}</p>
      <ButtonLink href="/" variant="secondary">
        Về trang chủ
      </ButtonLink>
    </div>
  );
}
