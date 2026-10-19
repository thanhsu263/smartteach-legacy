import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { findTool, type ToolId } from "@/data/tools";
import styles from "./tool-page.module.css";

/** Khung chung cho trang từng tiện ích: đường dẫn, tiêu đề, mô tả và phần công cụ. */
export function ToolPage({ id, children }: { id: ToolId; children: ReactNode }) {
  const tool = findTool(id);
  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumb items={[{ label: "Tiện ích", href: "/tools" }, { label: tool.title }]} />
      <header>
        <h1 className={styles.title}>{tool.title}</h1>
        <p className={styles.description}>{tool.description}</p>
      </header>
      {children}
    </div>
  );
}
