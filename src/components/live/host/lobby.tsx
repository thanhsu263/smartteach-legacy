"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { QrCode } from "@/components/qr-code";
import type { HostPlayer } from "@/lib/live/types";
import styles from "./host.module.css";

type LobbyProps = {
  title: string;
  pin: string;
  locked: boolean;
  players: readonly HostPlayer[];
  busy: boolean;
  onToggleLock: () => void;
  onRemove: (player: HostPlayer) => void;
  onStart: () => void;
};

/** Phòng chờ: PIN cỡ lớn kèm mã QR, địa chỉ tham gia, danh sách người chơi (loại được), khoá phòng và nút bắt đầu. */
export function HostLobby({ title, pin, locked, players, busy, onToggleLock, onRemove, onStart }: LobbyProps) {
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const joinUrl = `${origin}/play?pin=${pin}`;
  const shown = origin.replace(/^https?:\/\//, "");
  const active = players.filter((player) => !player.removed);

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied("ok");
    } catch {
      // Trình duyệt chặn clipboard: địa chỉ vẫn hiện sẵn ở trên để đọc cho lớp.
      setCopied("manual");
    }
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Phòng chờ: {title}</h1>

      <section className={styles.join} aria-label="Cách vào phòng">
        <div className={styles.joinBody}>
          <div className={styles.joinInfo}>
            <p className={styles.joinLine}>
              Quét mã QR, hoặc vào <strong>{shown}/play</strong> trên điện thoại và nhập PIN
            </p>
            <p className={styles.pin} aria-label={`PIN: ${pin.split("").join(" ")}`}>
              {pin}
            </p>
            <div className={styles.buttons}>
              <Button variant="on-primary" onClick={copy}>
                Sao chép link vào phòng
              </Button>
            </div>
          </div>
          {origin ? (
            <div className={styles.qrFrame}>
              <QrCode value={joinUrl} label="Mã QR vào phòng" />
            </div>
          ) : null}
        </div>
        {copied ? (
          <p role="status" className={styles.joinNote}>
            {copied === "ok" ? "Đã sao chép link." : `Không sao chép được, thầy cô đọc địa chỉ ${shown}/play?pin=${pin} cho lớp nhé.`}
          </p>
        ) : null}
        {locked ? (
          <p role="status" className={styles.joinNote}>
            Phòng đang khoá nên bạn mới chưa vào được.
          </p>
        ) : null}
      </section>

      <section className={styles.players} aria-label="Người chơi">
        <h2 className={styles.reviewTitle}>Người chơi ({active.length})</h2>
        {active.length === 0 ? (
          <p className={styles.hint}>Chưa có bạn nào vào phòng. Các bạn sẽ hiện ở đây ngay khi nhập PIN.</p>
        ) : (
          <ul className={styles.playerList}>
            {active.map((player) => (
              <li key={player.id} className={styles.player}>
                <span className={styles.playerName}>{player.nickname}</span>
                {removingId === player.id ? (
                  <>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => {
                        setRemovingId(null);
                        onRemove(player);
                      }}
                    >
                      Loại {player.nickname}?
                    </button>
                    <button type="button" className={styles.linkButton} autoFocus onClick={() => setRemovingId(null)}>
                      Giữ
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.linkButton}
                    aria-label={`Loại ${player.nickname} khỏi phòng`}
                    onClick={() => setRemovingId(player.id)}
                  >
                    Loại
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={styles.toolbar}>
        <Button variant="secondary" aria-pressed={locked} onClick={onToggleLock} disabled={busy}>
          {locked ? "Mở khoá phòng" : "Khoá phòng"}
        </Button>
        <Button variant="primary" className={styles.primary} onClick={onStart} disabled={busy || active.length === 0}>
          Bắt đầu
        </Button>
        <span className={styles.shortcut}>{active.length === 0 ? "Chờ ít nhất một bạn vào phòng." : "Nhấn Space để bắt đầu."}</span>
      </div>
    </div>
  );
}
