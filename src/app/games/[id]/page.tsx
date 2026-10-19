import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameEmbed } from "@/components/game-embed";
import { games } from "@/data/games";
import { findGame, gradeLabels, subjectLabels } from "@/lib/catalog";
import styles from "./game-page.module.css";

/** Mọi id hợp lệ đều được dựng sẵn tĩnh; id khác gọi `notFound()` để trả mã 404. */
export function generateStaticParams() {
  return games.map((game) => ({ id: game.id }));
}

export async function generateMetadata({ params }: PageProps<"/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = findGame(games, id);
  if (!game) return {};
  return { title: game.title, description: game.description };
}

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = findGame(games, id);
  if (!game) notFound();

  const tags = [...subjectLabels(game), ...gradeLabels(game)];

  return (
    <div className={`container ${styles.page}`}>
      <nav aria-label="Đường dẫn" className={styles.breadcrumb}>
        <Link href="/games">Kho game</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{game.title}</span>
      </nav>

      <header>
        <h1 className={styles.title}>{game.title}</h1>
        <p className={styles.description}>{game.description}</p>
        <ul className={styles.tags} aria-label="Môn và lớp phù hợp">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </header>

      <GameEmbed title={game.title} src={game.embedUrl} />

      {game.credits ? (
        <p className={styles.credits}>
          <strong>Ghi nguồn:</strong> {game.credits}
        </p>
      ) : null}
    </div>
  );
}
