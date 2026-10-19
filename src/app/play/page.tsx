import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayEntry } from "@/components/live/player/play-entry";
import styles from "@/components/live/player/player.module.css";

export const metadata: Metadata = {
  title: "Vào phòng chơi",
  // Trang chơi theo phiên, không có gì để lập chỉ mục.
  robots: { index: false },
};

export default function PlayPage() {
  return (
    <div className="container">
      {/* `?pin=` chỉ đọc được ở trình duyệt nên phần trong Suspense dựng sau; bản dựng sẵn vẫn có tiêu đề h1. */}
      <Suspense
        fallback={
          <div className={styles.screen} aria-busy="true">
            <h1 className={styles.title}>Đang tải…</h1>
          </div>
        }
      >
        <PlayEntry />
      </Suspense>
    </div>
  );
}
