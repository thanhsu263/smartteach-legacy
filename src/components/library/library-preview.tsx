"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { GRADES, SUBJECTS } from "@/lib/catalog";
import { clonePublication, previewPublication } from "@/lib/library/api";
import type { PublicPublication } from "@/lib/library/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./library.module.css";

export function LibraryPreview({ id }: { id: string }) {
  const router = useRouter(); const { status } = useAuth();
  const [publication, setPublication] = useState<PublicPublication | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { const supabase = getBrowserSupabase(); if (!supabase) return; let stopped = false; void previewPublication(supabase, id).then((result) => { if (stopped) return; if (result.ok) setPublication(result.publication); else setError(result.message); }); return () => { stopped = true; }; }, [id]);
  async function clone() { const supabase = getBrowserSupabase(); if (!supabase || busy) return; setBusy(true); const result = await clonePublication(supabase, id); setBusy(false); if (!result.ok) { setError(result.message); return; } router.push(`/my-quizzes/${result.id}`); }
  if (error) return <main className={`container ${styles.page}`}><section className={styles.empty} data-surface="panel"><h1>Không mở được học liệu</h1><p role="alert">{error}</p><Link href="/library">Về kho học liệu</Link></section></main>;
  if (!publication) return <main className={`container ${styles.page}`}><p role="status">Đang mở học liệu…</p></main>;
  return <main className={`container ${styles.page}`}><Link href="/library">← Kho học liệu</Link><header className={styles.header}><p>{SUBJECTS.find((item) => item.id === publication.subject)?.label} · {publication.grades.map((grade) => GRADES.find((item) => item.id === grade)?.label ?? grade).join(", ")}</p><h1>{publication.title}</h1><span>{publication.description}</span></header><section className={styles.previewActions} data-surface="panel"><div><strong>{publication.questions.length} câu hỏi</strong><p>Nội dung xem trước không hiển thị đáp án đúng.</p></div>{status === "signed-in" ? <Button variant="primary" disabled={busy} onClick={() => void clone()}>{busy ? "Đang tạo bản sao…" : "Tạo bản sao vào quiz của tôi"}</Button> : <Link className={styles.login} href={`/login?next=${encodeURIComponent(`/library/${id}`)}`}>Đăng nhập để tạo bản sao</Link>}</section><ol className={styles.questions}>{publication.questions.map((question, index) => <li key={`${question.prompt}-${index}`} data-surface="panel"><p>Câu {index + 1}</p><h2>{question.prompt}</h2>{question.options.length ? <ul>{question.options.map((option) => <li key={option.label}>{option.label}</li>)}</ul> : <span>Câu trả lời ngắn</span>}</li>)}</ol></main>;
}
