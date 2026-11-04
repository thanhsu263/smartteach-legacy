import type { Metadata } from "next";
import { GameBrowser } from "@/components/game-browser";
import { games } from "@/data/games";
import styles from "./games.module.css";

export const metadata: Metadata = {
  title: "Kho game",
  description: "Trò chơi học tập cho giờ học, lọc theo môn và lớp. Mở ngay trên trình duyệt.",
};

export default function GamesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={`${styles.hero} on-primary`}>
        <div>
          <p className={styles.eyebrow}>Hoạt động cho tiết học</p>
          <h1 className={styles.title}>Kho game</h1>
          <p className={styles.heroMessage}>Chọn một trò chơi, mở lớp ngay</p>
          <p className={styles.lead}>
            Lọc theo môn hoặc khối lớp, rồi chạy hoạt động trực tiếp trên trình duyệt.
          </p>
        </div>
        <p className={styles.heroNote}>Không cần cài đặt</p>
      </header>
      <GameBrowser games={games} />
    </div>
  );
}
