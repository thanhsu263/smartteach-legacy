"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { player } from "@/lib/live/rpc";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./player.module.css";

type JoinFormProps = {
  initialPin: string;
  /** Lời nhắn đầu form (ví dụ vừa bị loại khỏi phòng hay mã tham gia hết hiệu lực). */
  notice?: string | null;
  onJoined: (player: { token: string; nickname: string }) => void;
};

const PIN_ERRORS = new Set(["invalid_pin"]);
const NICKNAME_ERRORS = new Set(["invalid_nickname", "nickname_taken"]);

export function JoinForm({ initialPin, notice, onJoined }: JoinFormProps) {
  const [pin, setPin] = useState(initialPin.replace(/\D/g, "").slice(0, 6));
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ pin?: string; nickname?: string; general?: string }>({});
  const pinRef = useRef<HTMLInputElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmed = nickname.trim();
    const next: typeof errors = {};
    if (!/^\d{6}$/.test(pin)) next.pin = "PIN gồm 6 chữ số, hiện trên màn hình của thầy cô.";
    if (trimmed === "") next.nickname = "Bạn nhập một biệt danh nhé.";
    else if (trimmed.length > 20) next.nickname = "Biệt danh tối đa 20 ký tự.";
    if (next.pin || next.nickname) {
      setErrors(next);
      (next.pin ? pinRef : nicknameRef).current?.focus();
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErrors({ general: "Phòng chơi chưa được bật trên máy chủ này." });
      return;
    }
    setBusy(true);
    setErrors({});
    const result = await player.join(supabase, pin, trimmed);
    setBusy(false);
    if (result.ok) {
      onJoined({ token: result.token, nickname: result.nickname });
      return;
    }
    const code = result.code ?? "";
    if (PIN_ERRORS.has(code)) {
      setErrors({ pin: result.message });
      pinRef.current?.focus();
    } else if (NICKNAME_ERRORS.has(code)) {
      setErrors({ nickname: result.message });
      nicknameRef.current?.focus();
    } else {
      setErrors({ general: result.message });
    }
  }

  return (
    <div className={styles.screen}>
      <header>
        <h1 className={styles.title}>Vào phòng chơi</h1>
        <p className={styles.lead}>Nhập PIN trên màn hình của thầy cô và chọn một biệt danh. Bạn không cần tài khoản.</p>
      </header>

      {notice ? (
        <p role="status" className={`${styles.notice} animate-fade-up`}>
          {notice}
        </p>
      ) : null}

      <form onSubmit={submit} className={styles.card} noValidate>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor={`${baseId}-pin`}>PIN của phòng</label>
            <input
              id={`${baseId}-pin`}
              ref={pinRef}
              className={styles.pin}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={6}
              value={pin}
              placeholder="000000"
              aria-invalid={errors.pin !== undefined}
              aria-describedby={errors.pin ? `${baseId}-pin-error` : undefined}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {errors.pin ? (
              <p id={`${baseId}-pin-error`} className={styles.error}>
                {errors.pin}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${baseId}-nickname`}>Biệt danh</label>
            <input
              id={`${baseId}-nickname`}
              ref={nicknameRef}
              type="text"
              autoComplete="off"
              maxLength={30}
              value={nickname}
              aria-invalid={errors.nickname !== undefined}
              aria-describedby={`${baseId}-nickname-help${errors.nickname ? ` ${baseId}-nickname-error` : ""}`}
              onChange={(event) => setNickname(event.target.value)}
            />
            <p id={`${baseId}-nickname-help`} className={styles.hint}>
              Tối đa 20 ký tự. Cả lớp sẽ thấy biệt danh này.
            </p>
            {errors.nickname ? (
              <p id={`${baseId}-nickname-error`} className={styles.error}>
                {errors.nickname}
              </p>
            ) : null}
          </div>
        </div>

        {errors.general ? (
          <p role="alert" className={`${styles.error} animate-fade-up`}>
            {errors.general}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className={styles.big} disabled={busy}>
          {busy ? "Đang vào phòng…" : "Vào phòng"}
        </Button>
      </form>
    </div>
  );
}
