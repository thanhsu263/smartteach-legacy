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
      <header className={`${styles.hero} on-primary`}>
        <div>
          <p className={styles.eyebrow}>Dùng ngay giữa giờ</p>
          <h1 className={styles.title}>Tiện ích lớp học</h1>
          <p className={styles.heroMessage}>Tiện ích cho nhịp lớp trôi chảy</p>
          <p className={styles.lead}>
            Mở một công cụ trong vài giây, không cần đăng nhập; sẵn sàng để chiếu lên màn hình lớp.
          </p>
        </div>
        <p className={styles.heroNote}>4 công cụ miễn phí</p>
      </header>
      <section className={styles.catalogue} aria-labelledby="tools-heading">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionEyebrow}>Chọn việc cần làm</p>
            <h2 id="tools-heading" className={styles.sectionTitle}>
              Công cụ lớp học
            </h2>
          </div>
          <p className={styles.sectionNote}>Mở trực tiếp trong trình duyệt</p>
        </div>
        <ul className={styles.grid}>
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} headingLevel={3} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
