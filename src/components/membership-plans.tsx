import Link from "next/link";
import { CheckIcon } from "./icons";
import { LandingButtonEffects } from "./landing-button-effects";
import ScrollFloat from "./scroll-float";
import { formatMembershipPrice, premiumPlans } from "@/lib/membership/plans";
import styles from "@/app/page.module.css";

export function MembershipPlans() {
  return <section id="goi-thanh-vien" className={`${styles.section} ${styles.paths}`}>
    <div className={styles.sectionIntro}>
      <p className={styles.label}>GÓI THÀNH VIÊN</p>
      <h2><ScrollFloat>Bắt đầu miễn phí. Thêm lựa chọn với Premium.</ScrollFloat></h2>
      <p data-animated-content>Quiz, trò chơi cơ bản và soạn đề luôn miễn phí. Premium mở kiểm tra online và AI nhập đề bố cục tự do.</p>
    </div>
    <div className={`${styles.pathGrid} ${styles.membershipGrid}`}>
      <article data-animated-content>
        <h3><ScrollFloat>Free</ScrollFloat></h3><strong>0đ</strong>
        <p>Tạo quiz, cùng lớp học và chơi mỗi ngày.</p>
        <Link className={styles.secondary} href="/login?mode=sign-up"><LandingButtonEffects tone="glass">Bắt đầu miễn phí</LandingButtonEffects></Link>
          <ul><li><CheckIcon size={16} />Tạo và quản lý quiz</li><li><CheckIcon size={16} />Các trò chơi cơ bản</li><li><CheckIcon size={16} />Soạn, nhập theo mẫu và xuất đề Word/PDF</li></ul>
      </article>
      {Object.values(premiumPlans).map(plan => <article data-animated-content key={plan.id} data-featured={plan.months === 1 || undefined}>
        {plan.months === 12 && <span>TIẾT KIỆM 100.000đ</span>}
        <h3><ScrollFloat>{plan.title}</ScrollFloat></h3>
        <strong className={styles.planPrice}>{formatMembershipPrice(plan.amount)} <small>/{plan.period}</small></strong>
        <p>{plan.months === 12 ? "Đầy đủ Premium trong 1 năm, tiết kiệm hơn mua từng tháng." : "Mở thêm không gian soạn và giao đề cho lớp."}</p>
        <Link className={plan.months === 1 ? styles.primary : styles.secondary} href={`/membership?plan=${plan.id}`}><LandingButtonEffects tone={plan.months === 1 ? "blue" : "glass"}>Chọn {plan.title}</LandingButtonEffects></Link>
          <ul><li><CheckIcon size={16} />Tất cả quyền lợi Free</li><li><CheckIcon size={16} />Kiểm tra online và AI nhập đề tự do</li><li><CheckIcon size={16} />Theo dõi tiến độ, xem kết quả bài giao</li></ul>
      </article>)}
    </div>
    <p className={styles.planNote}>Hai gói Premium có cùng tính năng. payOS đang tạm hoãn kích hoạt; không tự động gia hạn.</p>
  </section>;
}
