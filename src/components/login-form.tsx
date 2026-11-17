"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { AuthHeading } from "@/components/auth/auth-split";
import { Button } from "@/components/button";
import { GoogleLogo } from "@/components/icons";
import { describeAuthError } from "@/lib/auth/messages";
import { normalizeFullName, normalizeVietnamPhone } from "@/lib/auth/profile";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import styles from "./login-form.module.css";

type Mode = "sign-in" | "sign-up";
type SignUpProblem = "name" | "phone" | "consent";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"), "/dashboard");
  const callbackFailed = params.get("error") === "callback";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [problems, setProblems] = useState<SignUpProblem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const phoneId = useId();
  const consentId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  if (!getSupabaseConfig()) {
    return (
      <>
        <AuthHeading title="Đăng nhập" />
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          Đăng nhập chưa được cấu hình trên máy chủ này. Các trò chơi và tiện ích vẫn dùng được không cần đăng nhập.
        </p>
      </>
    );
  }

  const signingUp = mode === "sign-up";
  const nameInvalid = problems.includes("name");
  const phoneInvalid = problems.includes("phone");
  const consentMissing = problems.includes("consent");

  /** Tạo tài khoản (email lẫn Google) cần đồng ý điều khoản; đăng nhập thì không. */
  function requireConsent() {
    if (!signingUp || agreed) return true;
    setProblems(["consent"]);
    consentRef.current?.focus();
    return false;
  }

  /** Kiểm họ tên, số điện thoại và đồng ý điều khoản; đưa focus về ô sai đầu tiên. */
  function validateSignUp() {
    const found: SignUpProblem[] = [];
    if (!normalizeFullName(fullName)) found.push("name");
    if (!normalizeVietnamPhone(phone)) found.push("phone");
    if (!agreed) found.push("consent");
    setProblems(found);
    const refs = { name: nameRef, phone: phoneRef, consent: consentRef };
    if (found[0]) refs[found[0]].current?.focus();
    return found.length === 0;
  }

  function clearProblem(problem: SignUpProblem) {
    setProblems((current) => current.filter((item) => item !== problem));
  }

  function switchMode(target: Mode) {
    setMode(target);
    setError(null);
    setNotice(null);
    setProblems([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    if (signingUp && !validateSignUp()) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const profile = { full_name: normalizeFullName(fullName), phone_number: normalizeVietnamPhone(phone) };
    const { data, error: failure } = signingUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback, data: profile } })
      : await supabase.auth.signInWithPassword({ email, password });

    if (failure) {
      setError(describeAuthError(failure));
      setBusy(false);
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    // Dự án bật xác nhận email: chưa có phiên cho tới khi bấm liên kết trong email.
    setNotice(`Đã gửi email xác nhận tới ${email}. Thầy cô mở email và bấm liên kết để hoàn tất đăng ký.`);
    setBusy(false);
  }

  async function signInWithGoogle() {
    const supabase = getBrowserSupabase();
    if (!supabase || busy || !requireConsent()) return;
    setBusy(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: failure } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (failure) {
      setError(describeAuthError(failure));
      setBusy(false);
    }
  }

  return (
    <>
      <AuthHeading title={signingUp ? "Tạo tài khoản" : "Đăng nhập"} />
      <div className={styles.form}>
        {callbackFailed ? (
          <p role="alert" className={`${styles.error} animate-fade-up`}>
            Không hoàn tất được đăng nhập (liên kết hết hạn hoặc đã dùng rồi). Thầy cô thử đăng nhập lại nhé.
          </p>
        ) : null}

        <form onSubmit={submit} className={styles.fields}>
          {signingUp ? (
            <>
              <div className={styles.field}>
                <label htmlFor={nameId}>Họ và tên</label>
                <input
                  ref={nameRef}
                  id={nameId}
                  type="text"
                  autoComplete="name"
                  aria-required="true"
                  maxLength={80}
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    clearProblem("name");
                  }}
                  aria-invalid={nameInvalid || undefined}
                  aria-describedby={nameInvalid ? `${nameId}-error` : undefined}
                />
                {nameInvalid ? (
                  <p id={`${nameId}-error`} className={styles.fieldError}>
                    Thầy cô nhập họ và tên (2–80 ký tự).
                  </p>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor={phoneId}>Số điện thoại</label>
                <input
                  ref={phoneRef}
                  id={phoneId}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-required="true"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    clearProblem("phone");
                  }}
                  aria-invalid={phoneInvalid || undefined}
                  aria-describedby={phoneInvalid ? `${phoneId}-error` : `${phoneId}-hint`}
                />
                {phoneInvalid ? (
                  <p id={`${phoneId}-error`} className={styles.fieldError}>
                    Số điện thoại chưa đúng. Ví dụ: 0912 345 678.
                  </p>
                ) : (
                  <p id={`${phoneId}-hint`} className={styles.hint}>
                    Số di động Việt Nam, 10 chữ số.
                  </p>
                )}
              </div>
            </>
          ) : null}
          <div className={styles.field}>
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={passwordId}>Mật khẩu</label>
            <input
              id={passwordId}
              type="password"
              autoComplete={signingUp ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={signingUp ? `${passwordId}-hint` : undefined}
            />
            {signingUp ? (
              <p id={`${passwordId}-hint`} className={styles.hint}>
                Ít nhất 6 ký tự.
              </p>
            ) : (
              <Link href="/forgot-password" className={styles.forgot}>
                Quên mật khẩu?
              </Link>
            )}
          </div>

          {signingUp ? (
            <div className={styles.consent}>
              <input
                ref={consentRef}
                id={consentId}
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (event.target.checked) clearProblem("consent");
                }}
                aria-invalid={consentMissing || undefined}
                aria-describedby={consentMissing ? `${consentId}-error` : undefined}
              />
              <label htmlFor={consentId}>
                Tôi đồng ý với điều khoản sử dụng và <Link href="/privacy">Chính sách quyền riêng tư</Link> của
                SmartTeach.
              </label>
              {consentMissing ? (
                <p id={`${consentId}-error`} className={styles.consentError}>
                  Thầy cô cần đồng ý với điều khoản để tiếp tục.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className={`${styles.error} animate-fade-up`}>
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className={`${styles.notice} animate-fade-up`}>
              {notice}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={busy} aria-busy={busy}>
            {busy ? "Đang xử lý…" : signingUp ? "Tạo tài khoản" : "Đăng nhập"}
          </Button>
        </form>

        <p className={styles.divider}>
          <span>hoặc</span>
        </p>

        <Button variant="secondary" onClick={signInWithGoogle} disabled={busy} aria-busy={busy}>
          <GoogleLogo />
          Tiếp tục với Google
        </Button>

        <p className={styles.switch}>
          {signingUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <button type="button" data-glass="row" onClick={() => switchMode(signingUp ? "sign-in" : "sign-up")}>
            {signingUp ? "Đăng nhập" : "Đăng ký"}
          </button>
        </p>
      </div>
    </>
  );
}
