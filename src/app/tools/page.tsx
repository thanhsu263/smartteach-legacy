import type { Metadata } from "next";
import { ToolsCatalogue } from "@/components/tools-catalogue";
import { PageHeading } from "@/components/workspace/workspace-layout";
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
      <PageHeading title="Tiện ích lớp học" description="Mở một công cụ trong vài giây, sẵn sàng để chiếu lên màn hình lớp." actions={<span className={styles.count}>{tools.length} công cụ</span>} />
      <ToolsCatalogue tools={tools} />
    </div>
  );
}
