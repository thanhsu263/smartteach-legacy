import Link from "next/link";
import { ToolIcon } from "@/components/tool-icon";
import type { Tool } from "@/data/tools";
import styles from "./tool-card.module.css";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <article className={styles.card}>
      <span className={styles.icon}>
        <ToolIcon id={tool.id} />
      </span>
      <div>
        <h3 className={styles.title}>
          <Link href={tool.href} className={styles.link}>
            {tool.title}
          </Link>
        </h3>
        <p className={styles.text}>{tool.description}</p>
      </div>
    </article>
  );
}
