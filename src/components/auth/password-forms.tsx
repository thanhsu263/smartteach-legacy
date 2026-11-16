"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { describeAuthError } from "@/lib/auth/messages";
import { passwordError, passwordIssue } from "@/lib/auth/password";
import fields from "@/components/login-form.module.css";
import styles from "./password-forms.module.css";

export function ForgotPasswordForm({ redirectTo }: { redirectTo: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const id = useId();
  async function submit(event: FormEvent) {
    event.preventDefault();
    const db = getBrowserSupabase();
    if (busy || !db || !redirectTo) return;
    setBusy(true); setError(null); setSent(false);
    try {
      const result = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (result.error) setError(describeAuthError(result.error));
      else setSent(true);
    } catch { setError("Không kết nối được máy chủ. Thầy cô thử lại nhé."); }
    finally { setBusy(false); }
  }
  const ready = Boolean(redirectTo && getBrowserSupabase());
  return <form onSubmit={submit} className={fields.form}>
    {!ready && <p role="alert" className={fields.error}>Khôi phục mật khẩu chưa được cấu hình trên máy chủ này.</p>}
    <div className={fields.field}><label htmlFor={id}>Email</label><input id={id} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></div>
    {error && <p role="alert" className={fields.error}>{error}</p>}
    {sent && <p role="status" className={fields.notice}>Nếu email này có tài khoản dùng mật khẩu, thầy cô sẽ nhận được liên kết khôi phục. Kiểm tra cả thư rác và mở liên kết trên trình duyệt vừa yêu cầu.</p>}
    <Button type="submit" variant="primary" disabled={busy || !ready} aria-busy={busy}>{busy ? "Đang gửi…" : sent ? "Gửi lại liên kết" : "Gửi liên kết khôi phục"}</Button>
    <Link href="/login">Về đăng nhập</Link>
  </form>;
}

export function PasswordForm({ mode }: { mode: "reset" | "change" }) {
  const params = useSearchParams();
  const { signOut } = useAuth();
  const [verified, setVerified] = useState<{ googleOnly: boolean } | null | false>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nonce, setNonce] = useState("");
  const [needNonce, setNeedNonce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const id = useId();
  useEffect(() => {
    let live = true;
    const db = getBrowserSupabase();
    if (!db) return;
    db.auth.getUser().then(({ data, error }) => {
      if (!live) return;
      const identities = data.user?.identities ?? [];
      setVerified(error || !data.user ? false : { googleOnly: identities.length > 0 && identities.every(i => i.provider !== "email") });
    }).catch(() => { if (live) setVerified(false); });
    return () => { live = false; };
  }, []);
  const invalid = params.get("error") === "recovery" || verified === false;
  async function requestNonce() {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await getBrowserSupabase()!.auth.reauthenticate();
      if (result.error) setError(describeAuthError(result.error));
      else { setNeedNonce(true); setNotice("Đã yêu cầu mã xác minh. Thầy cô kiểm tra email."); }
    } catch { setError("Chưa thể gửi mã xác minh. Thầy cô thử lại nhé."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !verified || invalid || verified.googleOnly) return;
    const issue = passwordIssue(password, confirmation);
    if (issue) { setError(issue); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      // The SDK updates only the identity belonging to this validated Auth session.
      const result = await getBrowserSupabase()!.auth.updateUser({ password, ...(nonce.trim() ? { nonce: nonce.trim() } : {}) });
      if (result.error) {
        if (["reauthentication_needed", "reauthentication_not_valid"].includes(result.error.code ?? "")) setNeedNonce(true);
        setError(passwordError(result.error.code) ?? describeAuthError(result.error));
      } else { setPassword(""); setConfirmation(""); setNonce(""); setDone(true); }
    } catch { setError("Không kết nối được máy chủ. Nội dung chưa được lưu; thầy cô thử lại nhé."); }
    finally { setBusy(false); }
  }
  if (!getBrowserSupabase()) return <p role="alert">Đăng nhập chưa được cấu hình.</p>;
  if (invalid) return <section className={fields.form}><p role="alert">Liên kết không hợp lệ, đã dùng hoặc phiên đã hết hạn.</p><ButtonLink href="/forgot-password">Yêu cầu liên kết mới</ButtonLink></section>;
  if (verified === null) return <p role="status">Đang xác minh phiên…</p>;
  if (verified.googleOnly) return <section className={fields.form}><p>Tài khoản này dùng nhà cung cấp đăng nhập bên ngoài. Thầy cô quản lý mật khẩu tại nhà cung cấp đó; thay đổi ở đây không đổi mật khẩu Google.</p><ButtonLink href="/dashboard">Về tổng quan</ButtonLink></section>;
  if (done) return <section className={fields.form}><p role="status">Đã cập nhật mật khẩu. Lần đăng nhập tiếp theo, thầy cô dùng mật khẩu mới.</p><div className={styles.links}><Button onClick={() => void signOut()}>Đăng xuất để đăng nhập lại</Button><ButtonLink href="/dashboard">Về tổng quan</ButtonLink></div></section>;
  return <form className={fields.form} onSubmit={submit}>
    <div className={fields.field}><label htmlFor={`${id}-password`}>Mật khẩu mới</label><input id={`${id}-password`} type="password" autoComplete="new-password" required minLength={6} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} /></div>
    <div className={fields.field}><label htmlFor={`${id}-confirm`}>Nhập lại mật khẩu mới</label><input id={`${id}-confirm`} type="password" autoComplete="new-password" required maxLength={256} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
    {needNonce && <><div className={fields.field}><label htmlFor={`${id}-nonce`}>Mã xác minh trong email</label><input id={`${id}-nonce`} autoComplete="one-time-code" maxLength={16} value={nonce} onChange={e => setNonce(e.target.value)} /></div><Button disabled={busy} onClick={() => void requestNonce()}>Nhận mã xác minh</Button></>}
    {error && <p role="alert" className={fields.error}>{error}</p>}
    {notice && <p role="status" className={fields.notice}>{notice}</p>}
    <Button type="submit" variant="primary" disabled={busy} aria-busy={busy}>{busy ? "Đang cập nhật…" : mode === "reset" ? "Đặt lại mật khẩu" : "Đổi mật khẩu"}</Button>
  </form>;
}
