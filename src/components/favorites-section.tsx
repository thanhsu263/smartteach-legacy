"use client";

import { useFavorites } from "@/components/favorites-provider";
import { GameCard } from "@/components/game-card";
import { games } from "@/data/games";
import styles from "./favorites-section.module.css";

/** Danh sách game yêu thích trong "Lớp của tôi". */
export function FavoritesSection() {
  const favorites = useFavorites();
  const favoriteGames = games.filter((game) => favorites.ids.has(game.id));

  return (
    <section aria-labelledby="favorites-title" className={styles.section}>
      <h2 id="favorites-title" className={styles.heading}>
        Game yêu thích
      </h2>
      {favorites.status === "loading" ? (
        <div className={styles.skeleton} aria-busy="true">
          <p className="visually-hidden" role="status">
            Đang tải game yêu thích…
          </p>
          <span />
        </div>
      ) : favorites.status === "error" ? (
        <p role="alert" className={styles.error}>
          Không tải được danh sách yêu thích. Thầy cô tải lại trang để thử lại nhé.
        </p>
      ) : favoriteGames.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Thầy cô chưa đánh dấu game nào</p>
          <p className={styles.hint}>Vào Kho game và bấm biểu tượng trái tim ở góc thẻ để lưu game vào đây.</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {favoriteGames.map((game) => (
            <li key={game.id}>
              <GameCard game={game} headingLevel={3} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
