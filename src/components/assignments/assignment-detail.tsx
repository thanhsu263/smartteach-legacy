"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button, ButtonLink } from "@/components/button";
import { QrCode } from "@/components/qr-code";
import {
  closeAssignment,
  deleteAssignment,
  getAssignmentDetail,
  getAssignmentAttemptDetail,
  getAssignmentProgress,
  getAssignmentQuestionAnalytics,
  getAssignmentRoster,
  issueStudentCredential,
  publishAssignment,
  resetAssignmentAttempt,
  revokeStudentCredential,
} from "@/lib/assignments/api";
import type { AssignmentAttemptDetail, AssignmentDetail as AssignmentDetailType, AssignmentProgress, AssignmentQuestionAnalytics, AssignmentRosterEntry, IssuedCredential } from "@/lib/assignments/types";
import { getClass, type Student } from "@/lib/classes/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/export/csv";
import { assignmentResultsCsv } from "@/lib/export/results-csv";
import styles from "./assignments.module.css";

type LoadState = { detail: AssignmentDetailType; progress: AssignmentProgress; questions: AssignmentQuestionAnalytics[]; roster: AssignmentRosterEntry[]; students: Student[] };
type Confirmation = { kind: "publish" | "close" | "delete" | "reset" | "revoke"; student?: AssignmentRosterEntry | Student } | null;

function displayDate(value: string | null) {
  if (!value) return "Không đặt";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Chưa xác định" : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function attemptLabel(item: AssignmentRosterEntry) {
  if (!item.attemptStatus) return "Chưa bắt đầu";
  if (item.attemptStatus === "in_progress") return "Đang làm";
  if (item.attemptStatus === "submitted") return "Đã nộp";
  return "Đã đặt lại";
}

function rosterStudentId(student: AssignmentRosterEntry | Student) {
  return "studentId" in student ? student.studentId : student.id;
}

export function AssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const baseId = useId();
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(params.get("review") === "1" ? "Bản nháp đã được lưu. Kiểm tra lớp, quiz và thời gian trước khi phát hành." : null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, IssuedCredential>>({});
  const [confirming, setConfirming] = useState<Confirmation>(null);
  const [attemptDetail, setAttemptDetail] = useState<AssignmentAttemptDetail | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [exporting, setExporting] = useState(false);
  async function exportResults() {
    const db = getBrowserSupabase();
    if (!db || exporting) return;
    setExporting(true); setError(null);
    try {
      const [detail, roster] = await Promise.all([getAssignmentDetail(db, assignmentId), getAssignmentRoster(db, assignmentId)]);
      if (!detail.ok) { setError(detail.message); return; }
      if (!roster.ok) { setError(roster.message); return; }
      downloadCsv(`bai-giao-${assignmentId}.csv`, assignmentResultsCsv(detail.assignment, roster.roster));
    } catch { setError("Chưa thể xuất kết quả. Thầy cô thử lại nhé."); }
    finally { setExporting(false); }
  }

  function reload() { setLoaded(null); setError(null); setReloadKey((value) => value + 1); }

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    void getAssignmentDetail(supabase, assignmentId).then(async (detail) => {
      if (!detail.ok) { if (!cancelled) setError(detail.message); return; }
      const [progress, questions, roster, classroom] = await Promise.all([
        getAssignmentProgress(supabase, assignmentId),
        getAssignmentQuestionAnalytics(supabase, assignmentId),
        getAssignmentRoster(supabase, assignmentId),
        getClass(supabase, detail.assignment.classId),
      ]);
      if (cancelled) return;
      if (!progress.ok) { setError(progress.message); return; }
      if (!questions.ok) { setError(questions.message); return; }
      if (!roster.ok) { setError(roster.message); return; }
      if (!classroom.ok || !classroom.found) { setError(classroom.ok ? "Không tìm thấy lớp của bài giao này." : classroom.message); return; }
      setLoaded({ detail: detail.assignment, progress: progress.progress, questions: questions.questions, roster: roster.roster, students: classroom.students });
    });
    return () => { cancelled = true; };
  }, [assignmentId, reloadKey]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  async function confirmAction() {
    const supabase = getBrowserSupabase();
    if (!supabase || !confirming || busy || !loaded) return;
    setBusy(true);
    let result: { ok: boolean; message?: string };
    if (confirming.kind === "publish") result = await publishAssignment(supabase, assignmentId);
    else if (confirming.kind === "close") result = await closeAssignment(supabase, assignmentId);
    else if (confirming.kind === "delete") result = await deleteAssignment(supabase, assignmentId);
    else if (confirming.kind === "reset" && confirming.student) result = await resetAssignmentAttempt(supabase, assignmentId, rosterStudentId(confirming.student));
    else if (confirming.kind === "revoke" && confirming.student) result = await revokeStudentCredential(supabase, rosterStudentId(confirming.student));
    else result = { ok: false, message: "Không thực hiện được thao tác này." };
    setBusy(false);
    setConfirming(null);
    if (!result.ok) { setError(result.message ?? "Không thực hiện được thao tác này."); return; }
    if (confirming.kind === "delete") { router.replace("/assignments"); return; }
    setNotice(confirming.kind === "publish" ? "Bài đã được phát hành." : confirming.kind === "close" ? "Bài đã được đóng." : confirming.kind === "reset" ? "Lượt làm bài đã được đặt lại." : "Mã truy cập của học sinh đã bị thu hồi.");
    reload();
  }

  async function issue(student: Student) {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const result = await issueStudentCredential(supabase, student.id);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setCredentials((current) => ({ ...current, [student.id]: result.credential }));
    setNotice(`Đã tạo mã truy cập mới cho ${student.name}. Mã cũ (nếu có) không còn dùng được.`);
  }

  async function inspectAttempt(student: AssignmentRosterEntry) {
    const supabase = getBrowserSupabase();
    if (!supabase || loadingAttempt) return;
    setLoadingAttempt(student.studentId);
    const result = await getAssignmentAttemptDetail(supabase, assignmentId, student.studentId);
    setLoadingAttempt(null);
    if (!result.ok) { setError(result.message); return; }
    setAttemptDetail(result.attempt);
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice("Đã sao chép thông tin truy cập."); }
    catch { setNotice("Trình duyệt chưa cho phép sao chép. Thầy cô có thể đọc hoặc quét mã QR ở bên dưới."); }
  }

  if (loaded === null && !error) return <div className={styles.skeleton} aria-busy="true"><p className="visually-hidden" role="status">Đang tải bài giao…</p><span className="glass-skeleton" /><span className="glass-skeleton" /><span className="glass-skeleton" /></div>;
  if (error || !loaded) return <section className={styles.empty} data-surface="panel"><h1>Không mở được bài giao</h1><p role="alert">{error ?? "Đã có lỗi không xác định."}</p><div className={styles.actions}><Button variant="secondary" onClick={reload}>Thử lại</Button><ButtonLink href="/assignments" variant="secondary">Về danh sách</ButtonLink></div></section>;

  const { detail, progress, questions, roster, students } = loaded;
  const rosterById = new Map(roster.map((item) => [item.studentId, item]));
  const studentLink = typeof window === "undefined" ? "" : (credential: string) => `${window.location.origin}/learn/${detail.publicCode}#credential=${credential}`;
  const confirmationText = confirming?.kind === "publish" ? "Phát hành bài này cho cả lớp? Sau khi phát hành, quiz snapshot không thể sửa." : confirming?.kind === "close" ? "Đóng bài ngay bây giờ? Học sinh sẽ không thể tiếp tục hoặc bắt đầu bài." : confirming?.kind === "delete" ? "Xoá bản nháp này? Thao tác này không thể hoàn tác." : confirming?.kind === "reset" ? `Đặt lại lượt làm của ${confirming.student?.name}? Bài đã nộp cũng sẽ được đặt lại.` : `Thu hồi mã truy cập của ${confirming?.student?.name}? Học sinh sẽ cần mã mới để vào bài.`;

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: "Bài đã giao", href: "/assignments" }, { label: detail.title }]} />
      <header className={styles.header}>
        <div><p className={styles.kicker}>{detail.className} · {detail.status === "draft" ? "Bản nháp" : detail.status === "published" ? "Đang giao" : "Đã đóng"}</p><h1>{detail.title}</h1>{detail.description ? <p>{detail.description}</p> : null}</div>
        <div className={styles.actions}>
          <Button disabled={exporting || loaded.roster.length === 0} aria-busy={exporting} onClick={() => void exportResults()}>{exporting ? "Đang xuất…" : "Xuất kết quả CSV"}</Button>
          {detail.status === "draft" ? <Button variant="primary" onClick={() => setConfirming({ kind: "publish" })}>Phát hành bài</Button> : null}
          {detail.status === "published" ? <Button variant="secondary" onClick={() => setConfirming({ kind: "close" })}>Đóng bài</Button> : null}
          {detail.status === "draft" ? <Button variant="secondary" onClick={() => setConfirming({ kind: "delete" })}>Xoá bản nháp</Button> : null}
        </div>
      </header>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <section className={styles.summaryGrid} aria-label="Tiến độ lớp">
        <div data-surface="panel"><strong>{progress.notStarted}</strong><span>Chưa bắt đầu</span></div><div data-surface="panel"><strong>{progress.inProgress}</strong><span>Đang làm</span></div><div data-surface="panel"><strong>{progress.submitted}</strong><span>Đã nộp</span></div>
      </section>

      <section className={styles.analyticsPanel} data-surface="panel" aria-labelledby={`${baseId}-analytics`}>
        <div className={styles.sectionHeading}><div><h2 id={`${baseId}-analytics`}>Phân tích theo câu</h2><p>Tỷ lệ đúng chỉ tính câu đã được hệ thống chấm; số chưa trả lời tính theo toàn bộ sĩ số lớp.</p></div></div>
        <ol className={styles.questionAnalytics}>{questions.map((question) => { const rate = question.answered ? Math.round((question.correct / question.answered) * 100) : 0; return <li key={question.position}><strong>Câu {question.position + 1}</strong><span>{question.correct}/{question.answered} đúng ({rate}%)</span><span>{question.unanswered} chưa trả lời</span></li>; })}</ol>
      </section>

      <section className={styles.detailGrid}>
        <div className={styles.infoPanel} data-surface="panel"><h2>Thông tin bài</h2><dl><div><dt>Mã bài</dt><dd><code>{detail.publicCode}</code></dd></div><div><dt>Mở bài</dt><dd>{displayDate(detail.opensAt)}</dd></div><div><dt>Hạn nộp</dt><dd>{displayDate(detail.dueAt)}</dd></div><div><dt>Kết quả</dt><dd>{detail.revealPolicy === "immediate" ? "Hiện ngay sau khi nộp" : "Hiện sau khi thầy cô đóng bài"}</dd></div><div><dt>Câu hỏi</dt><dd>{detail.snapshot.questions.length} câu</dd></div></dl></div>
        <div className={styles.infoPanel} data-surface="panel"><h2>Chia sẻ an toàn</h2><p>Học sinh vào <Link href="/learn">SmartTeach / Làm bài</Link>, nhập mã bài và mã truy cập riêng. Mỗi mã chỉ cấp cho một học sinh; có thể đổi hoặc thu hồi bên dưới.</p><p className={styles.hint}>Không gửi mã truy cập qua nhóm công khai. Khi đổi mã, lượt đang làm sẽ bị dừng để bảo vệ bài.</p></div>
      </section>

      <section className={styles.rosterPanel} data-surface="panel" aria-labelledby={`${baseId}-roster`}>
        <div className={styles.sectionHeading}><div><h2 id={`${baseId}-roster`}>Danh sách lớp</h2><p>Chọn từng bạn để tạo thẻ truy cập, theo dõi trạng thái và đặt lại lượt làm khi cần.</p></div></div>
        {students.length === 0 ? <p className={styles.hint}>Lớp hiện chưa có học sinh.</p> : <ul className={styles.roster}>
          {students.map((student) => {
            const result = rosterById.get(student.id);
            const credential = credentials[student.id];
            const shareUrl = credential && typeof studentLink === "function" ? studentLink(credential.credential) : "";
            return <li key={student.id} className={styles.rosterRow}>
              <div><strong>{student.name}</strong><span className={styles.assignmentMeta}>{result ? attemptLabel(result) : "Chưa bắt đầu"}{result?.scorePoints !== null && result?.scorePoints !== undefined ? ` · ${result.scorePoints}/${result.maxPoints} điểm` : result?.score !== null && result?.score !== undefined ? ` · ${result.score}/${result.total}` : ""}</span></div>
              <div className={styles.rosterActions}>
                <Button variant="secondary" disabled={busy} onClick={() => issue(student)}>{credential ? "Đổi mã" : "Tạo mã"}</Button>
                {result && result.attemptStatus ? <><Button variant="secondary" disabled={loadingAttempt === result.studentId} onClick={() => void inspectAttempt(result)}>{loadingAttempt === result.studentId ? "Đang mở…" : "Xem chi tiết"}</Button><Button variant="secondary" disabled={busy} onClick={() => setConfirming({ kind: "reset", student: result })}>Đặt lại lượt</Button></> : null}
                <Button variant="secondary" disabled={busy} onClick={() => setConfirming({ kind: "revoke", student })}>Thu hồi mã</Button>
              </div>
              {credential ? <div className={styles.accessCard} data-surface="panel"><div><p><strong>Mã truy cập mới:</strong> <code>{credential.credential}</code></p><p className={styles.hint}>Đây là lần duy nhất SmartTeach hiển thị mã này. Hãy cấp riêng cho {student.name}.</p><Button variant="secondary" onClick={() => void copy(shareUrl)}>Sao chép liên kết riêng</Button></div>{shareUrl ? <QrCode value={shareUrl} label={`Mã QR vào bài của ${student.name}`} /> : null}</div> : null}
            </li>;
          })}
        </ul>}
      </section>
      {attemptDetail ? <section className={styles.attemptPanel} data-surface="panel" aria-labelledby={`${baseId}-attempt`}><div className={styles.sectionHeading}><div><h2 id={`${baseId}-attempt`}>Lượt làm của {attemptDetail.name}</h2><p>{attemptDetail.status === "submitted" && attemptDetail.scorePoints !== undefined ? `Đã nộp · ${attemptDetail.scorePoints ?? 0}/${attemptDetail.maxPoints} điểm · ${attemptDetail.correct ?? 0}/${attemptDetail.total ?? 0} câu đúng` : attemptDetail.status === "submitted" ? `Đã nộp · ${attemptDetail.score ?? 0}/${attemptDetail.total ?? 0} câu đúng` : "Đang làm"}</p></div><Button variant="secondary" onClick={() => setAttemptDetail(null)}>Đóng chi tiết</Button></div>{attemptDetail.answers.length === 0 ? <p className={styles.hint}>Học sinh chưa lưu câu trả lời nào.</p> : <ol className={styles.attemptAnswers}>{attemptDetail.answers.map((answer) => <li key={answer.position}><strong>Câu {answer.position + 1}</strong><span>{Array.isArray(answer.answer) ? answer.answer.map((value) => String.fromCharCode(65 + value)).join(", ") : typeof answer.answer === "number" ? String.fromCharCode(65 + answer.answer) : answer.answer}</span><span>{answer.isCorrect === null ? "Chưa chấm" : answer.isCorrect ? "Đúng" : "Chưa đúng"}</span></li>)}</ol>}</section> : null}
      <dialog ref={dialogRef} className={styles.confirmDialog} aria-labelledby={`${baseId}-confirm-title`} onClose={() => setConfirming(null)} onClick={(event) => { if (event.target === event.currentTarget) setConfirming(null); }}><div><h2 id={`${baseId}-confirm-title`}>Xác nhận thao tác</h2><p>{confirmationText}</p><div className={styles.actions}><Button variant="secondary" autoFocus onClick={() => setConfirming(null)}>Quay lại</Button><Button variant="primary" disabled={busy} onClick={() => void confirmAction()}>{busy ? "Đang xử lý…" : "Xác nhận"}</Button></div></div></dialog>
    </div>
  );
}
