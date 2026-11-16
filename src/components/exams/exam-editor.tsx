"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { useLocalDraft } from "@/components/drafts/use-local-draft";
import { adminRequest } from "@/lib/admin/client";
import { draftKey, readDraft, removeDraft, type DraftRecord } from "@/lib/drafts/storage";
import { emptyExam, emptyQuestion, type ExamDetail, type ExamForm, type ExamQuestion } from "@/lib/exams/types";
import { examIssues } from "@/lib/exams/validation";
import { KIND_LABELS, QUESTION_KINDS, type QuestionKind } from "@/lib/quiz/types";
import styles from "./exams.module.css";

export function ExamWorkspace({ examId }: { examId: string }) {
  const { user, status } = useAuth();
  if (!user || status !== "signed-in") return <p role="status">Đang xác minh tài khoản…</p>;
  return <OwnerExamWorkspace key={`${user.id}:${examId}`} examId={examId} />;
}
function OwnerExamWorkspace({ examId }: { examId: string }) {
  const { user, status } = useAuth();
  const [loaded, setLoaded] = useState<{ owner: string; initial: ExamDetail; draft: DraftRecord<ExamForm> | null } | null>(null);
  const [restored, setRestored] = useState<DraftRecord<ExamForm> | null>(null);
  const [hidden, setHidden] = useState(false);
  const editorDirty = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user || status !== "signed-in") return;
    let live = true;
    (async () => {
      try {
        const initial: ExamDetail = examId === "new" ? { ...emptyExam(), id: "new", revision: 0, updatedAt: "" } : await adminRequest(`/api/exams/${examId}`);
        let draft: DraftRecord<ExamForm> | null = null;
        try { draft = await readDraft<ExamForm>(draftKey(user.id, "exam", examId)); if (draft && examIssues({ ...draft.payload, title: draft.payload.title || "Nháp" }).length) { draft = null; if(live) setError("Không đọc được định dạng nháp cũ."); } } catch { if(live) setError("Không đọc được kho nháp. Thầy cô vẫn có thể soạn và lưu vào tài khoản."); }
        if (live) setLoaded({ owner: user.id, initial, draft });
      } catch(e) { if(live) setError(e instanceof Error ? e.message : "Chưa tải được đề."); }
    })();
    return () => { live = false; };
  }, [examId, user, status]);
  if (!loaded || loaded.owner !== user?.id || status !== "signed-in") return <section className={styles.page}>{error ? <p role="alert">{error}</p> : <p role="status">Đang tải đề…</p>}</section>;
  return <>{error && <p role="alert">{error}</p>}{loaded.draft && !hidden && <section className={styles.notice} aria-label="Khôi phục nháp đề">{loaded.draft.baseline !== JSON.stringify(loaded.initial) && <p role="alert">Đề trên tài khoản đã thay đổi từ lúc lưu nháp. Khôi phục chỉ đưa nháp vào form để đối chiếu; chưa ghi đè bản đã lưu.</p>}<p>Có nháp trên trình duyệt lúc {new Date(loaded.draft.savedAt).toLocaleString("vi-VN")}. Khôi phục để đối chiếu trước khi lưu vào tài khoản.</p><div className={styles.actions}><Button onClick={() => { if (editorDirty.current && !window.confirm("Khôi phục sẽ thay nội dung đang sửa trong form. Thầy cô tiếp tục?")) return; setRestored(loaded.draft); setHidden(true); }}>Khôi phục nháp đề</Button><Button onClick={async () => { try { await removeDraft(loaded.draft!.key, loaded.draft!.revision); setHidden(true); } catch { setError("Nháp đã đổi ở tab khác. Thầy cô tải lại để đối chiếu."); } }}>Bỏ nháp</Button></div></section>}
    <ExamEditor key={`${loaded.initial.id}:${restored?.revision ?? "server"}`} initial={loaded.initial} restored={restored} onDirtyChange={value => { editorDirty.current = value; }} />
  </>;
}

export function ExamEditor({ initial, restored, saveLabel = "Lưu đề", onCommit, canCommit = true, localDraftId, onDirtyChange }: { initial: ExamDetail; restored: DraftRecord<ExamForm> | null; saveLabel?: string; onCommit?: (form: ExamForm) => Promise<{ id: string; revision?: number }>; canCommit?: boolean; localDraftId?: string; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  const [form, setForm] = useState<ExamForm>(restored?.payload ?? { title: initial.title, description: initial.description, document: initial.document });
  const [saved, setSaved] = useState(JSON.stringify({ title: initial.title, description: initial.description, document: initial.document }));
  const [revision, setRevision] = useState(initial.revision);
  const [tab, setTab] = useState<"structure" | "question" | "settings">("question");
  const [active, setActive] = useState<string | null>(form.document.sections[0]?.questions[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef<string | null>(null);
  const draft = useLocalDraft({ entity: "exam", entityId: localDraftId ?? initial.id, target: null, baseline: JSON.stringify(initial), payload: form, dirty: JSON.stringify(form) !== saved, initialRevision: restored?.revision ?? null });
  useEffect(() => { onDirtyChange?.(JSON.stringify(form) !== saved); }, [form, saved, onDirtyChange]);
  const sections = form.document.sections;
  const flat = sections.flatMap(s => s.questions);
  const section = sections.find(s => s.questions.some(q => q.id === active));
  const question = section?.questions.find(q => q.id === active);
  const problems = examIssues(form, true);
  const total = flat.reduce((n, q) => n + (q.pointUnits ?? 0), 0) / 100;
  function patchQuestion(patch: Partial<ExamQuestion>) { setForm(old => ({ ...old, document: { ...old.document, sections: old.document.sections.map(s => ({ ...s, questions: s.questions.map(q => q.id === active ? { ...q, ...patch } : q) })) } })); }
  function changeSection(id: string, title: string) { setForm(old => ({ ...old, document: { ...old.document, sections: old.document.sections.map(s => s.id === id ? { ...s, title } : s) } })); }
  function addSection() { const id = crypto.randomUUID(); setForm(old => ({ ...old, document: { ...old.document, sections: [...old.document.sections, { id, title: `Phần ${old.document.sections.length + 1}`, questions: [] }] } })); }
  function addQuestion(id: string, kind: QuestionKind = "single") { const q = emptyQuestion(kind); setForm(old => ({ ...old, document: { ...old.document, sections: old.document.sections.map(s => s.id === id ? { ...s, questions: [...s.questions, q] } : s) } })); setActive(q.id); setTab("question"); }
  function moveQuestion(id: string, delta: number) { setForm(old => ({ ...old, document: { ...old.document, sections: old.document.sections.map(s => { const index = s.questions.findIndex(q => q.id === id), next = index + delta; if(index < 0 || next < 0 || next >= s.questions.length) return s; const questions = [...s.questions]; [questions[index], questions[next]] = [questions[next], questions[index]]; return { ...s, questions }; }) } })); }
  async function save() {
    if (busy || !canCommit) return;
    const invalid = examIssues(form);
    if (invalid.length) { setError(invalid.map(i => `${i.path}: ${i.message}`).join(" ")); return; }
    setBusy(true); setError(null); setNotice(null);
    requestRef.current ??= crypto.randomUUID(); const snapshot = structuredClone(form);
    try {
      const result = onCommit ? await onCommit(snapshot) : await adminRequest<ExamDetail>(initial.id === "new" ? "/api/exams" : `/api/exams/${initial.id}`, { ...snapshot, requestId: requestRef.current, revision }, initial.id === "new" ? "POST" : "PATCH");
      await draft.clearSaved(snapshot); setSaved(JSON.stringify(snapshot)); setRevision(result.revision ?? revision); setNotice("Đã lưu đề vào tài khoản.");
      if (initial.id === "new") router.replace(`/my-exams/${result.id}`);
    } catch(e) { setError(e instanceof Error ? e.message : "Chưa lưu được đề. Nháp vẫn được giữ."); } finally { setBusy(false); }
  }
  return <section className={styles.page}>
    <header className={styles.header}><h1>{saveLabel === "Lưu đề" ? initial.id === "new" ? "Soạn đề mới" : "Soạn đề kiểm tra" : "Kiểm tra câu hỏi đã nhập"}</h1><div className={styles.actions}><ButtonLink href="/my-exams">Danh sách đề</ButtonLink><Button variant="primary" disabled={busy || !canCommit} onClick={() => void save()} aria-busy={busy}>{busy ? "Đang lưu…" : saveLabel !== "Lưu đề" && problems.length > 0 ? "Lưu nháp đề cần sửa" : saveLabel}</Button></div></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{draft.message && <p role="status">{draft.message}</p>}
    <fieldset className={styles.fields} disabled={busy}><legend className="visually-hidden">Nội dung đề kiểm tra</legend>
      <label className={styles.field}>Tên đề<input maxLength={100} value={form.title} onChange={e => setForm(old => ({ ...old, title: e.target.value }))} /></label>
      <label className={styles.field}>Mô tả<textarea aria-label="Mô tả" maxLength={1000} value={form.description} onChange={e => setForm(old => ({ ...old, description: e.target.value }))} /></label>
      <nav className={styles.tabControls} aria-label="Vùng soạn đề">{([["structure", "Cấu trúc"], ["question", "Câu hỏi"], ["settings", "Thiết lập"]] as const).map(([value, label]) => <Button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</Button>)}</nav><div className={styles.workspace} data-current={tab}>
        <aside className={styles.panel} data-panel="structure" aria-label="Cấu trúc đề"><h2>Cấu trúc ({flat.length}/50 câu)</h2>{sections.map(s => <section className={styles.fields} key={s.id}><label className={styles.field}>Tên phần<input maxLength={100} value={s.title} onChange={e => changeSection(s.id, e.target.value)} /></label><div className={styles.questionNav}>{s.questions.map((q, i) => <div key={q.id}><Button className={active === q.id ? styles.selected : undefined} aria-pressed={active === q.id} onClick={() => { setActive(q.id); setTab("question"); }}>Câu {i + 1}: {q.prompt.slice(0, 45) || "Chưa có nội dung"}</Button><div className={styles.actions}><Button aria-label={`Đưa câu ${i + 1} của ${s.title} lên`} disabled={i === 0} onClick={() => moveQuestion(q.id, -1)}>↑</Button><Button aria-label={`Đưa câu ${i + 1} của ${s.title} xuống`} disabled={i === s.questions.length - 1} onClick={() => moveQuestion(q.id, 1)}>↓</Button></div></div>)}</div><Button disabled={flat.length >= 50} onClick={() => addQuestion(s.id)}>Thêm câu vào {s.title || "phần"}</Button><Button onClick={() => { if(window.confirm("Xóa phần và các câu trong phần này?")) setForm(old => ({ ...old, document: { ...old.document, sections: old.document.sections.filter(x => x.id !== s.id) } })); }}>Xóa phần</Button></section>)}<Button disabled={sections.length >= 10} onClick={addSection}>Thêm phần</Button></aside>
        <section className={styles.panel} data-panel="question" aria-label="Nội dung câu hỏi"><h2>{question ? "Sửa câu hỏi" : "Chọn câu để soạn"}</h2>{!question ? <p>Thêm phần và câu hỏi ở mục Cấu trúc để bắt đầu.</p> : <>
          <label className={styles.field}>Loại câu<select value={question.kind} onChange={e => { const next = emptyQuestion(e.target.value as QuestionKind); patchQuestion({ ...next, id: question.id, prompt: question.prompt, pointUnits: question.pointUnits }); }}>{QUESTION_KINDS.map(kind => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}</select></label>
          <label className={styles.field}>Câu hỏi<textarea aria-label="Câu hỏi" maxLength={500} value={question.prompt} onChange={e => patchQuestion({ prompt: e.target.value })} /></label>
          <label className={styles.field}>Điểm câu hỏi<input type="number" min="0.01" max="100" step="0.01" value={question.pointUnits === null ? "" : question.pointUnits / 100} onChange={e => patchQuestion({ pointUnits: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) })} /></label>
          {question.kind === "short_text" ? <><label className={styles.field}>Đáp án chấp nhận (mỗi dòng một đáp án)<textarea aria-label="Đáp án chấp nhận (mỗi dòng một đáp án)" maxLength={1010} value={question.accepted_answers.join("\n")} onChange={e => patchQuestion({ accepted_answers: e.target.value.split("\n") })} /></label><label><input type="checkbox" checked={question.ignore_diacritics} onChange={e => patchQuestion({ ignore_diacritics: e.target.checked })} /> Bỏ qua dấu tiếng Việt khi chấm</label></> : <div className={styles.options}>{question.options.map((o, i) => <div className={styles.option} key={i}><label><input type="checkbox" aria-label={`${String.fromCharCode(65 + i)} là đáp án đúng`} checked={o.is_correct} onChange={e => patchQuestion({ options: question.options.map((x, j) => ({ ...x, is_correct: question.kind === "multi" ? (j === i ? e.target.checked : x.is_correct) : j === i && e.target.checked })) })} />{String.fromCharCode(65 + i)}</label><label className={styles.field}><span className="visually-hidden">Lựa chọn {String.fromCharCode(65 + i)}</span><input maxLength={150} readOnly={question.kind === "true_false"} value={o.label} onChange={e => patchQuestion({ options: question.options.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} /></label></div>)}{question.kind !== "true_false" && <div className={styles.actions}><Button disabled={question.options.length >= 6} onClick={() => patchQuestion({ options: [...question.options, { label: "", is_correct: false }] })}>Thêm lựa chọn</Button><Button disabled={question.options.length <= 2} onClick={() => patchQuestion({ options: question.options.slice(0, -1) })}>Bớt lựa chọn cuối</Button></div>}</div>}
          <Button onClick={() => { if(window.confirm("Xóa câu hỏi đang soạn?")) setForm(old => ({ ...old, document: { ...old.document, sections: old.document.sections.map(s => ({ ...s, questions: s.questions.filter(q => q.id !== active) })) } })); }}>Xóa câu hỏi</Button>
        </>}</section>
        <aside className={styles.panel} data-panel="settings" aria-label="Thiết lập đề"><h2>Thiết lập</h2><label className={styles.field}>Thời lượng toàn bài (phút)<input type="number" min="1" max="180" step="1" value={form.document.durationMinutes} onChange={e => setForm(old => ({ ...old, document: { ...old.document, durationMinutes: Number(e.target.value) } }))} /></label><p>Tổng điểm: <strong>{total.toLocaleString("vi-VN")}</strong></p><p>Nháp chưa đủ đáp án vẫn lưu được. Xuất đề và phát hành cần nội dung hợp lệ.</p>{problems.length > 0 && <ul className={styles.issues}>{problems.slice(0, 8).map((issue, i) => <li key={i}>{issue.path}: {issue.message}</li>)}</ul>}
          {initial.id !== "new" && <div className={styles.fields}><p>Xuất bản đã lưu (phiên bản {revision}). Lưu thay đổi trước khi tải.</p>{(["docx", "pdf"] as const).map(format => <div className={styles.actions} key={format}><a href={`/api/exams/${initial.id}/export?format=${format}&audience=student&revision=${revision}`}>Đề {format.toUpperCase()}</a><a href={`/api/exams/${initial.id}/export?format=${format}&audience=teacher&revision=${revision}`}>Đáp án {format.toUpperCase()}</a></div>)}<ButtonLink href={`/assignments/new?exam=${initial.id}`}>Phát hành kiểm tra online · Premium</ButtonLink></div>}
        </aside>
      </div>
    </fieldset>
  </section>;
}
