import { ButtonLink } from "@/components/button";
import { GameCard } from "@/components/game-card";
import { GamepadIcon, PencilIcon, UsersIcon } from "@/components/icons";
import { LessonLaunchBoard } from "@/components/lesson-launch-board";
import { LessonStory } from "@/components/lesson-story";
import { ToolIcon } from "@/components/tool-icon";
import { games } from "@/data/games";
import { tools } from "@/data/tools";
import styles from "./page.module.css";

const featuredGames = games.filter((game) => game.featured).slice(0, 3);

const quickStarts = [
  {
    href: "/my-quizzes",
    title: "Tạo quiz",
    detail: "Soạn câu hỏi rồi mở phòng chiếu cho cả lớp.",
    Icon: PencilIcon,
  },
  {
    href: "/games",
    title: "Mở trò chơi",
    detail: "Chọn một hoạt động học tập để bắt đầu ngay.",
    Icon: GamepadIcon,
  },
  {
    href: "/my-classes",
    title: "Dùng lớp đã lưu",
    detail: "Chuẩn bị danh sách để bốc thăm và chia nhóm nhanh.",
    Icon: UsersIcon,
  },
] as const;

export default function HomePage() {
  return (
    <div className={`container ${styles.page}`}>
      <section className={`${styles.hero} on-primary`} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Bàn điều phối tiết học</p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Chuẩn bị, mở lớp và đọc tín hiệu trong một nhịp
            </h1>
            <p className={styles.heroLead}>
              SmartTeach tập hợp quiz, trò chơi và công cụ để thầy cô dẫn lớp rõ ràng, không cần học sinh có tài khoản.
            </p>
            <div className={styles.heroActions}>
              <ButtonLink href="/my-quizzes" variant="primary">
                Tạo hoặc mở quiz
              </ButtonLink>
              <ButtonLink href="/games" variant="on-primary">
                Khám phá kho game
              </ButtonLink>
            </div>
          </div>
          <LessonLaunchBoard />
        </div>
      </section>

      <LessonStory />

      <section className={styles.section} aria-labelledby="quick-start-title">
        <div className={styles.sectionHeading}>
          <h2 id="quick-start-title" className={styles.sectionTitle}>
            Bắt đầu nhanh hoạt động
          </h2>
          <p className={styles.sectionLead}>Chọn một việc thầy cô cần làm ngay trong tiết học hôm nay.</p>
        </div>
        <ul className={styles.quickGrid}>
          {quickStarts.map(({ href, title, detail, Icon }) => (
            <li key={href}>
              <article className={styles.quickCard} data-surface="panel">
                <span className={`${styles.quickIcon} glass-tile`}>
                  <Icon size={22} />
                </span>
                <div>
                  <h3 className={styles.quickTitle}>{title}</h3>
                  <p className={styles.quickDetail}>{detail}</p>
                </div>
                <ButtonLink href={href} variant="secondary" className={styles.quickAction}>
                  Bắt đầu
                </ButtonLink>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${styles.section} ${styles.toolsPanel}`} aria-labelledby="tools-title" data-surface="panel">
        <div className={styles.toolsHeader}>
          <div>
            <h2 id="tools-title" className={styles.sectionTitle}>
              Công cụ giáo viên nổi bật
            </h2>
            <p className={styles.sectionLead}>Các tiện ích quen thuộc, mở lên là dùng được khi đang đứng lớp.</p>
          </div>
          <ButtonLink href="/tools" variant="secondary">
            Xem tất cả
          </ButtonLink>
        </div>
        <ul className={styles.toolList}>
          {tools.map((tool) => (
            <li key={tool.id}>
              <article className={styles.toolRow}>
                <span className={`${styles.toolIcon} glass-tile`}>
                  <ToolIcon id={tool.id} />
                </span>
                <div className={styles.toolCopy}>
                  <h3 className={styles.toolTitle}>{tool.title}</h3>
                  <p className={styles.toolText}>{tool.description}</p>
                </div>
                <ButtonLink
                  href={tool.href}
                  variant="secondary"
                  className={styles.toolAction}
                >
                  <span className="visually-hidden">{tool.title}</span>
                  <span aria-hidden="true">Sử dụng ngay</span>
                </ButtonLink>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="continue-title">
        <div className={styles.sectionHeading}>
          <h2 id="continue-title" className={styles.sectionTitle}>
            Tiếp tục chuẩn bị cho tiết học
          </h2>
          <p className={styles.sectionLead}>Lưu lớp và quiz một lần để lần sau mở nhanh hơn.</p>
        </div>
        <div className={styles.continueGrid}>
          <section className={styles.account} data-surface="panel" data-tone="accent" aria-labelledby="account-title">
            <div>
              <h3 id="account-title" className={styles.accountTitle}>Lớp học của tôi</h3>
              <p className={styles.sectionLead}>Lưu danh sách để bốc thăm, chia nhóm và dùng lại giữa các buổi học.</p>
            </div>
            <ButtonLink href="/my-classes" variant="secondary">Quản lý lớp</ButtonLink>
          </section>
          {featuredGames.length > 0 ? (
            <GameCard game={featuredGames[0]} headingLevel={3} />
          ) : (
            <div className={styles.empty} data-surface="panel">
              <p className={styles.emptyTitle}>Trò chơi đầu tiên đang được chuẩn bị</p>
              <p className={styles.emptyText}>Khi kho game sẵn sàng, hoạt động được chọn lọc sẽ hiện ở đây.</p>
              <ButtonLink href="/games" variant="secondary">Đến kho game</ButtonLink>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
