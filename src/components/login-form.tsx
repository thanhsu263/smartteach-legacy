"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { describeAuthError } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import styles from "./login-form.module.css";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"), "/my-classes");
  const callbackFailed = params.get("error") === "callback";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();

  if (!getSupabaseConfig()) {
    return (
      <p role="alert" className={`${styles.error} animate-fade-up`}>
        Đăng nhập chưa được cấu hình trên máy chủ này. Các trò chơi và tiện ích vẫn dùng được không cần đăng nhập.
      </p>
    );
  }

  const signingUp = mode === "sign-up";

  function switchMode(target: Mode) {
    setMode(target);
    setError(null);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error: failure } = signingUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback } })
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
    if (!supabase || busy) return;
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
    <div className={styles.form}>
      {callbackFailed ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          Không hoàn tất được đăng nhập (liên kết hết hạn hoặc đã dùng rồi). Thầy cô thử đăng nhập lại nhé.
        </p>
      ) : null}

      <Button variant="secondary" onClick={signInWithGoogle} disabled={busy}>
        Tiếp tục với Google
      </Button>

      <p className={styles.divider}>
        <span>hoặc dùng email</span>
      </p>

      <form onSubmit={submit} className={styles.fields}>
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
          ) : null}
        </div>

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

        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Đang xử lý…" : signingUp ? "Tạo tài khoản" : "Đăng nhập"}
        </Button>
      </form>

      <p className={styles.switch}>
        {signingUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
        <button type="button" onClick={() => switchMode(signingUp ? "sign-in" : "sign-up")}>
          {signingUp ? "Đăng nhập" : "Đăng ký"}
        </button>
      </p>
    </div>
  );
}
