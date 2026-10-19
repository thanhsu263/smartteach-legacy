"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/button";
import { useFocusRequest } from "@/components/use-focus-request";
import { setSharing } from "@/lib/quiz/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./share-panel.module.css";

type SharePanelProps = {
  quizId: string;
  token: string | null;
  onChange: (token: string | null) => void;
};

type Pending = "rotate" | "disable" | null;

/** Chia sẻ quiz bằng link: bật, sao chép, đổi mã (thu hồi link cũ) hoặc tắt. */
export function SharePanel({ quizId, token, onChange }: SharePanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const requestFocus = useFocusRequest();

  const link = token && typeof window !== "undefined" ? `${window.location.origin}/shared/quiz/${token}` : "";

  async function change(enabled: boolean) {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPending(null);
    const result = await setSharing(supabase, quizId, enabled);
    setBusy(false);
    // Nút vừa bấm bị thay bằng nút khác: đưa focus sang nút tương ứng ở trạng thái mới.
    if (!result.ok) {
      setError(result.message);
      requestFocus(`${titleId}-${token ? "rotate" : "enable"}`);
      return;
    }
    onChange(result.token);
    requestFocus(`${titleId}-${result.token ? "rotate" : "enable"}`);
    setNotice(enabled ? (token ? "Đã đổi mã. Link cũ không còn dùng được." : "Đã bật chia sẻ.") : "Đã tắt chia sẻ.");
  }

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Đã sao chép link.");
    } catch {
      // Trình duyệt chặn clipboard: chọn sẵn link để thầy cô tự sao chép.
      inputRef.current?.select();
      setNotice("Đã chọn sẵn link, thầy cô bấm Ctrl+C (hoặc giữ ngón tay rồi chọn Sao chép).");
    }
  }

  return (
    <section aria-labelledby={`${titleId}-title`} className={styles.panel}>
      <h2 id={`${titleId}-title`} className={styles.heading}>
        Chia sẻ quiz
      </h2>

      {token ? (
        <>
          <p className={styles.hint}>
            Người có link và đã đăng nhập xem được quiz và sao chép về tài khoản của họ. <strong>Link cho xem cả đáp án đúng</strong>, nên thầy cô không gửi cho học sinh.
          </p>
          <div className={styles.linkRow}>
            <label htmlFor={`${titleId}-link`} className="visually-hidden">
              Link chia sẻ
            </label>
            <input id={`${titleId}-link`} ref={inputRef} type="text" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
            <Button variant="secondary" onClick={copy}>
              Sao chép link
            </Button>
          </div>

          {pending ? (
            <div className={styles.confirm} role="group" aria-label="Xác nhận">
              <p>
                {pending === "rotate"
                  ? "Đổi mã sẽ làm link cũ hết hiệu lực ngay. Thầy cô cần gửi link mới cho đồng nghiệp."
                  : "Tắt chia sẻ sẽ làm link hiện tại không dùng được nữa."}
              </p>
              <div className={styles.actions}>
                <Button variant="secondary" disabled={busy} onClick={() => change(pending === "rotate")}>
                  {pending === "rotate" ? "Đổi mã" : "Tắt chia sẻ"}
                </Button>
                <Button
                  variant="secondary"
                  autoFocus
                  onClick={() => {
                    setPending(null);
                    requestFocus(`${titleId}-${pending}`);
                  }}
                >
                  Giữ nguyên
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <Button variant="secondary" id={`${titleId}-rotate`} onClick={() => setPending("rotate")}>
                Đổi mã link
              </Button>
              <Button variant="secondary" id={`${titleId}-disable`} onClick={() => setPending("disable")}>
                Tắt chia sẻ
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className={styles.hint}>Quiz đang ở chế độ riêng tư: chỉ thầy cô thấy. Bật chia sẻ để lấy link gửi đồng nghiệp.</p>
          <div className={styles.actions}>
            <Button variant="secondary" id={`${titleId}-enable`} disabled={busy} onClick={() => change(true)}>
              Bật chia sẻ
            </Button>
          </div>
        </>
      )}

      {notice ? (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
