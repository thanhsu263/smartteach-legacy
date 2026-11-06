import type { Metadata } from "next";
import { ToolsCatalogue } from "@/components/tools-catalogue";
import { tools } from "@/data/tools";
import styles from "./tools.module.css";

export const metadata: Metadata = {
  title: "Tiện ích lớp học",
  description:
    "Đồng hồ đếm ngược, bốc thăm tên, chia nhóm và bảng trắng. Dùng ngay trên trình duyệt, không cần đăng nhập.",
};

export default function ToolsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}><div><h1>Tiện ích lớp học</h1><p>Mở một công cụ trong vài giây, sẵn sàng để chiếu lên màn hình lớp.</p></div><span>4 công cụ</span></header>
      <ToolsCatalogue tools={tools} />
    </div>
  );
}
