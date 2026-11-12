"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { GRADES, SUBJECTS, type GradeId, type SubjectId } from "@/lib/catalog";
import { browseLibrary } from "@/lib/library/api";
import type { PublicationSummary } from "@/lib/library/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./library.module.css";

const PAGE_SIZE = 24;

export function LibraryBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.get("q") ?? "";
  const subject = (params.get("subject") ?? "") as SubjectId | "";
  const grade = (params.get("grade") ?? "") as GradeId | "";
  const filterKey = `${query}\u0000${subject}\u0000${grade}`;
  const [items, setItems] = useState<PublicationSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [offsetKey, setOffsetKey] = useState(filterKey);
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageOffset = offsetKey === filterKey ? offset : 0;
  const loadingFirstPage = loadedFilterKey !== filterKey;
  const loadingMore = !loadingFirstPage && pageOffset > loadedOffset;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let stopped = false;
    const append = pageOffset > 0;
    void browseLibrary(supabase, {
      query,
      subject: subject || undefined,
      grade: grade || undefined,
      limit: PAGE_SIZE,
      offset: pageOffset,
    }).then((result) => {
      if (stopped) return;
      setLoadedFilterKey(filterKey);
      setLoadedOffset(pageOffset);
      if (!result.ok) {
        setError(result.message);
        if (!append) setItems([]);
        return;
      }
      setError(null);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setItems((current) => (append ? [...(current ?? []), ...result.items] : result.items));
    });
    return () => {
      stopped = true;
    };
  }, [filterKey, grade, pageOffset, query, subject]);

  function setFilters(next: { q?: string; subject?: string; grade?: string }) {
    const value = new URLSearchParams(params.toString());
    for (const [key, item] of Object.entries(next)) {
      if (item) value.set(key, item);
      else value.delete(key);
    }
    setOffsetKey(filterKey);
    setOffset(0);
    router.replace(`${pathname}${value.size ? `?${value}` : ""}`);
  }

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <p>Kho học liệu</p>
          <h1>Chọn một quiz đã được duyệt</h1>
          <span>Nội dung được kiểm duyệt trước khi xuất hiện công khai.</span>
        </div>
      </header>
      <form
        key={filterKey}
        className={styles.filters}
        data-surface="panel"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ q: new FormData(event.currentTarget).get("q")?.toString().trim() });
        }}
      >
        <label>
          Tìm học liệu
          <input name="q" type="search" defaultValue={query} placeholder="Tên hoặc chủ đề" />
        </label>
        <label>
          Môn
          <select value={subject} onChange={(event) => setFilters({ subject: event.target.value })}>
            <option value="">Tất cả môn</option>
            {SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Lớp
          <select value={grade} onChange={(event) => setFilters({ grade: event.target.value })}>
            <option value="">Tất cả lớp</option>
            {GRADES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <Button type="submit" variant="primary">Tìm</Button>
        {query || subject || grade ? <Button type="button" variant="secondary" onClick={() => setFilters({ q: "", subject: "", grade: "" })}>Xoá bộ lọc</Button> : null}
      </form>
      {loadingFirstPage || items === null ? <p role="status">Đang tải học liệu…</p> : error ? <p role="alert">{error}</p> : items.length === 0 ? (
        <section className={styles.empty} data-surface="panel">
          <h2>Chưa có học liệu phù hợp</h2>
          <p>Thử đổi từ khoá hoặc bỏ bớt điều kiện lọc.</p>
        </section>
      ) : (
        <>
          <p role="status">Hiển thị {items.length} trong {total} học liệu</p>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/library/${item.id}`}>
                  <span>{SUBJECTS.find((entry) => entry.id === item.subject)?.label} · {item.grades.map((value) => `Lớp ${value}`).join(", ")}</span>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <small>{item.questionCount} câu hỏi</small>
                </Link>
              </li>
            ))}
          </ul>
          {hasMore ? <Button variant="secondary" disabled={loadingMore} onClick={() => setOffset((value) => value + PAGE_SIZE)}>{loadingMore ? "Đang tải…" : "Tải thêm"}</Button> : null}
        </>
      )}
    </main>
  );
}
