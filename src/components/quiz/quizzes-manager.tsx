"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, ButtonLink, IconButton } from "@/components/button";
import { CopyIcon, TrashIcon } from "@/components/icons";
import { StartSession } from "@/components/live/host/start-session";
import { useFocusRequest } from "@/components/use-focus-request";
import type { Result } from "@/lib/classes/api";
import { createQuiz, deleteQuiz, duplicateQuiz, listQuizzes, MAX_QUIZZES } from "@/lib/quiz/api";
import type { QuizSummary } from "@/lib/quiz/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./quizzes-manager.module.css";

type Loaded = { userId: string; result: Result<{ quizzes: QuizSummary[] }> };

export function QuizzesManager() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const titleId = useId();
  const requestFocus = useFocusRequest();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    listQuizzes(supabase).then((result) => {
      if (!cancelled) setLoaded({ userId, result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const current = loaded && loaded.userId === userId ? loaded.result : null;
  const quizzes = current?.ok ? current.quizzes : [];
  const atLimit = quizzes.length >= MAX_QUIZZES;
  const reload = () => setReloadKey((key) => key + 1);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || creating) return;
    setCreating(true);
    setFormError(null);
    const result = await createQuiz(supabase, title);
    setCreating(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setTitle("");
    router.push(`/my-quizzes/${result.id}`);
  }

  async function duplicate(id: string, name: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setActionError(null);
    setNotice(null);
    const result = await duplicateQuiz(supabase, id);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setNotice(`Đã nhân đôi “${name}”.`);
    reload();
  }

  async function remove(id: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setActionError(null);
    setNotice(null);
    const result = await deleteQuiz(supabase, id);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setConfirmingId(null);
    // Dòng vừa bấm biến mất: đưa focus về tiêu đề danh sách.
    requestFocus(`${titleId}-list`);
    reload();
  }

  return (
    <div className={styles.manager}>
      <section aria-labelledby={`${titleId}-new`} className={styles.panel}>
        <h2 id={`${titleId}-new`} className={styles.heading}>
          Tạo quiz mới
        </h2>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor={titleId}>Tên quiz</label>
            <input
              id={titleId}
              type="text"
              value={title}
              maxLength={100}
              required
              placeholder="Ví dụ: Ôn tập chương 1"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          {formError ? (
            <p role="alert" className={`${styles.error} animate-fade-up`}>
              {formError}
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={creating || atLimit}>
            {creating ? "Đang tạo…" : "Tạo quiz"}
          </Button>
          {atLimit ? <p className={styles.hint}>Đã đủ {MAX_QUIZZES} quiz. Xoá bớt quiz cũ để tạo quiz mới.</p> : null}
        </form>
        <p className={styles.hint}>Đã có sẵn câu hỏi trong Excel hoặc CSV, hoặc muốn dán từ Word?</p>
        <div>
          <ButtonLink href="/my-quizzes/import" variant="secondary">
            Nhập từ file
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby={`${titleId}-list`} className={styles.panel}>
        <h2 id={`${titleId}-list`} className={styles.heading} tabIndex={-1}>
          Quiz đã lưu{" "}
          {current?.ok ? (
            <span>
              ({quizzes.length} / {MAX_QUIZZES})
            </span>
          ) : null}
        </h2>

        {notice ? (
          <p role="status" className={`${styles.notice} animate-fade-up`}>
            {notice}
          </p>
        ) : null}
        {actionError ? (
          <p role="alert" className={`${styles.error} animate-fade-up`}>
            {actionError}
          </p>
        ) : null}

        {current === null ? (
          <div className={styles.skeleton} aria-busy="true">
            <p className="visually-hidden" role="status">
              Đang tải danh sách quiz…
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
                reload();
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : quizzes.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Thầy cô chưa có quiz nào</p>
            <p className={styles.hint}>
              Tạo quiz đầu tiên ở trên, rồi thêm câu hỏi trắc nghiệm, đúng sai, nhiều đáp án hoặc điền từ.
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {quizzes.map((quiz) => (
              <li key={quiz.id} className={styles.item}>
                <div>
                  <h3 className={styles.quizTitle}>
                    <Link href={`/my-quizzes/${quiz.id}`} data-glass="row">
                      {quiz.title}
                    </Link>
                  </h3>
                  <p className={styles.hint}>
                    {quiz.questionCount} câu hỏi
                    {quiz.shared ? <span className={styles.badge}>Đang chia sẻ</span> : null}
                  </p>
                </div>
                {confirmingId === quiz.id ? (
                  <div className={styles.confirm} role="group" aria-label={`Xoá quiz ${quiz.title}`}>
                    <p>Xoá quiz “{quiz.title}” và toàn bộ câu hỏi?</p>
                    <div className={styles.confirmActions}>
                      <Button variant="secondary" onClick={() => remove(quiz.id)}>
                        Xoá quiz
                      </Button>
                      <Button
                        variant="secondary"
                        autoFocus
                        onClick={() => {
                          setConfirmingId(null);
                          requestFocus(`${titleId}-del-${quiz.id}`);
                        }}
                      >
                        Giữ lại
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <StartSession quizId={quiz.id} />
                    <IconButton
                      aria-label={`Nhân đôi quiz ${quiz.title}`}
                      tooltip="Nhân đôi quiz"
                      disabled={atLimit}
                      onClick={() => duplicate(quiz.id, quiz.title)}
                    >
                      <CopyIcon size={20} />
                    </IconButton>
                    <IconButton
                      id={`${titleId}-del-${quiz.id}`}
                      aria-label={`Xoá quiz ${quiz.title}`}
                      tooltip="Xoá quiz"
                      tone="danger"
                      onClick={() => {
                        setActionError(null);
                        setNotice(null);
                        setConfirmingId(quiz.id);
                      }}
                    >
                      <TrashIcon size={20} />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
