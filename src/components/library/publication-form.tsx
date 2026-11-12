"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { WorkspaceFeedback } from "@/components/workspace-feedback";
import { GRADES, SUBJECTS, type GradeId, type SubjectId } from "@/lib/catalog";
import { listOwnPublications, resubmitPublication, submitPublication, withdrawPublication } from "@/lib/library/api";
import type { OwnPublication } from "@/lib/library/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./library.module.css";

function publicationStatus(status: OwnPublication["status"]) {
  if (status === "pending") return "Đang chờ duyệt";
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Cần chỉnh sửa";
  if (status === "hidden") return "Đã ẩn";
  return "Bản nháp";
}

export function PublicationForm({ quizId, title: quizTitle }: { quizId: string; title: string }) {
  const baseId = useId();
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(quizTitle);
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<SubjectId>("toan");
  const [grade, setGrade] = useState<GradeId>("6");
  const [items, setItems] = useState<OwnPublication[]>([]);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  async function reload() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const result = await listOwnPublications(supabase, quizId);
    if (result.ok) setItems(result.publications);
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    void listOwnPublications(supabase, quizId).then((result) => {
      if (!cancelled && result.ok) setItems(result.publications);
    });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  function requestConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) setConfirming(true);
  }

  async function submit() {
    const supabase = getBrowserSupabase();
    if (!supabase || pending) return;
    setPending(true);
    setMessage(null);
    const result = await submitPublication(supabase, { quizId, title, description, subject, grades: [grade] });
    setPending(false);
    setConfirming(false);
    setMessage(result.ok ? { text: "Đã gửi duyệt.", tone: "success" } : { text: result.message, tone: "error" });
    if (result.ok) await reload();
  }

  async function action(id: string, kind: "withdraw" | "resubmit") {
    const supabase = getBrowserSupabase();
    if (!supabase || pending) return;
    setPending(true);
    setMessage(null);
    const result = kind === "withdraw" ? await withdrawPublication(supabase, id) : await resubmitPublication(supabase, id);
    setPending(false);
    setMessage(result.ok
      ? { text: kind === "withdraw" ? "Đã thu hồi về bản nháp." : "Đã gửi duyệt lại.", tone: "success" }
      : { text: result.message, tone: "error" });
    if (result.ok) await reload();
  }

  return (
    <section className={styles.publication} data-surface="panel" aria-labelledby={`${baseId}-heading`}>
      <div>
        <p>Kho học liệu</p>
        <h2 id={`${baseId}-heading`}>Gửi vào kho học liệu</h2>
        <span>Quiz chỉ xuất hiện công khai sau khi được duyệt.</span>
      </div>
      <form className={styles.publicationForm} onSubmit={requestConfirmation}>
        <label htmlFor={`${baseId}-title`}>Tiêu đề học liệu</label>
        <input id={`${baseId}-title`} value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} required />
        <label htmlFor={`${baseId}-description`}>Mô tả (không bắt buộc)</label>
        <textarea id={`${baseId}-description`} value={description} maxLength={1000} rows={3} onChange={(event) => setDescription(event.target.value)} />
        <label htmlFor={`${baseId}-subject`}>Môn</label>
        <select id={`${baseId}-subject`} value={subject} onChange={(event) => setSubject(event.target.value as SubjectId)}>
          {SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <label htmlFor={`${baseId}-grade`}>Khối lớp</label>
        <select id={`${baseId}-grade`} value={grade} onChange={(event) => setGrade(event.target.value as GradeId)}>
          {GRADES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <div className={styles.publicationSubmit}><Button type="submit" variant="secondary" disabled={pending}>Xem lại trước khi gửi</Button></div>
      </form>
      {items.length > 0 ? <ul className={styles.publicationList}>{items.map((item) => <li key={item.id}><div><strong>{publicationStatus(item.status)}</strong><p>{item.title}</p>{item.reviewReason ? <p>Lý do: {item.reviewReason}</p> : null}</div><div className={styles.publicationActions}>{item.status === "pending" ? <Button variant="secondary" disabled={pending} onClick={() => void action(item.id, "withdraw")}>Thu hồi</Button> : null}{item.status === "draft" || item.status === "rejected" ? <Button variant="secondary" disabled={pending} onClick={() => void action(item.id, "resubmit")}>Gửi duyệt lại</Button> : null}</div></li>)}</ul> : null}
      <WorkspaceFeedback tone={message?.tone ?? "success"}>{message?.text}</WorkspaceFeedback>
      <dialog ref={confirmDialogRef} data-work-dialog className={styles.confirmDialog} aria-labelledby={`${baseId}-confirm-heading`} onClose={() => setConfirming(false)} onClick={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}>
        <div>
          <h2 id={`${baseId}-confirm-heading`}>Xác nhận gửi duyệt</h2>
          <p>Thầy cô kiểm tra lại thông tin trước khi gửi. Có thể thu hồi khi đang chờ duyệt.</p>
          <dl className={styles.publicationSummary}>
            <div><dt>Tiêu đề</dt><dd>{title || "Chưa nhập"}</dd></div>
            <div><dt>Môn · khối</dt><dd>{SUBJECTS.find((item) => item.id === subject)?.label} · Lớp {grade}</dd></div>
            {description ? <div><dt>Mô tả</dt><dd>{description}</dd></div> : null}
          </dl>
          <div className={styles.publicationActions}>
            <Button variant="secondary" autoFocus onClick={() => setConfirming(false)}>Quay lại</Button>
            <Button variant="primary" data-pending-action aria-busy={pending || undefined} disabled={pending} onClick={() => void submit()}>{pending ? "Đang gửi…" : "Gửi duyệt"}</Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
