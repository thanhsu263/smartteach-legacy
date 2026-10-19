"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button, ButtonLink } from "@/components/button";
import type { Result } from "@/lib/classes/api";
import { cloneSharedQuiz, getSharedQuiz, type SharedQuiz } from "@/lib/quiz/api";
import { KIND_LABELS } from "@/lib/quiz/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./shared-quiz-view.module.css";

type Loaded = { key: string; result: Result<{ quiz: SharedQuiz }> };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Xem quiz được đồng nghiệp chia sẻ (chỉ đọc) và sao chép về tài khoản của mình. */
export function SharedQuizView({ token }: { token: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${token}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    getSharedQuiz(supabase, token).then((result) => {
      if (!cancelled) setLoaded({ key: `${userId}:${token}`, result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, token, reloadKey]);

  const current = loaded && loaded.key === key ? loaded.result : null;

  async function clone() {
    const supabase = getBrowserSupabase();
    if (!supabase || cloning) return;
    setCloning(true);
    setCloneError(null);
    const result = await cloneSharedQuiz(supabase, token);
    if (!result.ok) {
      setCloning(false);
      setCloneError(result.message);
      return;
    }
    router.push(`/my-quizzes/${result.id}`);
  }

  if (current === null) {
    return (
      <div className={styles.skeleton} aria-busy="true">
        <p className="visually-hidden" role="status">
          Đang tải quiz…
        </p>
        <span />
        <span />
      </div>
    );
  }

  if (!current.ok) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Không mở được quiz này</h1>
        <p role="alert" className={styles.error}>
          {current.message}
        </p>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => {
              setLoaded(null);
              setReloadKey((value) => value + 1);
            }}
          >
            Thử lại
          </Button>
          <ButtonLink href="/my-quizzes" variant="secondary">
            Về Quiz của tôi
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { quiz } = current;

  return (
    <div className={styles.view}>
      <Breadcrumb items={[{ label: "Quiz của tôi", href: "/my-quizzes" }, { label: quiz.title }]} />
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{quiz.title}</h1>
          <p className={styles.hint}>
            Quiz do đồng nghiệp chia sẻ, {quiz.questions.length} câu. Thầy cô xem được cả đáp án đúng. Sao chép về để chỉnh sửa và dùng riêng.
          </p>
        </div>
        <Button variant="primary" disabled={cloning} onClick={clone}>
          {cloning ? "Đang sao chép…" : "Sao chép về tài khoản của tôi"}
        </Button>
      </header>

      {cloneError ? (
        <p role="alert" className={styles.error}>
          {cloneError}
        </p>
      ) : null}

      <ol className={styles.questions}>
        {quiz.questions.map((question, index) => (
          <li key={index} className={styles.question}>
            <p className={styles.meta}>
              Câu {index + 1} · {KIND_LABELS[question.kind]} · {question.time_limit_seconds} giây
            </p>
            <p className={styles.prompt}>{question.prompt}</p>
            {question.kind === "short_text" ? (
              <p className={styles.answers}>
                Đáp án chấp nhận: <strong>{question.accepted_answers.join(" · ")}</strong>
                {question.ignore_diacritics ? " (chấp nhận cả khi gõ không dấu)" : ""}
              </p>
            ) : (
              <ul className={styles.options}>
                {question.options.map((option, optionIndex) => (
                  <li key={optionIndex} className={styles.option} data-correct={option.is_correct || undefined}>
                    <span className={styles.letter} aria-hidden="true">
                      {LETTERS[optionIndex] ?? optionIndex + 1}
                    </span>
                    <span>{option.label}</span>
                    {option.is_correct ? <span className={styles.badge}>Đáp án đúng</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
