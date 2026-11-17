import type { Metadata } from "next";
import Link from "next/link";
import { SessionHub } from "@/components/live/host/session-hub";
import { SessionHistory } from "@/components/live/results/session-history";
import { PageHeading, WorkspacePage } from "@/components/workspace/workspace-layout";
import styles from "./host.module.css";

export const metadata: Metadata = { title: "Các buổi đã chơi" };

/**
 * Mọi buổi đã chơi của giáo viên, kể cả của quiz đã xoá. Nhờ đây thầy cô luôn xem được kết quả và xoá ngay dữ liệu
 * người chơi, không phải chờ hạn 90 ngày. Nằm trong teacher shell (Q3); `/host/[id]` và kết quả giữ full-canvas.
 */
export default function SessionsPage() {
  return (
    <WorkspacePage>
      <PageHeading
        title="Các buổi đã chơi"
        description="Kết quả mọi buổi chơi trực tiếp của thầy cô. Dữ liệu người chơi tự xoá sau khoảng 90 ngày; thầy cô xoá ngay được từng buổi."
      />
      <SessionHub />
      <SessionHistory />
      <p className={styles.back}>
        <Link href="/my-quizzes">Về Quiz của tôi</Link>
      </p>
    </WorkspacePage>
  );
}
