import type { ConnectionStatus } from "@/lib/live/types";
import styles from "./connection-status.module.css";

const COPY: Record<ConnectionStatus, string> = {
  live: "Đang cập nhật trực tiếp",
  polling: "Đang cập nhật định kỳ",
  offline: "Mất kết nối. Đang thử lại…",
};

/** Nhãn kết nối dùng chung cho màn hình chiếu và điện thoại học sinh. */
export function ConnectionStatus({ status }: { status: ConnectionStatus }) {
  return (
    <p className={styles.status} data-status={status} role="status" aria-live="polite">
      {COPY[status]}
    </p>
  );
}
