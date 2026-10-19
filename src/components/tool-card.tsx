import Link from "next/link";
import { ToolIcon } from "@/components/tool-icon";
import type { Tool } from "@/data/tools";
import styles from "./tool-card.module.css";

type ToolCardProps = {
  tool: Tool;
  /** Cấp tiêu đề của thẻ, đặt ngay dưới tiêu đề của khu vực chứa nó để không nhảy cấp. */
  headingLevel: 2 | 3;
};

export function ToolCard({ tool, headingLevel }: ToolCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <article className={styles.card}>
      <span className={styles.icon}>
        <ToolIcon id={tool.id} />
      </span>
      <div>
        <Heading className={styles.title}>
          <Link href={tool.href} className={styles.link}>
            {tool.title}
          </Link>
        </Heading>
        <p className={styles.text}>{tool.description}</p>
      </div>
    </article>
  );
}
