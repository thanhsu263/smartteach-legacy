"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button, ButtonLink } from "@/components/button";
import { StartSession } from "@/components/live/host/start-session";
import { SessionHistory } from "@/components/live/results/session-history";
import { useFocusRequest } from "@/components/use-focus-request";
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

/**
 * Câu đang soạn. `id` chưa có nghĩa là câu mới; lưu lần đầu thì gắn `id` vào mà vẫn giữ nguyên form
 * (cùng `nonce`) nên nút vừa bấm không bị gỡ và focus không bị mất. `nonce` mới thì form được dựng lại.
 */
type Mode = { nonce: number; kind: QuestionKind; id?: string } | null;

export function QuizEditor({ quizId }: { quizId: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${quizId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [mode, setMode] = useState<Mode>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<{ next: Mode } | null>(null);
  const nonce = useRef(0);
  const focusAfterLoad = useRef<string | null>(null);
  const requestFocus = useFocusRequest();
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
        if (focusAfterLoad.current) {
          requestFocus(focusAfterLoad.current);
          focusAfterLoad.current = null;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, quizId, reloadKey, requestFocus]);

  const current = loaded && loaded.key === key ? loaded.result : null;
  const reload = () => setReloadKey((value) => value + 1);

  if (current === null) {
    return (
      <div className={styles.skeleton} aria-busy="true">
        <p className="visually-hidden" role="status">
          Đang tải quiz…
        </p>
        <span className="glass-skeleton" />
        <span />
      </div>
    );
  }

  if (!current.ok) {
    return (
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
  const editing = mode?.id ? questions.find((question) => question.id === mode.id) : undefined;
  const editingIndex = mode?.id ? questions.findIndex((question) => question.id === mode.id) : -1;
  const formHeadingId = `${baseId}-form`;

  /** Chuyển sang câu khác (hoặc đóng form); nếu còn thay đổi chưa lưu thì hỏi lại trước. */
  function switchTo(next: Mode) {
    if (dirty) {
      setPendingSwitch({ next });
      return;
    }
    setMode(next);
    setConfirmingId(null);
    setMessage(null);
  }

  function startNew(kind: QuestionKind) {
    nonce.current += 1;
    switchTo({ nonce: nonce.current, kind });
  }

  function select(question: { id: string; kind: QuestionKind }) {
    if (mode?.id === question.id) return;
    nonce.current += 1;
    switchTo({ nonce: nonce.current, kind: question.kind, id: question.id });
  }

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
    const saving = mode;
    // Form đã gắn với một câu thì luôn lưu vào câu đó, kể cả khi bản nháp ban đầu chưa có id.
    const withId = saving?.id ? { ...payload, id: saving.id } : payload;
    const result = await saveQuestion(supabase, quizId, withId);
    if (!result.ok) return result;
    setMessage({ kind: "info", text: withId.id ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi." });
    // Chỉ gắn id khi người dùng chưa chuyển sang câu khác trong lúc đang lưu.
    setMode((now) => (now && saving && now.nonce === saving.nonce ? { ...now, id: result.id } : now));
    setPendingSwitch(null);
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
    if (mode?.id === id) setMode(null);
    setMessage({ kind: "info", text: `Đã xoá câu ${position}.` });
    // Dòng vừa bấm biến mất: đưa focus về tiêu đề danh sách sau khi danh sách mới tải xong.
    focusAfterLoad.current = `${baseId}-questions`;
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

      <StartSession quizId={quizId} problems={problems} />

      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? styles.error : styles.notice}>
          {message.text}
        </p>
      ) : null}

      <div className={styles.workspace}>
        <section aria-labelledby={`${baseId}-questions`} className={styles.panel}>
          <h2 id={`${baseId}-questions`} className={styles.heading} tabIndex={-1}>
            Câu hỏi ({questions.length} / {MAX_QUESTIONS_PER_QUIZ})
          </h2>
          {questions.length === 0 ? (
            <p className={styles.hint}>Quiz chưa có câu hỏi nào. Chọn một dạng câu hỏi ở bên dưới để bắt đầu.</p>
          ) : (
            <ol className={styles.questions}>
              {questions.map((question, index) => {
                const selected = mode?.id === question.id;
                return (
                  <li key={question.id} className={styles.question} data-selected={selected || undefined}>
                    <button
                      type="button"
                      className={styles.select}
                      data-glass="row"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => select(question)}
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
                          <Button
                            variant="secondary"
                            autoFocus
                            onClick={() => {
                              setConfirmingId(null);
                              requestFocus(`${baseId}-del-${question.id}`);
                            }}
                          >
                            Giữ lại
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          id={`${baseId}-del-${question.id}`}
                          aria-label={`Xoá câu ${index + 1}`}
                          onClick={() => setConfirmingId(question.id)}
                        >
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
                onClick={() => startNew(kind)}
              >
                Thêm: {KIND_LABELS[kind]}
              </Button>
            ))}
          </div>
          {atLimit ? <p className={styles.hint}>Quiz đã đủ {MAX_QUESTIONS_PER_QUIZ} câu, thầy cô xoá bớt câu cũ để thêm câu mới.</p> : null}
        </section>

        <section aria-labelledby={formHeadingId} className={styles.panel}>
          <h2 id={formHeadingId} className={styles.heading} tabIndex={-1}>
            {mode === null ? "Soạn câu hỏi" : mode.id === undefined ? "Câu hỏi mới" : editingIndex >= 0 ? `Sửa câu ${editingIndex + 1}` : "Sửa câu hỏi"}
          </h2>
          {pendingSwitch && dirty ? (
            <div className={styles.confirm} role="group" aria-label="Thay đổi chưa lưu">
              <p>Câu đang soạn có thay đổi chưa lưu. Chuyển đi thì nội dung đã gõ sẽ mất.</p>
              <div className={styles.rowActions}>
                <Button
                  variant="secondary"
                  autoFocus
                  onClick={() => {
                    setPendingSwitch(null);
                    requestFocus(formHeadingId);
                  }}
                >
                  Tiếp tục soạn
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const { next } = pendingSwitch;
                    setPendingSwitch(null);
                    setMode(next);
                    setConfirmingId(null);
                    setMessage(null);
                    requestFocus(formHeadingId);
                  }}
                >
                  Bỏ thay đổi
                </Button>
              </div>
            </div>
          ) : null}
          {mode ? (
            <QuestionForm
              key={mode.nonce}
              initial={editing ?? newDraft(mode.kind)}
              isNew={mode.id === undefined}
              onSave={save}
              onCancel={mode.id === undefined ? () => switchTo(null) : undefined}
              onDirtyChange={setDirty}
            />
          ) : (
            <p className={styles.hint}>Chọn một câu ở danh sách để sửa, hoặc thêm câu hỏi mới.</p>
          )}
        </section>
      </div>

      <SessionHistory quizId={quizId} />

      <SharePanel
        quizId={quizId}
        token={shareToken}
        onChange={(token) => setTokenOverride({ key, token })}
      />
    </div>
  );
}
