"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button, ButtonLink } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { createAssignment } from "@/lib/assignments/api";
import { listClasses, type ClassSummary } from "@/lib/classes/api";
import { listQuizzes } from "@/lib/quiz/api";
import type { QuizSummary } from "@/lib/quiz/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { adminRequest } from "@/lib/admin/client";
import type { ExamDetail } from "@/lib/exams/types";
import styles from "./assignments.module.css";

type Resources = { classes: ClassSummary[]; quizzes: QuizSummary[] };

function toIso(value: string) { return value ? new Date(value).toISOString() : null; }

export function AssignmentCompose() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const baseId = useId();
  const [resources, setResources] = useState<Resources | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [classId, setClassId] = useState(params.get("class") ?? "");
  const [quizId, setQuizId] = useState(params.get("quiz") ?? "");
  const examId = params.get("exam");
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const requestRef = useState(() => crypto.randomUUID())[0];
  const [title, setTitle] = useState("");
  useEffect(() => { if (!examId) return; let live = true; adminRequest<ExamDetail>(`/api/exams/${examId}`).then(value => { if(live) { setExam(value); setTitle(value.title); } }).catch(e => { if(live) setError(e.message); }); return () => { live = false; }; }, [examId]);
  const [description, setDescription] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [revealPolicy, setRevealPolicy] = useState<"immediate" | "after_close">("after_close");

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    void Promise.all([listClasses(supabase), listQuizzes(supabase)]).then(([classes, quizzes]) => {
      if (cancelled) return;
      if (!classes.ok) { setError(classes.message); return; }
      if (!quizzes.ok) { setError(quizzes.message); return; }
      setResources({ classes: classes.classes, quizzes: quizzes.quizzes });
      if (!classId && classes.classes.length === 1) setClassId(classes.classes[0].id);
      if (!quizId && quizzes.quizzes.length === 1) setQuizId(quizzes.quizzes[0].id);
    });
    return () => { cancelled = true; };
  }, [classId, quizId, user?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || submitting) return;
    setError(null);
    setSubmitting(true);
    let result;
    if (examId && exam) {
      const r = await supabase.rpc("create_exam_assignment", { p_exam: examId, p_revision: exam.revision, p_class: classId, p_title: title, p_description: description, p_opens_at: toIso(opensAt), p_due_at: toIso(dueAt), p_reveal_policy: revealPolicy, p_request: requestRef });
      result = r.error ? { ok: false as const, message: r.error.code === "PT402" ? "Cần Premium để phát hành kiểm tra online." : r.error.code === "PT409" ? "Đề đã thay đổi. Thầy cô tải lại trước khi giao." : "Chưa tạo được bài kiểm tra. Kiểm tra đề, lớp và thời gian rồi thử lại." } : { ok: true as const, id: r.data as string };
    } else result = await createAssignment(supabase, { classId, quizId, title, description, opensAt: toIso(opensAt), dueAt: toIso(dueAt), revealPolicy });
    setSubmitting(false);
    if (!result.ok) { setError(result.message); return; }
    router.replace(`/assignments/${result.id}?review=1`);
  }

  if (resources === null) return <div className={styles.skeleton} aria-busy="true"><p className="visually-hidden" role="status">Đang tải lớp và quiz…</p><span className="glass-skeleton" /><span className="glass-skeleton" /></div>;
  if (examId && !exam) return <section className={styles.page}>{error ? <p role="alert">{error}</p> : <p role="status">Đang tải đề kiểm tra…</p>}</section>;
  if (resources.classes.length === 0 || (!examId && resources.quizzes.length === 0)) {
    return <section className={styles.empty} data-surface="panel"><h1>Chưa đủ dữ liệu để giao bài</h1><p>Thầy cô cần có ít nhất một lớp có học sinh và một quiz hoàn chỉnh trước khi tạo bài.</p><div className={styles.actions}><ButtonLink href="/my-classes" variant="secondary">Tạo lớp</ButtonLink><ButtonLink href="/my-quizzes" variant="primary">Soạn quiz</ButtonLink></div></section>;
  }

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: "Bài đã giao", href: "/assignments" }, { label: "Tạo bài giao" }]} />
      <header className={styles.header}><div><h1>Tạo bài giao</h1><p>Lưu thành bản nháp trước. Thầy cô sẽ kiểm tra lại thông tin và phát hành ở bước tiếp theo.</p></div></header>
      <form className={styles.formPanel} data-surface="panel" onSubmit={submit}>
        <div className={styles.formGrid}>
          <label htmlFor={`${baseId}-class`}>Lớp
            <select id={`${baseId}-class`} required value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">Chọn lớp</option>{resources.classes.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.studentCount} học sinh)</option>)}
            </select>
          </label>
          {!examId && <label htmlFor={`${baseId}-quiz`}>Quiz
            <select id={`${baseId}-quiz`} required value={quizId} onChange={(event) => setQuizId(event.target.value)}>
              <option value="">Chọn quiz</option>{resources.quizzes.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.questionCount} câu)</option>)}
            </select>
          </label>}
          {exam && <p>Đề: {exam.title} · {exam.document.durationMinutes} phút toàn bài · phiên bản {exam.revision}</p>}
          <label className={styles.wide} htmlFor={`${baseId}-title`}>Tên bài giao
            <input id={`${baseId}-title`} required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Ôn tập chương 1" />
          </label>
          <label className={styles.wide} htmlFor={`${baseId}-description`}>Lời nhắn cho học sinh (không bắt buộc)
            <textarea id={`${baseId}-description`} maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label htmlFor={`${baseId}-opens`}>Mở bài (không bắt buộc)<input id={`${baseId}-opens`} type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} /></label>
          <label htmlFor={`${baseId}-due`}>Hạn nộp (không bắt buộc)<input id={`${baseId}-due`} type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        </div>
        <fieldset className={styles.policy}><legend>Công bố kết quả</legend><label><input type="radio" name="reveal" checked={revealPolicy === "after_close"} onChange={() => setRevealPolicy("after_close")} /> Sau khi thầy cô đóng bài</label><label><input type="radio" name="reveal" checked={revealPolicy === "immediate"} onChange={() => setRevealPolicy("immediate")} /> Ngay sau khi học sinh nộp</label></fieldset>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <div className={styles.actions}><Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Đang lưu…" : "Lưu bản nháp để kiểm tra"}</Button><ButtonLink href="/assignments" variant="secondary">Huỷ</ButtonLink></div>
      </form>
    </div>
  );
}
