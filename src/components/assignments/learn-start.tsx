"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { exchangeAssignmentAccess } from "@/lib/assignments/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./learn.module.css";

function tokenKey(code: string) { return `smartteach.assignment-token.${code.toUpperCase()}`; }

export function LearnStart() {
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState("");
  const [credential, setCredential] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || pending) return;
    setError(null);
    setPending(true);
    const normalizedCode = code.trim().toUpperCase();
    const result = await exchangeAssignmentAccess(supabase, normalizedCode, credential);
    setPending(false);
    if (!result.ok) { setError("Không vào được bài này. Bạn kiểm tra lại mã bài và mã truy cập riêng nhé."); return; }
    sessionStorage.setItem(tokenKey(normalizedCode), result.token);
    router.push(`/learn/${normalizedCode}`);
  }

  return <main className={styles.start}><section className={styles.startPanel} data-surface="panel"><div><h1>Làm bài được giao</h1><p>Nhập mã bài và mã truy cập riêng thầy cô đã cấp. Bạn không cần tạo tài khoản.</p></div><form onSubmit={submit}><label htmlFor={`${id}-code`}>Mã bài<input id={`${id}-code`} required inputMode="text" autoCapitalize="characters" pattern="[A-Fa-f0-9]{10}" maxLength={10} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ví dụ: A1B2C3D4E5" /></label><label htmlFor={`${id}-credential`}>Mã truy cập riêng<input id={`${id}-credential`} required autoComplete="off" autoCapitalize="characters" pattern="[A-Fa-f0-9]{32}" maxLength={32} value={credential} onChange={(event) => setCredential(event.target.value.toUpperCase())} placeholder="32 ký tự từ thẻ của thầy cô" /></label>{error ? <p className={styles.error} role="alert">{error}</p> : null}<Button type="submit" variant="primary" disabled={pending}>{pending ? "Đang vào bài…" : "Vào làm bài"}</Button></form><p className={styles.privacy}>Mã truy cập chỉ dùng để mở đúng bài của bạn. Đừng gửi mã này cho người khác.</p></section></main>;
}

export { tokenKey };
