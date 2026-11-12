"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { WorkspaceFeedback } from "@/components/workspace-feedback";
import { GRADES, SUBJECTS } from "@/lib/catalog";
import { clonePublication, previewPublication } from "@/lib/library/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./library.module.css";

export function LibraryPreview({ id }: { id: string }) {
  const router = useRouter();
  const { status } = useAuth();
  const [loaded, setLoaded] = useState<{ id: string; result: Awaited<ReturnType<typeof previewPublication>> }>();
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let stopped = false;
    void previewPublication(supabase, id).then((result) => {
      if (!stopped) setLoaded({ id, result });
    });
    return () => { stopped = true; };
  }, [id]);

  async function clone() {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setCloneError(null);
    const result = await clonePublication(supabase, id);
    setBusy(false);
    if (!result.ok) {
      setCloneError(result.message);
      return;
    }
    router.push(`/my-quizzes/${result.id}`);
  }

  const result = loaded?.id === id ? loaded.result : undefined;
  if (!result) return <div className={`container ${styles.page}`}><p role="status">Đang mở học liệu…</p></div>;
  if (!result.ok) {
    return <div className={`container ${styles.page}`}>
      <section className={styles.empty} data-surface="panel">
        <h1>Không mở được học liệu</h1>
        <WorkspaceFeedback tone="error">{result.message}</WorkspaceFeedback>
        <Link href="/library">Về kho học liệu</Link>
      </section>
    </div>;
  }

  const { publication } = result;
  return (
    <div className={`container ${styles.page}`} data-workspace-controls>
      <Link href="/library">← Kho học liệu</Link>
      <header className={styles.header}>
        <p>{SUBJECTS.find((item) => item.id === publication.subject)?.label} · {publication.grades.map((grade) => GRADES.find((item) => item.id === grade)?.label ?? grade).join(", ")}</p>
        <h1>{publication.title}</h1>
        <span>{publication.description}</span>
      </header>
      <section className={styles.previewActions} data-surface="panel">
        <div>
          <strong>{publication.questions.length} câu hỏi</strong>
          <p>Nội dung xem trước không hiển thị đáp án đúng.</p>
        </div>
        {status === "signed-in" ? (
          <Button variant="primary" className={styles.cloneAction} aria-disabled={busy || undefined} aria-busy={busy || undefined} onClick={() => void clone()}>
            {busy ? "Đang tạo bản sao…" : "Tạo bản sao vào quiz của tôi"}
          </Button>
        ) : <Link className={styles.login} href={`/login?next=${encodeURIComponent(`/library/${id}`)}`}>Đăng nhập để tạo bản sao</Link>}
        <WorkspaceFeedback tone={cloneError ? "error" : "success"}>{cloneError}</WorkspaceFeedback>
      </section>
      <ol className={styles.questions}>
        {publication.questions.map((question, index) => (
          <li key={`${question.prompt}-${index}`} data-surface="panel">
            <p>Câu {index + 1}</p>
            <h2>{question.prompt}</h2>
            {question.options.length ? <ul>{question.options.map((option) => <li key={option.label}>{option.label}</li>)}</ul> : <span>Câu trả lời ngắn</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
