import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Tiện ích lớp học" };

export default function ToolsPage() {
  return (
    <ComingSoon title="Tiện ích lớp học đang được chuẩn bị">
      Đồng hồ đếm ngược, bốc thăm tên, chia nhóm và bảng trắng sẽ có ở đây. Trang này đang được xây dựng.
    </ComingSoon>
  );
}
