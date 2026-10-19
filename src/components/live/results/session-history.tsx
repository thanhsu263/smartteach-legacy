"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { host, type LiveResult } from "@/lib/live/rpc";
import { formatDateTime, type HistoryRow } from "@/lib/live/results";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFocusRequest } from "@/components/use-focus-request";
import styles from "./results.module.css";

type Loaded = { key: string; result: LiveResult<{ rows: HistoryRow[] }> };

/** Các buổi đã chơi của một quiz: xem kết quả hoặc xoá (có xác nhận). */
export function SessionHistory({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${quizId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestFocus = useFocusRequest();
  const baseId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    host.history(supabase, quizId).then((result) => {
      if (!cancelled) setLoaded({ key: `${userId}:${quizId}`, result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, quizId, reloadKey]);

  const current = loaded && loaded.key === key ? loaded.result : null;

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
        <p role="status" className={styles.hint}>
          Đang tải…
        </p>
      ) : !current.ok ? (
        <p role="alert" className={styles.error}>
          {current.message}
        </p>
      ) : current.rows.length === 0 ? (
        <p className={styles.hint}>Quiz này chưa được chơi buổi nào. Bấm “Chơi ngay” để bắt đầu một phiên.</p>
      ) : (
        <ul className={styles.historyList}>
          {current.rows.map((row) => (
            <li key={row.session_id} className={styles.historyItem}>
              <div className={styles.historyMeta}>
                <span className={styles.historyDate}>{formatDateTime(row.created_at)}</span>
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
                  <Button
                    variant="secondary"
                    id={`${baseId}-del-${row.session_id}`}
                    aria-label={`Xoá buổi ${formatDateTime(row.created_at)}`}
                    onClick={() => setConfirmingId(row.session_id)}
                  >
                    Xoá
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
