"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/button";
import { createClass, deleteClass, listClasses, MAX_CLASSES, type ClassSummary, type Result } from "@/lib/classes/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { parseNames } from "@/lib/utilities/draw";
import styles from "./classes-manager.module.css";

type Loaded = { userId: string; result: Result<{ classes: ClassSummary[] }> };

export function ClassesManager() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState("");
  const [namesText, setNamesText] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameId = useId();
  const namesId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    listClasses(supabase).then((result) => {
      if (!cancelled) setLoaded({ userId, result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const current = loaded && loaded.userId === userId ? loaded.result : null;
  const classes = current?.ok ? current.classes : [];
  const atLimit = classes.length >= MAX_CLASSES;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || creating) return;
    setCreating(true);
    setFormError(null);
    setCreated(null);
    const result = await createClass(supabase, name, parseNames(namesText));
    setCreating(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setCreated(name.trim());
    setName("");
    setNamesText("");
    setReloadKey((key) => key + 1);
  }

  async function confirmDelete(id: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setDeleteError(null);
    const result = await deleteClass(supabase, id);
    if (!result.ok) {
      setDeleteError(result.message);
      return;
    }
    setConfirmingId(null);
    setReloadKey((key) => key + 1);
  }

  return (
    <div className={styles.manager}>
      <section aria-labelledby={`${nameId}-title`} className={styles.panel}>
        <h2 id={`${nameId}-title`} className={styles.heading}>
          Tạo lớp mới
        </h2>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor={nameId}>Tên lớp</label>
            <input
              id={nameId}
              type="text"
              value={name}
              maxLength={100}
              required
              placeholder="Ví dụ: 10A1"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={namesId}>Danh sách học sinh (không bắt buộc)</label>
            <textarea
              id={namesId}
              rows={6}
              value={namesText}
              placeholder={"Dán vào đây, mỗi dòng một tên"}
              spellCheck={false}
              onChange={(event) => setNamesText(event.target.value)}
            />
            <p className={styles.hint}>{parseNames(namesText).length} tên</p>
          </div>
          {formError ? (
            <p role="alert" className={`${styles.error} animate-fade-up`}>
              {formError}
            </p>
          ) : null}
          {created ? (
            <p role="status" className={`${styles.notice} animate-fade-up`}>
              Đã tạo lớp “{created}”.
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={creating || atLimit}>
            {creating ? "Đang tạo…" : "Tạo lớp"}
          </Button>
          {atLimit ? (
            <p className={styles.hint}>Đã đủ {MAX_CLASSES} lớp. Xoá bớt lớp cũ để tạo lớp mới.</p>
          ) : null}
        </form>
      </section>

      <section aria-labelledby="saved-classes-title" className={styles.panel}>
        <h2 id="saved-classes-title" className={styles.heading}>
          Các lớp đã lưu {current?.ok ? <span>({classes.length} / {MAX_CLASSES})</span> : null}
        </h2>

        {current === null ? (
          <div className={styles.skeleton} aria-busy="true">
            <p className="visually-hidden" role="status">
              Đang tải danh sách lớp…
            </p>
            <span className="glass-skeleton" />
            <span />
            <span />
          </div>
        ) : !current.ok ? (
          <div className={styles.empty}>
            <p role="alert" className={`${styles.error} animate-fade-up`}>
              {current.message}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setLoaded(null);
                setReloadKey((key) => key + 1);
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : classes.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Thầy cô chưa có lớp nào</p>
            <p className={styles.hint}>
              Tạo lớp đầu tiên ở trên và dán sẵn danh sách tên. Sau đó bốc thăm và chia nhóm chỉ cần chọn lớp.
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {classes.map((item) => (
              <li key={item.id} className={styles.item}>
                <div>
                  <h3 className={styles.className}>
                    <Link href={`/my-classes/${item.id}`} data-glass="row">
                      {item.name}
                    </Link>
                  </h3>
                  <p className={styles.hint}>{item.studentCount} học sinh</p>
                </div>
                {confirmingId === item.id ? (
                  <div className={styles.confirm} role="group" aria-label={`Xoá lớp ${item.name}`}>
                    <p>Xoá lớp “{item.name}” và toàn bộ danh sách học sinh?</p>
                    <div className={styles.confirmActions}>
                      <Button variant="secondary" onClick={() => confirmDelete(item.id)}>
                        Xoá lớp
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                        Giữ lại
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    aria-label={`Xoá lớp ${item.name}`}
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmingId(item.id);
                    }}
                  >
                    Xoá
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {deleteError ? (
          <p role="alert" className={`${styles.error} animate-fade-up`}>
            {deleteError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
