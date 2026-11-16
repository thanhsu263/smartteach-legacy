"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/button";
import { credentialFromFragment, withoutCredentialFragment } from "@/lib/assignments/student-access";
import { exchangeAssignmentAccess, getStudentAssignmentState, saveStudentAssignmentAnswer, submitStudentAssignment } from "@/lib/assignments/api";
import type { StudentAnswer, StudentAssignmentState } from "@/lib/assignments/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { tokenKey } from "./learn-start";
import styles from "./learn.module.css";
import { ExamCountdown } from "./exam-countdown";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; state: StudentAssignmentState };

export function StudentAssignmentRunner({ code }: { code: string }) {
  const id = useId();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [expiredAttempt, setExpiredAttempt] = useState<string | null>(null);

  const normalizedCode = useMemo(() => code.toUpperCase(), [code]);

  async function fetchState(token: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const result = await getStudentAssignmentState(supabase, token);
    if (!result.ok) { setSaveMessage(result.message); setLoad(previous => previous.kind === "ready" ? previous : { kind: "error", message: result.message }); return; }
    setPosition((current) => Math.min(current, Math.max(0, result.state.questions.length - 1)));
    setLoad({ kind: "ready", state: result.state });
  }

  useEffect(() => {
    const stored = sessionStorage.getItem(tokenKey(normalizedCode));
    const credential = credentialFromFragment(window.location.hash);
    if (!credential && stored) { queueMicrotask(() => { void fetchState(stored); }); return; }
    if (!credential) { queueMicrotask(() => setLoad({ kind: "error", message: "Phiên làm bài chưa được mở trên thiết bị này. Bạn nhập lại mã bài và mã truy cập nhé." })); return; }
    window.history.replaceState(null, "", withoutCredentialFragment(window.location.pathname, window.location.search));
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    void exchangeAssignmentAccess(supabase, normalizedCode, credential).then((exchange) => {
      if (!exchange.ok) { setLoad({ kind: "error", message: "Không vào được bài này. Bạn kiểm tra lại mã bài và mã truy cập riêng nhé." }); return; }
      sessionStorage.setItem(tokenKey(normalizedCode), exchange.token);
      void fetchState(exchange.token);
    });
  // Token được tạo đúng một lần khi mount/đổi mã; không exchange lại mỗi lần state render.
  }, [normalizedCode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmSubmit && !dialog.open) dialog.showModal();
    if (!confirmSubmit && dialog.open) dialog.close();
  }, [confirmSubmit]);

  const state = load.kind === "ready" ? load.state : null;
  const current = state?.questions[position] ?? null;
  const currentAnswer = current ? state?.answers[String(current.index)] : undefined;
  const expired = expiredAttempt === state?.attemptId;
  useEffect(() => {
    if (!state?.deadlineAt || state.phase !== "in_progress") return;
    const refresh = () => { const token = sessionStorage.getItem(tokenKey(normalizedCode)); if(token) void fetchState(token); };
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); clearInterval(timer); };
  // Only a new attempt or deadline changes this subscription. Server-time anchors update in the timer child.
  }, [state?.attemptId, state?.deadlineAt, state?.phase, normalizedCode]);

  async function save(answer: StudentAnswer) {
    if (!state || !current || saving !== null || expired) return false;
    const token = sessionStorage.getItem(tokenKey(normalizedCode));
    const supabase = getBrowserSupabase();
    if (!token || !supabase) return false;
    setSaving(current.index);
    setSaveMessage(null);
    const result = await saveStudentAssignmentAnswer(supabase, token, current.index, answer);
    setSaving(null);
    if (!result.ok) { setSaveMessage(result.message); if (state.deadlineAt) await fetchState(token); return false; }
    setLoad(previous => previous.kind === "ready" && previous.state.attemptId === state.attemptId ? { kind: "ready", state: { ...previous.state, answers: { ...previous.state.answers, [String(current.index)]: answer } } } : previous);
    setSaveMessage("Đã lưu câu trả lời.");
    return true;
  }

  async function submit() {
    if (!state) return;
    const token = sessionStorage.getItem(tokenKey(normalizedCode));
    const supabase = getBrowserSupabase();
    if (!token || !supabase) return;
    setConfirmSubmit(false);
    setSaving(-1);
    const result = await submitStudentAssignment(supabase, token);
    setSaving(null);
    if (!result.ok) { setSaveMessage(result.message); return; }
    await fetchState(token);
  }
  async function flushCurrentText() {
    if (state?.snapshotVersion !== 2 || current?.kind !== "short_text") return true;
    const text = textRef.current?.value.trim() ?? "";
    if (text && text !== currentAnswer) return await save(text);
    return true;
  }
  async function prepareSubmit() { if (!expired && await flushCurrentText()) setConfirmSubmit(true); }

  if (load.kind === "loading") return <main className={styles.runner}><section className={styles.runnerPanel} data-surface="panel" aria-busy="true"><p role="status">Đang mở bài…</p><span className="glass-skeleton" /></section></main>;
  if (load.kind === "error") return <main className={styles.runner}><section className={styles.runnerPanel} data-surface="panel"><h1>Chưa thể mở bài</h1><p role="alert">{load.message}</p><Link className={styles.backLink} href="/learn">Nhập lại mã bài</Link></section></main>;
  if (!state) return null;
  if (!current) return <main className={styles.runner}><section className={styles.runnerPanel} data-surface="panel"><h1>Bài chưa có câu hỏi</h1><p>Thầy cô sẽ cập nhật bài này trước khi mở cho lớp.</p></section></main>;
  if (state.phase === "invalidated" || state.phase === "unavailable") return <main className={styles.runner}><section className={styles.runnerPanel} data-surface="panel"><h1>{state.phase === "invalidated" ? "Lượt làm đã được đặt lại" : "Bài hiện chưa mở"}</h1><p>{state.phase === "invalidated" ? "Thầy cô đã đổi mã hoặc đặt lại lượt làm. Bạn xin mã truy cập mới rồi vào lại nhé." : "Bài có thể chưa đến giờ mở, đã quá hạn hoặc đã được đóng. Bạn hỏi thầy cô để biết thêm."}</p><Link className={styles.backLink} href="/learn">Về trang nhập mã</Link></section></main>;
  if (state.phase === "submitted") return <main className={styles.runner}><section className={styles.runnerPanel} data-surface="panel"><h1>Đã nộp bài</h1>{state.result ? <p>Kết quả của bạn: <strong>{state.result.correct}/{state.result.total}</strong> câu đúng.{state.result.scorePoints !== undefined ? <> · <strong>{state.result.scorePoints}/{state.result.maxPoints}</strong> điểm.</> : null}</p> : <p>Thầy cô sẽ công bố kết quả sau khi đóng bài. Bạn không cần nộp lại.</p>}<p className={styles.privacy}>Thông tin của bạn không được hiển thị cho học sinh khác.</p></section></main>;

  const answered = state.questions.filter((question) => state.answers[String(question.index)] !== undefined).length;
  const firstUnanswered = state.questions.findIndex((question) => state.answers[String(question.index)] === undefined);
  const isMulti = current.kind === "multi";
  const selected = Array.isArray(currentAnswer) ? currentAnswer : [];
  async function navigate(next: number) { if (!expired && !(await flushCurrentText())) return; setPosition(next); setSaveMessage(null); }
  return <main className={styles.runner}><section className={styles.runnerHeader} data-surface="panel"><div><p className={styles.kicker}>Bài đang làm</p><h1>{state.title}</h1>{state.description ? <p>{state.description}</p> : null}</div><p><strong>{answered}/{state.questions.length}</strong> câu đã lưu</p>{state.deadlineAt && state.serverNow && <ExamCountdown deadline={state.deadlineAt} serverNow={state.serverNow} onExpire={() => { setExpiredAttempt(state.attemptId); const token = sessionStorage.getItem(tokenKey(normalizedCode)); if (token) void fetchState(token); }} />}</section><div className={styles.runnerLayout}><aside className={styles.questionNav} aria-label="Câu hỏi"><p>Tiến độ</p><ol>{state.questions.map((question, index) => <li key={question.index}><button type="button" aria-current={index === position ? "step" : undefined} data-answered={state.answers[String(question.index)] !== undefined || undefined} onClick={() => navigate(index)}>Câu {index + 1}</button></li>)}</ol>{firstUnanswered >= 0 ? <Button variant="secondary" onClick={() => navigate(firstUnanswered)}>Đến câu chưa trả lời</Button> : null}</aside><section className={styles.questionPanel} data-surface="panel" aria-labelledby={`${id}-question`}><div className={styles.questionHead}><span>Câu {position + 1}/{state.questions.length}</span>{current.sectionTitle && <span>{current.sectionTitle}</span>}{current.points !== undefined && <span>{current.points} điểm</span>}{current.timeLimitSeconds ? <span>{current.timeLimitSeconds} giây</span> : null}</div><h2 id={`${id}-question`}>{current.prompt}</h2>{current.kind === "short_text" ? <div className={styles.textAnswer}><label htmlFor={`${id}-text`}>Câu trả lời của bạn</label><textarea disabled={expired} key={current.index} ref={textRef} id={`${id}-text`} maxLength={200} rows={4} defaultValue={typeof currentAnswer === "string" ? currentAnswer : ""} /><Button variant="secondary" disabled={saving !== null || expired} onClick={() => { const answer = textRef.current?.value.trim(); if (answer) void save(answer); }}>{saving === current.index ? "Đang lưu…" : "Lưu câu trả lời"}</Button></div> : <div className={styles.answers} role="group" aria-label="Các đáp án">{current.options.map((option, index) => { const checked = isMulti ? selected.includes(index) : currentAnswer === index; return <button key={option} type="button" className={styles.answer} aria-pressed={checked} disabled={saving !== null || expired} onClick={() => { const next = isMulti ? (checked ? selected.filter((value) => value !== index) : [...selected, index]) : index; if (isMulti && (next as number[]).length === 0) return; void save(next); }}><span>{String.fromCharCode(65 + index)}</span>{option}</button>; })}</div>}{saveMessage ? <p role="status" className={saveMessage.startsWith("Đã") ? styles.saved : styles.error}>{saveMessage}</p> : null}<div className={styles.runnerActions}><Button variant="secondary" disabled={position === 0} onClick={() => navigate(position - 1)}>Câu trước</Button>{position < state.questions.length - 1 ? <Button variant="primary" onClick={() => navigate(position + 1)}>Câu tiếp</Button> : <Button variant="primary" disabled={saving !== null || expired} onClick={() => void prepareSubmit()}>Xem lại và nộp bài</Button>}</div></section></div><dialog ref={dialogRef} className={styles.confirmDialog} aria-labelledby={`${id}-submit-title`} onClose={() => setConfirmSubmit(false)} onClick={(event) => { if (event.target === event.currentTarget) setConfirmSubmit(false); }}><div><h2 id={`${id}-submit-title`}>Nộp bài?</h2><p>Bạn đã lưu {answered}/{state.questions.length} câu. Sau khi nộp, bạn không thể sửa câu trả lời.</p><div className={styles.runnerActions}><Button variant="secondary" autoFocus onClick={() => setConfirmSubmit(false)}>Quay lại làm tiếp</Button><Button variant="primary" disabled={saving !== null || expired} onClick={() => void submit()}>Nộp bài</Button></div></div></dialog></main>;
}
