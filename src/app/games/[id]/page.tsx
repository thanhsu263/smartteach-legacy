import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { FavoriteButton } from "@/components/favorite-button";
import { GameEmbed } from "@/components/game-embed";
import { PageHeading, WorkspacePage } from "@/components/workspace/workspace-layout";
import { getPublicGames } from "@/lib/site/settings";
import { findGame, gradeLabels, subjectLabels } from "@/lib/catalog";
import styles from "./game-page.module.css";

// Provide prerender samples for Cache Components; dynamicParams stays true so
// newly published IDs are resolved from the same runtime catalog without a deploy.
export async function generateStaticParams() {
  const games = await getPublicGames();
  return games.length ? games.map(game => ({id:game.id})) : [{id:"catalog-empty"}];
}

export async function generateMetadata({ params }: PageProps<"/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = findGame(await getPublicGames(), id);
  // Với Cache Components, trang có thể bắt đầu stream trước khi phần body gọi
  // `notFound()`. Chặn ngay lúc tạo metadata để response cho id không hợp lệ
  // vẫn mang HTTP 404, không chỉ hiển thị giao diện 404.
  if (!game) notFound();
  return { title: game.title, description: game.description };
}

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = findGame(await getPublicGames(), id);
  if (!game) notFound();

  const tags = [...subjectLabels(game), ...gradeLabels(game)];

  return (
    <WorkspacePage className={styles.page}>
      <Breadcrumb items={[{ label: "Kho game", href: "/games" }, { label: game.title }]} />

      <div className={styles.head}>
        <PageHeading title={game.title} description={game.description} actions={<FavoriteButton gameId={game.id} title={game.title} />} />
        <ul className={styles.tags} aria-label="Môn và lớp phù hợp">
          {tags.map((tag) => (
            <li key={tag} className="glass-pill">
              {tag}
            </li>
          ))}
        </ul>
      </div>

      <GameEmbed title={game.title} src={game.embedUrl} />

      {game.credits ? (
        <p className={styles.credits}>
          <strong>Ghi nguồn:</strong> {game.credits}
        </p>
      ) : null}
    </WorkspacePage>
  );
}
