"use client";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { adminRequest } from "@/lib/admin/client";
import type { ExamSummary } from "@/lib/exams/types";
import styles from "./exams.module.css";
export function ExamList() {
  const { user, status } = useAuth();
  if (!user || status !== "signed-in") return <p role="status">Đang xác minh tài khoản…</p>;
  return <OwnerExamList key={user.id} />;
}
function OwnerExamList() {
  const [data, setData] = useState<{ items: ExamSummary[]; total: number; nextOffset: number | null } | null>(null);
  const [offset, setOffset] = useState(0), [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; adminRequest<typeof data>(`/api/exams?offset=${offset}`).then(r => { if(live) setData(r); }).catch(e => { if(live) setError(e.message); }); return () => { live = false; }; }, [offset, reload]);
  async function remove(exam: ExamSummary) {
    if (busy || !window.confirm(`Xóa đề “${exam.title}”? Nội dung trong bài đã giao vẫn được giữ.`)) return;
    setBusy(true); setError(null);
    try { await adminRequest(`/api/exams/${exam.id}`, { revision: exam.revision }, "DELETE"); setReload(n => n + 1); }
    catch(e) { setError(e instanceof Error ? e.message : "Chưa xóa được đề."); } finally { setBusy(false); }
  }
  return <section className={styles.page}><header className={styles.header}><div><h1>Đề kiểm tra</h1><p>Soạn đề, nhập theo mẫu và xuất Word/PDF miễn phí.</p></div><div className={styles.actions}><ButtonLink href="/my-exams/new" variant="primary">Soạn đề mới</ButtonLink><ButtonLink href="/my-exams/import">Nhập đề từ tệp</ButtonLink></div></header>
    {error && <p role="alert">{error}</p>}{!data ? <p role="status">Đang tải đề…</p> : !data.items.length ? <p>Chưa có đề kiểm tra. Thầy cô có thể soạn trực tiếp hoặc nhập tệp theo mẫu.</p> : <ul className={styles.list}>{data.items.map(exam => <li key={exam.id} className={styles.item}><h2><ButtonLink href={`/my-exams/${exam.id}`}>{exam.title}</ButtonLink></h2><p>{exam.questionCount} câu · cập nhật {new Date(exam.updatedAt).toLocaleString("vi-VN")}</p><div><Button disabled={busy} onClick={() => void remove(exam)}>Xóa đề</Button></div></li>)}</ul>}
    <div className={styles.actions}><Button disabled={!offset || busy} onClick={() => setOffset(n => Math.max(0, n - 20))}>Trang trước</Button><Button disabled={!data?.nextOffset || busy} onClick={() => setOffset(data!.nextOffset!)}>Trang sau</Button><Button onClick={() => { setError(null); setReload(n => n + 1); }}>Tải lại</Button></div>
  </section>;
}
