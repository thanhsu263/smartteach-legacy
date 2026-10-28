import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { GamepadIcon } from "@/components/icons";
import { gradeLabels, subjectLabels, type Game } from "@/lib/catalog";
import styles from "./game-card.module.css";

type GameCardProps = {
  game: Game;
  /** Cấp tiêu đề của thẻ, đặt ngay dưới tiêu đề của khu vực chứa nó để không nhảy cấp. */
  headingLevel: 2 | 3;
};

export function GameCard({ game, headingLevel }: GameCardProps) {
  const tags = [...subjectLabels(game), ...gradeLabels(game)];
  const Heading = `h${headingLevel}` as const;
  return (
    <article className={styles.card} data-glass="card" data-tilt>
      <div className={styles.top}>
        <span className={`${styles.icon} glass-tile`}>
          <GamepadIcon size={28} />
        </span>
        <FavoriteButton gameId={game.id} title={game.title} />
      </div>
      <Heading className={styles.title}>
        <Link href={`/games/${game.id}`} className={styles.link}>
          {game.title}
        </Link>
      </Heading>
      <p className={styles.description}>{game.description}</p>
      <ul className={styles.tags} aria-label="Môn và lớp phù hợp">
        {tags.map((tag) => (
          <li key={tag} className="glass-pill">
            {tag}
          </li>
        ))}
      </ul>
    </article>
  );
}
