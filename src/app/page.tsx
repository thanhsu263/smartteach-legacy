import { ButtonLink } from "@/components/button";
import { ClassroomPreview } from "@/components/classroom-preview";
import { ClockIcon, PencilIcon, ShuffleIcon, UsersIcon } from "@/components/icons";
import styles from "./page.module.css";

const tools = [
  {
    title: "Đồng hồ đếm ngược",
    description: "Chữ lớn đọc được từ cuối lớp, có âm báo khi hết giờ.",
    Icon: ClockIcon,
  },
  {
    title: "Bốc thăm tên",
    description: "Gọi ngẫu nhiên một bạn, không bốc lại người đã gọi.",
    Icon: ShuffleIcon,
  },
  {
    title: "Chia nhóm",
    description: "Chia đều theo số nhóm hoặc số người mỗi nhóm.",
    Icon: UsersIcon,
  },
  {
    title: "Bảng trắng",
    description: "Viết và vẽ nhanh trên màn chiếu, xoá một chạm.",
    Icon: PencilIcon,
  },
];

export default function HomePage() {
  return (
    <>
      <section className={`${styles.hero} on-primary`} aria-labelledby="hero-title">
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <h1 id="hero-title" className={styles.heroTitle}>
              Thầy cô mở lên là có ngay giờ học sôi nổi
            </h1>
            <p className={styles.heroLead}>
              Trò chơi học tập, đồng hồ đếm ngược, bốc thăm tên và chia nhóm. Chạy ngay trên trình duyệt, miễn phí, không cần cài đặt.
            </p>
            <div className={styles.heroActions}>
              <ButtonLink href="/games" variant="primary">
                Khám phá kho game
              </ButtonLink>
              <ButtonLink href="/tools" variant="on-primary">
                Xem tiện ích lớp học
              </ButtonLink>
            </div>
          </div>
          <ClassroomPreview />
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="tools-title">
        <div className={styles.toolsIntro}>
          <h2 id="tools-title" className={styles.sectionTitle}>
            Bốn công cụ cho một tiết học
          </h2>
          <p className={styles.sectionLead}>
            Không đăng ký, không chờ tải. Thầy cô chiếu lên màn hình và dùng ngay giữa giờ.
          </p>
          <ButtonLink href="/tools" variant="secondary">
            Xem tất cả tiện ích
          </ButtonLink>
        </div>
        <ul className={styles.toolList}>
          {tools.map(({ title, description, Icon }) => (
            <li key={title} className={styles.tool}>
              <span className={styles.toolIcon}>
                <Icon size={24} />
              </span>
              <div>
                <h3 className={styles.toolTitle}>{title}</h3>
                <p className={styles.toolText}>{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="games-title">
        <h2 id="games-title" className={styles.sectionTitle}>
          Trò chơi nổi bật
        </h2>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Trò chơi đầu tiên đang được chuẩn bị</p>
          <p className={styles.emptyText}>
            Khi kho game sẵn sàng, các trò chơi được chọn lọc sẽ hiện ở đây để thầy cô mở ngay.
          </p>
          <ButtonLink href="/games" variant="secondary">
            Đến kho game
          </ButtonLink>
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="account-title">
        <div className={styles.account}>
          <div>
            <h2 id="account-title" className={styles.sectionTitle}>
              Lưu lớp một lần, dùng cho mọi tiện ích
            </h2>
            <p className={styles.sectionLead}>
              Thầy cô đăng nhập để lưu danh sách lớp và đánh dấu trò chơi yêu thích. Học sinh không cần tài khoản.
            </p>
          </div>
          <ButtonLink href="/login" variant="secondary">
            Đăng nhập
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
