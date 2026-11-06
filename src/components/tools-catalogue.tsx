"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/button";
import { ToolCard } from "@/components/tool-card";
import type { Tool } from "@/data/tools";
import { normalizeText } from "@/lib/catalog";
import styles from "./tools-catalogue.module.css";

export function ToolsCatalogue({ tools }: { tools: readonly Tool[] }) {
  const [query, setQuery] = useState("");
  const visibleTools = useMemo(() => {
    const term = normalizeText(query);
    if (!term) return tools;
    return tools.filter((tool) => normalizeText(`${tool.title} ${tool.description}`).includes(term));
  }, [query, tools]);

  return (
    <section className={styles.catalogue} aria-labelledby="tools-heading">
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.sectionEyebrow}>Chọn việc cần làm</p>
          <h2 id="tools-heading" className={styles.sectionTitle}>Công cụ lớp học</h2>
        </div>
        <p className={styles.sectionNote}>Mở trực tiếp trong trình duyệt</p>
      </div>

      <div className={styles.search}>
        <label htmlFor="tool-search">Tìm tiện ích</label>
        <input
          id="tool-search"
          type="search"
          value={query}
          placeholder="Ví dụ: đồng hồ, bốc thăm"
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? <Button variant="secondary" onClick={() => setQuery("")}>Xoá tìm kiếm</Button> : null}
      </div>

      <p className={styles.count} role="status">{visibleTools.length === tools.length ? `Có ${tools.length} công cụ` : `Có ${visibleTools.length} công cụ khớp`}</p>
      {visibleTools.length > 0 ? (
        <ul className={styles.grid}>
          {visibleTools.map((tool) => <li key={tool.id}><ToolCard tool={tool} headingLevel={3} /></li>)}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>Không tìm thấy tiện ích phù hợp.</p>
          <Button variant="secondary" onClick={() => setQuery("")}>Xem tất cả tiện ích</Button>
        </div>
      )}
    </section>
  );
}
