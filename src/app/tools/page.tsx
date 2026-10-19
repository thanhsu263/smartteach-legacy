import type { Metadata } from "next";
import { ToolCard } from "@/components/tool-card";
import { tools } from "@/data/tools";
import styles from "./tools.module.css";

export const metadata: Metadata = {
  title: "Tiện ích lớp học",
  description:
    "Đồng hồ đếm ngược, bốc thăm tên, chia nhóm và bảng trắng. Dùng ngay trên trình duyệt, không cần đăng nhập.",
};

export default function ToolsPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header>
        <h1 className={styles.title}>Tiện ích lớp học</h1>
        <p className={styles.lead}>
          Bốn công cụ dùng ngay giữa giờ, không cần đăng nhập. Mỗi công cụ có chế độ toàn màn hình để chiếu lên màn hình lớp.
        </p>
      </header>
      <ul className={styles.grid}>
        {tools.map((tool) => (
          <li key={tool.id}>
            <ToolCard tool={tool} headingLevel={2} />
          </li>
        ))}
      </ul>
    </div>
  );
}
