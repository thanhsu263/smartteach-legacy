"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { listAssignments } from "@/lib/assignments/api";
import type { AssignmentStatus, AssignmentSummary } from "@/lib/assignments/types";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./assignments.module.css";

type Filter = "all" | AssignmentStatus;
const PAGE_SIZE = 20;
const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Bản nháp" },
  { value: "published", label: "Đang giao" },
  { value: "closed", label: "Đã đóng" },
];

function statusLabel(status: AssignmentStatus) {
  return status === "draft" ? "Bản nháp" : status === "published" ? "Đang giao" : "Đã đóng";
}

function scheduleLabel(item: AssignmentSummary) {
  if (item.status === "closed") return "Đã đóng";
  if (item.dueAt) {
    const due = new Date(item.dueAt);
    return Number.isNaN(due.valueOf()) ? "Có hạn nộp" : `Hạn nộp ${due.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}`;
  }
  return item.opensAt ? "Mở theo lịch" : "Không đặt hạn";
}

export function AssignmentsManager() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<AssignmentSummary[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    void listAssignments(supabase, { status: filter === "all" ? undefined : filter, limit: PAGE_SIZE + 1, offset }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setItems([]);
        setMessage(result.message);
        return;
      }
      setHasMore(result.assignments.length > PAGE_SIZE);
      setItems((current) => offset === 0 ? result.assignments.slice(0, PAGE_SIZE) : [...(current ?? []), ...result.assignments.slice(0, PAGE_SIZE)]);
    });
    return () => { cancelled = true; };
  }, [filter, offset, reloadKey, user?.id]);

  function chooseFilter(next: Filter) {
    setFilter(next);
    setOffset(0);
    setItems(null);
    setMessage(null);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Bài đã giao</h1>
          <p>Tạo bài từ quiz đã soạn, theo dõi lớp làm bài và xem kết quả khi cần.</p>
        </div>
        <ButtonLink href="/assignments/new" variant="primary">Tạo bài giao</ButtonLink>
      </header>

      <div className="segmented" style={{ "--n": FILTERS.length } as React.CSSProperties} role="group" aria-label="Lọc bài đã giao">
        {FILTERS.map((option) => (
          <label key={option.value}>
            <input type="radio" name="assignment-status" checked={filter === option.value} onChange={() => chooseFilter(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {items === null ? (
        <div className={styles.skeleton} aria-busy="true"><p className="visually-hidden" role="status">Đang tải bài đã giao…</p><span className="glass-skeleton" /><span className="glass-skeleton" /></div>
      ) : message ? (
        <section className={styles.empty} data-surface="panel"><p role="alert">{message}</p><Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button></section>
      ) : items.length === 0 ? (
        <section className={styles.empty} data-surface="panel">
          <h2>{filter === "all" ? "Chưa có bài nào" : `Chưa có bài ${FILTERS.find((item) => item.value === filter)?.label.toLocaleLowerCase("vi-VN") ?? "này"}`}</h2>
          <p>Chọn một quiz và một lớp để tạo bài giao đầu tiên cho học sinh.</p>
          <ButtonLink href="/assignments/new" variant="primary">Tạo bài giao</ButtonLink>
        </section>
      ) : (
        <>
          <ul className={styles.assignmentList} aria-label="Danh sách bài đã giao">
            {items.map((item) => (
              <li key={item.id} data-surface="panel" className={styles.assignmentItem}>
                <Link href={`/assignments/${item.id}`} className={styles.assignmentLink} data-glass="row">
                  <span className={styles.assignmentTitle}>{item.title}</span>
                  <span className={styles.assignmentMeta}>{item.className} · {scheduleLabel(item)}</span>
                </Link>
                <span className={styles.status} data-status={item.status}>{statusLabel(item.status)}</span>
              </li>
            ))}
          </ul>
          {hasMore ? <Button variant="secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)}>Tải thêm</Button> : null}
        </>
      )}
    </div>
  );
}
