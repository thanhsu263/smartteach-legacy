import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <div className={`container ${styles.wrap}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Không tìm thấy trang</h1>
      <p className={styles.text}>
        Đường dẫn này không còn hoặc chưa từng có. Thầy cô thử quay về trang chủ hoặc vào kho game nhé.
      </p>
      <div className={styles.actions}>
        <ButtonLink href="/" variant="secondary">
          Về trang chủ
        </ButtonLink>
        <ButtonLink href="/games" variant="secondary">
          Đến kho game
        </ButtonLink>
      </div>
    </div>
  );
}
