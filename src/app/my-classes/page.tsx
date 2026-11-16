import type { Metadata } from "next";
import { ClassesManager } from "@/components/classes-manager";
import { FavoritesSection } from "@/components/favorites-section";
import styles from "./my-classes.module.css";
import {getPublicGames} from "@/lib/site/settings";

export const metadata: Metadata = { title: "Lớp của tôi" };

export default async function MyClassesPage() {
  const games=await getPublicGames();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><h1>Lớp học của tôi</h1><p>Mở lớp để tổ chức hoạt động và dùng lại danh sách học sinh trong các tiện ích.</p></div>
      </header>
      <ClassesManager />
      <FavoritesSection games={games} />
    </div>
  );
}
