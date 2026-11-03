"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Button, IconButton } from "@/components/button";
import { TrashIcon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { useFocusRequest } from "@/components/use-focus-request";
import { host } from "@/lib/live/rpc";
import { formatDateTime, type HistoryRow } from "@/lib/live/results";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./results.module.css";

const PAGE_SIZE = 20;

type Page = { key: string; rows: HistoryRow[]; more: boolean; error: string | null };

/**
 * Các buổi đã chơi: của một quiz (trong trình soạn) hoặc của mọi quiz (trang riêng, gồm cả quiz đã xoá nên vẫn xoá được
 * dữ liệu người chơi). Xem kết quả hoặc xoá có xác nhận; "Xem thêm" tải trang kế.
 */
export function SessionHistory({ quizId }: { quizId?: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${quizId ?? "all"}`;
  const [page, setPage] = useState<Page | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestFocus = useFocusRequest();
  const baseId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    host.history(supabase, { quizId, limit: PAGE_SIZE, offset: 0 }).then((result) => {
      if (cancelled) return;
      setPage(
        result.ok
          ? { key: `${userId}:${quizId ?? "all"}`, rows: result.rows, more: result.rows.length === PAGE_SIZE, error: null }
          : { key: `${userId}:${quizId ?? "all"}`, rows: [], more: false, error: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId, quizId, reloadKey]);

  const current = page && page.key === key ? page : null;

  async function loadMore() {
    const supabase = getBrowserSupabase();
    if (!supabase || !current || loadingMore) return;
    setLoadingMore(true);
    const result = await host.history(supabase, { quizId, limit: PAGE_SIZE, offset: current.rows.length });
    setLoadingMore(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPage({ ...current, rows: [...current.rows, ...result.rows], more: result.rows.length === PAGE_SIZE });
  }

  async function remove(id: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setError(null);
    const result = await host.deleteSession(supabase, id);
    setConfirmingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    requestFocus(`${baseId}-title`);
    setReloadKey((n) => n + 1);
  }

  return (
    <section aria-labelledby={`${baseId}-title`} className={styles.section}>
      <h2 id={`${baseId}-title`} className={styles.heading} tabIndex={-1}>
        Các buổi đã chơi
      </h2>
      {current === null ? (
        <p role="status" className={`${styles.hint} animate-fade-up`}>
          Đang tải…
        </p>
      ) : current.error ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {current.error}
        </p>
      ) : current.rows.length === 0 ? (
        <p className={styles.hint}>
          {quizId
            ? "Quiz này chưa được chơi buổi nào. Bấm “Chơi ngay” để bắt đầu một phiên."
            : "Thầy cô chưa chơi buổi nào, hoặc các buổi cũ đã tự xoá sau 90 ngày."}
        </p>
      ) : (
        <>
          <ul className={styles.historyList}>
            {current.rows.map((row) => (
              <li key={row.session_id} className={styles.historyItem}>
                <div className={styles.historyMeta}>
                  <span className={styles.historyDate}>
                    {formatDateTime(row.created_at)}
                    {quizId ? "" : ` · ${row.quiz_title}${row.quiz_id === null ? " (quiz đã xoá)" : ""}`}
                  </span>
                  <span className={styles.hint}>
                    {row.player_count} bạn chơi · điểm trung bình {row.average_score}
                  </span>
                </div>
                {confirmingId === row.session_id ? (
                  <div className={styles.confirm} role="group" aria-label={`Xoá buổi ${formatDateTime(row.created_at)}`}>
                    <p>Xoá buổi này cùng điểm và câu trả lời của mọi bạn?</p>
                    <div className={styles.actions}>
                      <Button
                        variant="secondary"
                        autoFocus
                        onClick={() => {
                          setConfirmingId(null);
                          requestFocus(`${baseId}-del-${row.session_id}`);
                        }}
                      >
                        Giữ lại
                      </Button>
                      <Button variant="secondary" onClick={() => remove(row.session_id)}>
                        Xoá buổi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <Link href={`/host/${row.session_id}/results`}>Xem kết quả</Link>
                    <IconButton
                      id={`${baseId}-del-${row.session_id}`}
                      aria-label={`Xoá buổi ${formatDateTime(row.created_at)}`}
                      tooltip="Xoá buổi"
                      tone="danger"
                      onClick={() => setConfirmingId(row.session_id)}
                    >
                      <TrashIcon size={20} />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {current.more ? (
            <div className={styles.actions}>
              <Button variant="secondary" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Đang tải…" : "Xem thêm"}
              </Button>
            </div>
          ) : null}
        </>
      )}
      {error ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
