"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button, ButtonLink } from "@/components/button";
import type { Result } from "@/lib/classes/api";
import {
  deleteQuestion,
  getQuiz,
  getQuizProblems,
  renameQuiz,
  reorderQuestions,
  saveQuestion,
  type LoadedQuiz,
} from "@/lib/quiz/api";
import { MAX_QUESTIONS_PER_QUIZ, MAX_TITLE_LENGTH } from "@/lib/quiz/limits";
import { KIND_LABELS, QUESTION_KINDS, type QuestionInput, type QuestionKind, type QuizProblem } from "@/lib/quiz/types";
import { newDraft } from "@/lib/quiz/validate";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { QuestionForm } from "./question-form";
import { QuizProblems } from "./quiz-problems";
import { SharePanel } from "./share-panel";
import styles from "./quiz-editor.module.css";

type Loaded = {
  key: string;
  result: Result<{ found: false } | { found: true; quiz: LoadedQuiz; problems: QuizProblem[] }>;
};

/** Đang soạn câu có sẵn hay câu mới (nonce làm mới form khi bấm thêm lần nữa). */
type Mode = { type: "edit"; id: string } | { type: "new"; kind: QuestionKind; nonce: number } | null;

export function QuizEditor({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${quizId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [mode, setMode] = useState<Mode>(null);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [tokenOverride, setTokenOverride] = useState<{ key: string; token: string | null } | null>(null);
  const baseId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const quiz = await getQuiz(supabase, quizId);
      let result: Loaded["result"];
      if (!quiz.ok) {
        result = quiz;
      } else if (!quiz.found) {
        result = { ok: true, found: false };
      } else {
        const problems = await getQuizProblems(supabase, quizId);
        result = problems.ok ? { ok: true, found: true, quiz: quiz.quiz, problems: problems.problems } : problems;
      }
      if (!cancelled) {
        setLoaded({ key: `${userId}:${quizId}`, result });
        setMoving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, quizId, reloadKey]);

  const current = loaded && loaded.key === key ? loaded.result : null;
  const reload = () => setReloadKey((value) => value + 1);

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
        <p role="alert" className={styles.error}>
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
    );
  }

  if (!current.found) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Không tìm thấy quiz này</h1>
        <p className={styles.hint}>Quiz có thể đã bị xoá, hoặc đường dẫn chưa đúng.</p>
        <ButtonLink href="/my-quizzes" variant="secondary">
          Về Quiz của tôi
        </ButtonLink>
      </div>
    );
  }

  const { quiz, problems } = current;
  const questions = quiz.questions;
  const atLimit = questions.length >= MAX_QUESTIONS_PER_QUIZ;
  const shareToken = tokenOverride && tokenOverride.key === key ? tokenOverride.token : quiz.shareToken;
  const editing = mode?.type === "edit" ? questions.find((question) => question.id === mode.id) : undefined;

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setMessage(null);
    const result = await renameQuiz(supabase, quizId, titleDraft);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    setRenaming(false);
    reload();
  }

  async function save(payload: QuestionInput): Promise<{ ok: true } | { ok: false; message: string }> {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, message: "Chưa kết nối được máy chủ. Thầy cô thử lại sau nhé." };
    const result = await saveQuestion(supabase, quizId, payload);
    if (!result.ok) return result;
    setMessage({ kind: "info", text: payload.id ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi." });
    setMode({ type: "edit", id: result.id });
    reload();
    return { ok: true };
  }

  async function move(index: number, delta: -1 | 1) {
    const supabase = getBrowserSupabase();
    if (!supabase || moving) return;
    const ids = questions.map((question) => question.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setMessage(null);
    setMoving(true);
    const result = await reorderQuestions(supabase, quizId, ids);
    if (!result.ok) {
      setMoving(false);
      setMessage({ kind: "error", text: result.message });
      return;
    }
    // Giữ nút khoá tới khi danh sách mới tải xong, để hai lần bấm liên tiếp không xếp nhầm câu.
    reload();
  }

  async function remove(id: string, position: number) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setMessage(null);
    const result = await deleteQuestion(supabase, id);
    setConfirmingId(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    if (mode?.type === "edit" && mode.id === id) setMode(null);
    setMessage({ kind: "info", text: `Đã xoá câu ${position}.` });
    reload();
  }

  return (
    <div className={styles.editor}>
      <Breadcrumb items={[{ label: "Quiz của tôi", href: "/my-quizzes" }, { label: quiz.title }]} />

      <header className={styles.header}>
        {renaming ? (
          <form onSubmit={submitRename} className={styles.inline}>
            <label htmlFor={`${baseId}-title`} className="visually-hidden">
              Tên quiz
            </label>
            <input
              id={`${baseId}-title`}
              value={titleDraft}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => setTitleDraft(event.target.value)}
              autoFocus
            />
            <Button type="submit" variant="primary">
              Lưu
            </Button>
            <Button variant="secondary" onClick={() => setRenaming(false)}>
              Huỷ
            </Button>
          </form>
        ) : (
          <>
            <h1 className={styles.title}>{quiz.title}</h1>
            <Button
              variant="secondary"
              onClick={() => {
                setTitleDraft(quiz.title);
                setRenaming(true);
              }}
            >
              Đổi tên quiz
            </Button>
          </>
        )}
      </header>

      <QuizProblems problems={problems} />

      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? styles.error : styles.notice}>
          {message.text}
        </p>
      ) : null}

      <div className={styles.workspace}>
        <section aria-labelledby={`${baseId}-questions`} className={styles.panel}>
          <h2 id={`${baseId}-questions`} className={styles.heading}>
            Câu hỏi ({questions.length} / {MAX_QUESTIONS_PER_QUIZ})
          </h2>
          {questions.length === 0 ? (
            <p className={styles.hint}>Quiz chưa có câu hỏi nào. Chọn một dạng câu hỏi ở bên dưới để bắt đầu.</p>
          ) : (
            <ol className={styles.questions}>
              {questions.map((question, index) => {
                const selected = mode?.type === "edit" && mode.id === question.id;
                return (
                  <li key={question.id} className={styles.question} data-selected={selected || undefined}>
                    <button
                      type="button"
                      className={styles.select}
                      aria-current={selected ? "true" : undefined}
                      onClick={() => {
                        setMode({ type: "edit", id: question.id });
                        setConfirmingId(null);
                        setMessage(null);
                      }}
                    >
                      <span className={styles.number}>Câu {index + 1}</span>
                      <span className={styles.prompt}>{question.prompt}</span>
                      <span className={styles.kind}>{KIND_LABELS[question.kind]}</span>
                    </button>
                    <div className={styles.rowActions}>
                      <Button
                        variant="secondary"
                        aria-label={`Chuyển câu ${index + 1} lên trên`}
                        disabled={index === 0 || moving}
                        onClick={() => move(index, -1)}
                      >
                        Lên
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Chuyển câu ${index + 1} xuống dưới`}
                        disabled={index === questions.length - 1 || moving}
                        onClick={() => move(index, 1)}
                      >
                        Xuống
                      </Button>
                      {confirmingId === question.id ? (
                        <>
                          <Button variant="secondary" aria-label={`Xoá câu này, câu ${index + 1}`} onClick={() => remove(question.id, index + 1)}>
                            Xoá câu này
                          </Button>
                          <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                            Giữ lại
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" aria-label={`Xoá câu ${index + 1}`} onClick={() => setConfirmingId(question.id)}>
                          Xoá
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className={styles.add} role="group" aria-label="Thêm câu hỏi mới">
            {QUESTION_KINDS.map((kind) => (
              <Button
                key={kind}
                variant="secondary"
                disabled={atLimit}
                onClick={() => {
                  setMode({ type: "new", kind, nonce: Date.now() });
                  setMessage(null);
                }}
              >
                Thêm: {KIND_LABELS[kind]}
              </Button>
            ))}
          </div>
          {atLimit ? <p className={styles.hint}>Quiz đã đủ {MAX_QUESTIONS_PER_QUIZ} câu, thầy cô xoá bớt câu cũ để thêm câu mới.</p> : null}
        </section>

        <section aria-labelledby={`${baseId}-form`} className={styles.panel}>
          <h2 id={`${baseId}-form`} className={styles.heading}>
            {mode?.type === "new" ? "Câu hỏi mới" : editing ? `Sửa câu ${questions.indexOf(editing) + 1}` : "Soạn câu hỏi"}
          </h2>
          {mode?.type === "new" ? (
            <QuestionForm
              key={`new-${mode.kind}-${mode.nonce}`}
              initial={newDraft(mode.kind)}
              isNew
              onSave={save}
              onCancel={() => setMode(null)}
            />
          ) : editing ? (
            <QuestionForm key={editing.id} initial={editing} isNew={false} onSave={save} />
          ) : (
            <p className={styles.hint}>Chọn một câu ở danh sách để sửa, hoặc thêm câu hỏi mới.</p>
          )}
        </section>
      </div>

      <SharePanel
        quizId={quizId}
        token={shareToken}
        onChange={(token) => setTokenOverride({ key, token })}
      />
    </div>
  );
}
