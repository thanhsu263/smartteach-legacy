import type { Metadata } from "next";
import Link from "next/link";
import { SessionHistory } from "@/components/live/results/session-history";

export const metadata: Metadata = { title: "Các buổi đã chơi" };

/**
 * Mọi buổi đã chơi của giáo viên, kể cả của quiz đã xoá. Nhờ đây thầy cô luôn xem được kết quả và xoá ngay dữ liệu
 * người chơi, không phải chờ hạn 90 ngày.
 */
export default function SessionsPage() {
  return (
    <div className="container" style={{ display: "grid", gap: "var(--space-5)", paddingBlock: "var(--space-6) 0" }}>
      <header className="page-head" data-surface="panel">
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1.25 }}>Các buổi đã chơi</h1>
        <p style={{ marginTop: "var(--space-2)", color: "var(--color-ink-muted)", maxWidth: "60ch" }}>
          Kết quả mọi buổi chơi trực tiếp của thầy cô. Dữ liệu người chơi tự xoá sau khoảng 90 ngày; thầy cô xoá ngay được từng buổi.
        </p>
      </header>
      <SessionHistory />
      <p>
        <Link href="/my-quizzes">Về Quiz của tôi</Link>
      </p>
    </div>
  );
}
