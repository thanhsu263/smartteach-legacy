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
      <header className={styles.header}>
        <h1 className={styles.title}>Kho game</h1>
        <p className={styles.lead}>
          Chọn trò chơi theo môn và lớp, mở ngay trên trình duyệt, không cần cài đặt.
        </p>
      </header>
      <GameBrowser games={games} />
    </div>
  );
}
