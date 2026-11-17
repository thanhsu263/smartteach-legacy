import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";
import styles from "./auth-split.module.css";

/** Tiêu đề form xác thực; form tự đổi tiêu đề theo chế độ (đăng nhập / tạo tài khoản) thì dùng trực tiếp. */
export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return <header className={styles.intro}><h1>{title}</h1>{description ? <p>{description}</p> : null}</header>;
}

/**
 * Bố cục xác thực theo Figma (34:4649): cột giới thiệu bên trái từ 720px, form bên phải.
 * Bỏ `title` khi `children` tự hiển thị `AuthHeading`.
 */
export function AuthSplit({ title, description, children }: { title?: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <section className={`${styles.showcase} on-primary`} aria-label="Giới thiệu SmartTeach">
        <div className={styles.showcaseBrand}><LogoMark size={48} /><span>SmartTeach</span></div>
        <div className={styles.showcaseCopy}>
          <p>Không gian dành cho giáo viên</p>
          <p className={styles.showcaseTitle}>Chuẩn bị bài dạy, kết nối lớp học và bắt đầu thật nhẹ nhàng.</p>
          <span>Quiz, trò chơi và tiện ích lớp học cùng ở một nơi.</span>
        </div>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.previewBar}><span>Quiz trực tiếp</span><b>04 / 10</b></div>
          <strong>Trái Đất quay quanh Mặt Trời mất bao lâu?</strong>
          <div className={styles.answers}><span>A. 24 giờ</span><span data-selected="true">B. 365 ngày</span><span>C. 30 ngày</span><span>D. 12 giờ</span></div>
        </div>
      </section>
      <section className={styles.authPanel}>
        <div className={styles.mobileBrand}><LogoMark size={40} /><span>SmartTeach</span></div>
        {title ? <AuthHeading title={title} description={description} /> : null}
        {children}
      </section>
    </div>
  );
}
