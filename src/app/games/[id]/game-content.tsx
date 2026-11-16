import Link from "next/link";
import { notFound } from "next/navigation";
import { GameEmbed } from "@/components/game-embed";
import {getPublicGames} from "@/lib/site/settings";
import { findGame, gradeLabels, subjectLabels } from "@/lib/catalog";
import styles from "./game-page.module.css";

/** Phần phụ thuộc vào id trên URL, nằm trong ranh giới Suspense của trang. */
export async function GameContent({ params }: Pick<PageProps<"/games/[id]">, "params">) {
  const { id } = await params;
  const game = findGame(await getPublicGames(), id);
  if (!game) notFound();

  const tags = [...subjectLabels(game), ...gradeLabels(game)];

  return (
    <>
      <nav aria-label="Đường dẫn" className={styles.breadcrumb}>
        <Link href="/games">Kho game</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{game.title}</span>
      </nav>

      <header className="page-head" data-surface="panel">
        <h1 className={styles.title}>{game.title}</h1>
        <p className={styles.description}>{game.description}</p>
        <ul className={styles.tags} aria-label="Môn và lớp phù hợp">
          {tags.map((tag) => (
            <li key={tag} className="glass-pill">
              {tag}
            </li>
          ))}
        </ul>
      </header>

      <GameEmbed title={game.title} src={game.embedUrl} />

      {game.credits ? (
        <p className={styles.credits}>
          <strong>Ghi nguồn:</strong> {game.credits}
        </p>
      ) : null}
    </>
  );
}
