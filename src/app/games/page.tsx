import type { Metadata } from "next";
import { GameBrowser } from "@/components/game-browser";
import { PageHeading, WorkspacePage } from "@/components/workspace/workspace-layout";
import { getPublicGames } from "@/lib/site/settings";

export const metadata: Metadata = {
  title: "Kho game",
  description: "Trò chơi học tập cho giờ học, lọc theo môn và lớp. Mở ngay trên trình duyệt.",
};

export default async function GamesPage() {
  const games = await getPublicGames();
  return (
    <WorkspacePage>
      <PageHeading
        title="Kho game"
        description="Chọn một trò chơi cho tiết học: lọc theo môn hoặc khối lớp, rồi chạy trực tiếp trên trình duyệt, không cần cài đặt."
      />
      <GameBrowser games={games} />
    </WorkspacePage>
  );
}
