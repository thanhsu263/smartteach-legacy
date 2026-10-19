import { ButtonLink } from "@/components/button";
import { ClassroomPreview } from "@/components/classroom-preview";
import { GameCard } from "@/components/game-card";
import { ToolCard } from "@/components/tool-card";
import { games } from "@/data/games";
import { tools } from "@/data/tools";
import styles from "./page.module.css";

const featuredGames = games.filter((game) => game.featured).slice(0, 3);

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
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="games-title">
        <h2 id="games-title" className={styles.sectionTitle}>
          Trò chơi nổi bật
        </h2>
        {featuredGames.length > 0 ? (
          <>
            <ul className={styles.gameGrid}>
              {featuredGames.map((game) => (
                <li key={game.id}>
                  <GameCard game={game} />
                </li>
              ))}
            </ul>
            <ButtonLink href="/games" variant="secondary" className={styles.allGames}>
              Xem toàn bộ kho game
            </ButtonLink>
          </>
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Trò chơi đầu tiên đang được chuẩn bị</p>
            <p className={styles.emptyText}>
              Khi kho game sẵn sàng, các trò chơi được chọn lọc sẽ hiện ở đây để thầy cô mở ngay.
            </p>
            <ButtonLink href="/games" variant="secondary">
              Đến kho game
            </ButtonLink>
          </div>
        )}
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
