import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Kho game" };

export default function GamesPage() {
  return (
    <ComingSoon title="Kho game đang được chuẩn bị">
      Thầy cô sẽ chọn trò chơi theo môn và lớp ở đây. Trang này đang được xây dựng.
    </ComingSoon>
  );
}
