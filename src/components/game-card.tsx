import Link from "next/link";
import { GamepadIcon } from "@/components/icons";
import { gradeLabels, subjectLabels, type Game } from "@/lib/catalog";
import styles from "./game-card.module.css";

export function GameCard({ game }: { game: Game }) {
  const tags = [...subjectLabels(game), ...gradeLabels(game)];
  return (
    <article className={styles.card}>
      <span className={styles.icon}>
        <GamepadIcon size={28} />
      </span>
      <h2 className={styles.title}>
        <Link href={`/games/${game.id}`} className={styles.link}>
          {game.title}
        </Link>
      </h2>
      <p className={styles.description}>{game.description}</p>
      <ul className={styles.tags} aria-label="Môn và lớp phù hợp">
        {tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </article>
  );
}
