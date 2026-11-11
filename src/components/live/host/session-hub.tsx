"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/button";
import { listQuizzes } from "@/lib/quiz/api";
import type { QuizSummary } from "@/lib/quiz/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { StartSession } from "./start-session";
import styles from "./session-hub.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quizzes: QuizSummary[] };

/**
 * Điểm vào phiên trực tiếp: chọn quiz trước, sau đó mới mở thiết lập phiên.
 * Dùng lại StartSession để validation, conflict và các tuỳ chọn luôn trùng với
 * nút "Chơi ngay" trong trình soạn quiz.
 */
export function SessionHub() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setState({ status: "loading" });
    setReloadKey((value) => value + 1);
  }

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    void listQuizzes(supabase).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ status: "error", message: result.message });
        return;
      }
      setState({ status: "ready", quizzes: result.quizzes });
      setSelectedId((current) => (current && result.quizzes.some((quiz) => quiz.id === current) ? current : result.quizzes[0]?.id ?? null));
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state.status === "loading") {
    return (
      <section className={styles.section} aria-labelledby="session-hub-title" aria-busy="true">
        <div className={styles.heading}>
          <div>
            <h2 id="session-hub-title">Chọn quiz để bắt đầu</h2>
            <p>Đang tải quiz của thầy cô…</p>
          </div>
        </div>
        <div className={styles.skeletons} aria-hidden="true">
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.section} aria-labelledby="session-hub-title">
        <div className={styles.heading}>
          <div>
            <h2 id="session-hub-title">Chọn quiz để bắt đầu</h2>
            <p>Chọn một quiz đã soạn để mở phòng chơi.</p>
          </div>
        </div>
        <p className={styles.error} role="alert">
          {state.message}
        </p>
        <button type="button" className={styles.retry} onClick={reload}>
          Thử tải lại
        </button>
      </section>
    );
  }

  if (state.quizzes.length === 0) {
    return (
      <section className={styles.section} aria-labelledby="session-hub-title">
        <div className={styles.heading}>
          <div>
            <h2 id="session-hub-title">Chọn quiz để bắt đầu</h2>
            <p>Thầy cô cần một quiz có câu hỏi trước khi mở phòng.</p>
          </div>
        </div>
        <div className={styles.empty}>
          <p>Chưa có quiz nào để chơi trực tiếp.</p>
          <div className={styles.actions}>
            <ButtonLink href="/my-quizzes" variant="primary">
              Tạo quiz
            </ButtonLink>
            <ButtonLink href="/my-quizzes/import" variant="secondary">
              Nhập từ tệp
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  const selected = state.quizzes.find((quiz) => quiz.id === selectedId) ?? state.quizzes[0];

  return (
    <section className={styles.section} aria-labelledby="session-hub-title">
      <div className={styles.heading}>
        <div>
          <h2 id="session-hub-title">Chọn quiz để bắt đầu</h2>
          <p>Mở một phòng mới hoặc tiếp tục phiên đang chạy của thầy cô.</p>
        </div>
        <ButtonLink href="/my-quizzes" variant="secondary">
          Quản lý quiz
        </ButtonLink>
      </div>

      <div className={styles.layout}>
        <ul className={styles.quizList} aria-label="Danh sách quiz">
          {state.quizzes.map((quiz) => {
            const selected = quiz.id === selectedId;
            return (
              <li key={quiz.id}>
                <button
                  type="button"
                  className={styles.quiz}
                  aria-pressed={selected}
                  onClick={() => setSelectedId(quiz.id)}
                >
                  <span className={styles.quizTitle}>{quiz.title}</span>
                  <span className={styles.quizMeta}>{quiz.questionCount} câu hỏi</span>
                  <span className={styles.quizAction}>{selected ? "Đang chọn" : "Chọn quiz"}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className={styles.setup} data-surface="panel">
          <p className={styles.setupLabel}>Quiz đã chọn</p>
          <h3>{selected.title}</h3>
          <p>{selected.questionCount} câu hỏi. Thầy cô có thể điều chỉnh tuỳ chọn trước khi bắt đầu.</p>
          <StartSession quizId={selected.id} />
        </div>
      </div>
    </section>
  );
}
