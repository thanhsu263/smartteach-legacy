"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import type { mountClassroom } from "./hero-classroom-scene";
import styles from "./landing-hero-classroom.module.css";

const motionPreference = "(width > 1000px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const answers = ["2/9", "1/2", "3/6", "5/6"];

export function LandingHeroClassroom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quizButton = useRef<HTMLButtonElement>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sceneState, setSceneState] = useState<"poster" | "running" | "paused">("poster");
  const pausedByUser = useRef(false);
  const syncScene = useRef<() => void>(null);

  function openQuiz() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setAnswer(null);
    dialog.showModal();
    syncScene.current?.();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest("section");
    if (!canvas || !hero || typeof IntersectionObserver !== "function" || typeof ResizeObserver !== "function") return;

    const media = matchMedia(motionPreference);
    let scene: ReturnType<typeof mountClassroom> | undefined;
    let inView = false;
    let loading = false;
    let failed = false;
    let disposed = false;

    function failScene() {
      failed = true;
      setSceneState("poster");
    }

    function sync() {
      if (!media.matches || failed) {
        scene?.setRunning(false);
        setSceneState("poster");
        return;
      }
      const active = inView && !document.hidden && !pausedByUser.current && !dialogRef.current?.open;
      if (scene) {
        scene.setRunning(active);
        setSceneState(active ? "running" : "paused");
      } else if (active && !loading) {
        loading = true;
        void import("./hero-classroom-scene").then(({ mountClassroom }) => {
          loading = false;
          if (disposed || !media.matches || !inView || document.hidden || !canvas || !hero) return;
          scene = mountClassroom({ canvas, hero, onQuiz: openQuiz, onFailure: failScene });
          sync();
        }).catch(() => {
          if (!disposed) failScene();
        });
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      sync();
    }, { threshold: 0.25 });
    observer.observe(hero);
    syncScene.current = sync;
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      disposed = true;
      observer.disconnect();
      syncScene.current = null;
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      scene?.dispose();
    };
  }, []);

  const running = sceneState === "running";
  const motionAction = running ? "Tạm dừng chuyển động lớp học" : "Bật chuyển động lớp học";
  return (
    <div className={styles.stage} data-hero-classroom data-scene={sceneState}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.controls}>
        <Button ref={quizButton} className={styles.quizButton} aria-haspopup="dialog" onClick={openQuiz}>
          Thử một câu quiz <span aria-hidden="true">↗</span>
        </Button>
        {sceneState !== "poster" && (
          <button type="button" className={styles.motionButton} aria-label={motionAction} title={motionAction} onClick={() => {
            pausedByUser.current = running;
            syncScene.current?.();
          }}>
            <span aria-hidden="true" className={running ? styles.pauseIcon : styles.playIcon} />
          </button>
        )}
      </div>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="hero-quiz-title" onClose={() => {
        quizButton.current?.focus({ preventScroll: true });
        syncScene.current?.();
      }}>
        <div className={styles.quizHeader}>
          <h2 id="hero-quiz-title">Thử một câu quiz</h2>
          <form method="dialog">
            <Button type="submit">Đóng</Button>
          </form>
        </div>
        <p className={styles.question}>Một nửa cộng một phần ba bằng bao nhiêu?</p>
        <div className={styles.answers} role="group" aria-label="Các đáp án">
          {answers.map((option) => (
            <Button key={option} aria-pressed={answer === option} onClick={() => setAnswer(option)}>{option}</Button>
          ))}
        </div>
        <p className={styles.feedback} role="status">
          {answer === "5/6" ? "Chính xác! 1/2 + 1/3 = 3/6 + 2/6 = 5/6." : answer ? "Chưa đúng. Thử quy đồng hai phân số nhé." : "Chọn một đáp án."}
        </p>
      </dialog>
    </div>
  );
}
