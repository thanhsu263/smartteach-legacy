"use client";

import { useEffect, useId, useState, type FormEvent, type RefObject } from "react";
import { useLocalDraft } from "@/components/drafts/use-local-draft";
import { Button, IconButton } from "@/components/button";
import { WorkspaceFeedback } from "@/components/workspace-feedback";
import { TrashIcon } from "@/components/icons";
import { useFocusRequest } from "@/components/use-focus-request";
import { problemText } from "@/lib/quiz/errors";
import {
  MAX_ACCEPTED_ANSWERS,
  MAX_ANSWER_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_PROMPT_LENGTH,
  MIN_OPTIONS_PER_QUESTION,
  TIME_LIMITS,
} from "@/lib/quiz/limits";
import { KIND_LABELS, type QuestionInput, type TimeLimit } from "@/lib/quiz/types";
import { checkDraft, toPayload } from "@/lib/quiz/validate";
import styles from "./question-form.module.css";
import { FieldLayout } from "@/components/workspace/workspace-layout";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type SaveResult = { ok: true } | { ok: false; message: string };

type QuestionFormProps = {
  quizId: string;
  restored?: QuestionInput;
  draftRevision?: number;
  draftBaseline?: string;
  draftActionsRef: RefObject<{ discard: () => Promise<boolean> } | null>;
  initial: QuestionInput;
  isNew: boolean;
  onSave: (payload: QuestionInput) => Promise<SaveResult>;
  onCancel?: () => void;
  /** Báo cho nơi chứa biết còn thay đổi chưa lưu, để hỏi lại trước khi chuyển sang câu khác. */
  onDirtyChange?: (dirty: boolean) => void;
};

export function QuestionForm({ initial, isNew, onSave, onCancel, onDirtyChange, quizId, restored, draftRevision, draftBaseline, draftActionsRef }: QuestionFormProps) {
  const [draft, setDraft] = useState<QuestionInput>(restored ?? initial);
  // Bản đã lưu gần nhất (dạng chuỗi) để biết bản nháp có khác không.
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(draft) !== saved;
  const localDraft = useLocalDraft({ entity: "quiz", entityId: quizId, target: initial.id ?? null, baseline: draftBaseline ?? JSON.stringify(initial), payload: draft, dirty, initialRevision: draftRevision ?? null });
  useEffect(() => { draftActionsRef.current = { discard: localDraft.discard }; return () => { draftActionsRef.current = null; }; }, [draftActionsRef, localDraft.discard]);
  const requestFocus = useFocusRequest();
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const baseId = useId();

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const issues = checkDraft(draft);
  const kind = draft.kind;
  const isChoice = kind === "single" || kind === "multi";
  const optionsEditable = isChoice;
  const letter = (index: number) => LETTERS[index] ?? String(index + 1);

  function update(patch: Partial<QuestionInput>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function setOption(index: number, patch: Partial<QuestionInput["options"][number]>) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    }));
  }

  /** Chọn đáp án đúng: dạng một đáp án chỉ cho phép một lựa chọn đúng. */
  function chooseCorrect(index: number, checked: boolean) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, i) => ({
        ...option,
        is_correct: current.kind === "multi" ? (i === index ? checked : option.is_correct) : i === index,
      })),
    }));
  }

  function setAnswer(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      accepted_answers: current.accepted_answers.map((answer, i) => (i === index ? value : answer)),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setShowErrors(true);
    setSaveError(null);
    if (issues.blocking) return;
    setSaving(true);
    const snapshot = JSON.stringify(draft);
    const result = await onSave(toPayload(draft));
    setSaving(false);
    // Giữ nguyên nội dung đang gõ khi lưu thất bại.
    if (!result.ok) setSaveError(result.message);
    else { setSaved(snapshot); await localDraft.clearSaved(JSON.parse(snapshot) as QuestionInput); }
    // Nút bị khoá trong lúc lưu nên mất focus; trả focus về nút để bấm tiếp hoặc đọc kết quả.
    requestFocus(`${baseId}-submit`);
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <div className={styles.content}>
      {localDraft.message && <p role="status">{localDraft.message}</p>}
      <p className={styles.kind}>{KIND_LABELS[kind]}</p>

      <div className={styles.field}>
        <label htmlFor={`${baseId}-prompt`}>Câu hỏi</label>
        <textarea
          id={`${baseId}-prompt`}
          rows={3}
          value={draft.prompt}
          onChange={(event) => update({ prompt: event.target.value })}
          aria-invalid={showErrors && issues.prompt !== undefined}
          aria-describedby={`${baseId}-prompt-help`}
        />
        <p id={`${baseId}-prompt-help`} className={showErrors && issues.prompt ? styles.error : styles.hint}>
          {showErrors && issues.prompt ? issues.prompt : `${draft.prompt.trim().length} / ${MAX_PROMPT_LENGTH} ký tự`}
        </p>
      </div>

      {kind !== "short_text" ? (
        <fieldset className={styles.options}>
          <legend>{kind === "multi" ? "Các lựa chọn (chọn mọi đáp án đúng)" : "Các lựa chọn (chọn một đáp án đúng)"}</legend>
          {kind === "true_false" ? (
            <ul className={styles.optionList}>
              {draft.options.map((option, index) => (
                <li key={option.label} className={styles.optionRow}>
                  <span className={styles.letter} aria-hidden="true">
                    {letter(index)}
                  </span>
                  <label className={styles.correct}>
                    <input
                      type="radio"
                      name={`${baseId}-tf`}
                      checked={option.is_correct}
                      onChange={() => chooseCorrect(index, true)}
                    />
                    <span>{option.label} là đáp án đúng</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul className={styles.optionList}>
                {draft.options.map((option, index) => {
                  const message = showErrors ? issues.options[index] : undefined;
                  return (
                    <li key={index} className={styles.optionRow}>
                      <span className={styles.letter} aria-hidden="true">
                        {letter(index)}
                      </span>
                      <div className={styles.optionBody}>
                        <input
                          id={`${baseId}-opt-input-${index}`}
                          type="text"
                          value={option.label}
                          maxLength={MAX_OPTION_LENGTH + 20}
                          aria-label={`Lựa chọn ${letter(index)}`}
                          aria-invalid={message !== undefined}
                          aria-describedby={message ? `${baseId}-opt-${index}-err` : undefined}
                          onChange={(event) => setOption(index, { label: event.target.value })}
                        />
                        {message ? (
                          <p id={`${baseId}-opt-${index}-err`} className={styles.error}>
                            {message}
                          </p>
                        ) : null}
                      </div>
                      <label className={styles.correct}>
                        <input
                          type={kind === "multi" ? "checkbox" : "radio"}
                          name={`${baseId}-correct`}
                          checked={option.is_correct}
                          aria-label={`Lựa chọn ${letter(index)} là đáp án đúng`}
                          onChange={(event) => chooseCorrect(index, event.target.checked)}
                        />
                        <span>Đúng</span>
                      </label>
                      <IconButton
                        aria-label={`Xoá lựa chọn ${letter(index)}`}
                        tooltip="Xoá lựa chọn"
                        tone="danger"
                        disabled={draft.options.length <= MIN_OPTIONS_PER_QUESTION}
                        onClick={() => {
                          update({ options: draft.options.filter((_, i) => i !== index) });
                          requestFocus(`${baseId}-opt-input-${Math.max(0, index - 1)}`);
                        }}
                      >
                        <TrashIcon size={20} />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
              {optionsEditable ? (
                <Button
                  variant="secondary"
                  disabled={draft.options.length >= MAX_OPTIONS_PER_QUESTION}
                  onClick={() => update({ options: [...draft.options, { label: "", is_correct: false }] })}
                >
                  Thêm lựa chọn
                </Button>
              ) : null}
            </>
          )}
        </fieldset>
      ) : (
        <fieldset className={styles.options}>
          <legend>Các đáp án được chấp nhận</legend>
          <p className={styles.hint}>
            Học sinh gõ đúng một trong các đáp án này là được điểm. Không phân biệt hoa thường và khoảng trắng thừa; mặc định phân biệt dấu tiếng Việt.
          </p>
          <ul className={styles.optionList}>
            {draft.accepted_answers.map((answer, index) => {
              const message = showErrors ? issues.answers[index] : undefined;
              return (
                <li key={index} className={styles.optionRow}>
                  <div className={styles.optionBody}>
                    <input
                      id={`${baseId}-ans-input-${index}`}
                      type="text"
                      value={answer}
                      maxLength={MAX_ANSWER_LENGTH + 20}
                      aria-label={`Đáp án chấp nhận ${index + 1}`}
                      aria-invalid={message !== undefined}
                      aria-describedby={message ? `${baseId}-ans-${index}-err` : undefined}
                      onChange={(event) => setAnswer(index, event.target.value)}
                    />
                    {message ? (
                      <p id={`${baseId}-ans-${index}-err`} className={styles.error}>
                        {message}
                      </p>
                    ) : null}
                  </div>
                  <IconButton
                    aria-label={`Xoá đáp án chấp nhận ${index + 1}`}
                    tooltip="Xoá đáp án"
                    tone="danger"
                    disabled={draft.accepted_answers.length <= 1}
                    onClick={() => {
                      update({ accepted_answers: draft.accepted_answers.filter((_, i) => i !== index) });
                      requestFocus(`${baseId}-ans-input-${Math.max(0, index - 1)}`);
                    }}
                  >
                    <TrashIcon size={20} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
          <Button
            variant="secondary"
            disabled={draft.accepted_answers.length >= MAX_ACCEPTED_ANSWERS}
            onClick={() => update({ accepted_answers: [...draft.accepted_answers, ""] })}
          >
            Thêm đáp án
          </Button>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.ignore_diacritics}
              onChange={(event) => update({ ignore_diacritics: event.target.checked })}
            />
            <span>Chấp nhận cả đáp án gõ không dấu</span>
          </label>
        </fieldset>
      )}

      {showErrors && issues.general ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {issues.general}
        </p>
      ) : null}

      {issues.warnings.length > 0 ? (
        <ul className={styles.warnings} aria-label="Còn thiếu để chơi được">
          {issues.warnings.map((code) => (
            <li key={code}>{problemText(code)}</li>
          ))}
        </ul>
      ) : null}

      <WorkspaceFeedback tone={saveError ? "error" : "success"}>{saveError}</WorkspaceFeedback>

      <div className={styles.actions}>
        <Button type="submit" id={`${baseId}-submit`} variant="primary" data-pending-action aria-busy={saving || undefined} disabled={saving}>
          {saving ? "Đang lưu…" : isNew ? "Thêm câu hỏi" : "Lưu câu hỏi"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Huỷ
          </Button>
        ) : null}
      </div>
      </div>
      <details className={styles.settings} open>
        <summary>Cài đặt câu hỏi</summary>
        <p className={styles.kind}>{KIND_LABELS[kind]}</p>
        <FieldLayout htmlFor={`${baseId}-time`} label="Thời gian trả lời" className={styles.field}>
          <select id={`${baseId}-time`} value={draft.time_limit_seconds} onChange={event => update({ time_limit_seconds: Number(event.target.value) as TimeLimit })}>
            {TIME_LIMITS.map(seconds => <option key={seconds} value={seconds}>{seconds} giây</option>)}
          </select>
        </FieldLayout>
      </details>
    </form>
  );
}
