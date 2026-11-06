import type { Metadata } from "next";
import { ClassesManager } from "@/components/classes-manager";
import { FavoritesSection } from "@/components/favorites-section";
import styles from "./my-classes.module.css";

export const metadata: Metadata = { title: "Lớp của tôi" };

export default function MyClassesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><h1>Lớp học của tôi</h1><p>Mở lớp để tổ chức hoạt động và dùng lại danh sách học sinh trong các tiện ích.</p></div>
      </header>
      <ClassesManager />
      <FavoritesSection />
    </div>
  );
}
