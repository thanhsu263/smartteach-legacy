import type { Metadata } from "next";
import { ClassesManager } from "@/components/classes-manager";
import { FavoritesSection } from "@/components/favorites-section";
import styles from "./my-classes.module.css";

export const metadata: Metadata = { title: "Lớp của tôi" };

export default function MyClassesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header>
        <h1 className={styles.title}>Lớp của tôi</h1>
        <p className={styles.lead}>
          Lưu danh sách lớp một lần để dùng lại cho bốc thăm và chia nhóm, và giữ các game yêu thích ở một chỗ.
        </p>
      </header>
      <ClassesManager />
      <FavoritesSection />
    </div>
  );
}
