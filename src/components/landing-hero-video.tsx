"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/page.module.css";

const videoSource = "/hero/classroom-loop.mp4";
const playbackMedia = "(width > 1000px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function LandingHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedByUser = useRef(false);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const hero = video?.closest("section");
    if (!video || !hero || typeof IntersectionObserver !== "function") return;

    const media = matchMedia(playbackMedia);
    let inView = false;

    const sync = () => {
      if (!media.matches) {
        video.pause();
        if (video.hasAttribute("src")) {
          video.removeAttribute("src");
          video.load();
        }
        return;
      }

      if (!inView || document.hidden || pausedByUser.current) {
        video.pause();
        return;
      }

      if (!video.hasAttribute("src")) video.src = videoSource;
      void video.play().catch(() => { /* The poster remains visible when autoplay is blocked. */ });
    };

    const onMediaChange = () => {
      setAvailable(media.matches);
      sync();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      sync();
    }, { threshold: 0.25 });
    observer.observe(hero);
    media.addEventListener("change", onMediaChange);
    document.addEventListener("visibilitychange", sync);
    onMediaChange();

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || !matchMedia(playbackMedia).matches) return;
    if (video.paused) {
      pausedByUser.current = false;
      if (!video.hasAttribute("src")) video.src = videoSource;
      void video.play().catch(() => { /* The user can keep viewing the poster. */ });
    } else {
      pausedByUser.current = true;
      video.pause();
    }
  }

  const action = playing ? "Tạm dừng video nền" : "Phát video nền";

  return (
    <div className={styles.heroMedia}>
      <video
        ref={videoRef}
        className={styles.heroVideo}
        data-failed={failed || undefined}
        poster="/hero/classroom-poster.webp"
        width={1920}
        height={1080}
        preload="none"
        muted
        loop
        playsInline
        aria-hidden="true"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEmptied={() => setPlaying(false)}
        onError={(event) => {
          if (!event.currentTarget.error) return;
          setFailed(true);
          setPlaying(false);
        }}
      />
      {available && !failed && (
        <button type="button" className={styles.heroPlayback} onClick={togglePlayback} aria-label={action} title={action}>
          <span aria-hidden="true" className={playing ? styles.pauseIcon : styles.playIcon} />
        </button>
      )}
    </div>
  );
}
