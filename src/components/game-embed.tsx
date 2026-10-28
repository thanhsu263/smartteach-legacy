"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/button";
import { ExternalLinkIcon, FullscreenIcon } from "@/components/icons";
import styles from "./game-embed.module.css";

type GameEmbedProps = {
  title: string;
  src: string;
};

const SLOW_LOAD_MS = 8000;

const subscribeNothing = () => () => {};

export function GameEmbed({ title, src }: GameEmbedProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  // Chỉ dựng iframe sau khi hydrate, để sự kiện load không bị bỏ lỡ.
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const canFullscreen = useSyncExternalStore(
    subscribeNothing,
    () => document.fullscreenEnabled,
    () => false,
  );

  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  }

  return (
    <div className={styles.embed}>
      <div className={styles.toolbar}>
        {canFullscreen ? (
          <Button variant="secondary" onClick={toggleFullscreen}>
            <FullscreenIcon size={18} />
            Toàn màn hình
          </Button>
        ) : null}
        <ButtonLink href={src} target="_blank" rel="noopener noreferrer" variant="secondary">
          <ExternalLinkIcon size={18} />
          Mở trong tab mới
        </ButtonLink>
      </div>
      <div className={styles.frame}>
        {mounted ? (
          <iframe
            ref={frameRef}
            title={`Trò chơi: ${title}`}
            src={src}
            allow="autoplay; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoaded(true)}
          />
        ) : null}
        {loaded ? null : (
          <div className={styles.loading} role="status">
            <span className="glass-spinner" aria-hidden="true" />
            <p className={styles.loadingTitle}>Đang tải trò chơi…</p>
            {slow ? (
              <p className={styles.loadingText}>
                Tải lâu hơn dự kiến. Thầy cô thử bấm &quot;Mở trong tab mới&quot; phía trên nhé.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
