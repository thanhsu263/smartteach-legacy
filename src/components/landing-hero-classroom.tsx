"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { LandingButtonEffects } from "./landing-button-effects";
import type { mountClassroom } from "./hero-classroom-scene";
import styles from "./landing-hero-classroom.module.css";

const motionPreference = "(prefers-reduced-motion: no-preference)";
const answers = ["2/9", "1/2", "3/6", "5/6"];

export function LandingHeroClassroom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quizButton = useRef<HTMLButtonElement>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sceneState, setSceneState] = useState<"poster" | "running" | "paused">("poster");
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
      if (failed) return;
      const visible = inView && !document.hidden;
      if (scene) {
        const running = visible && media.matches && !dialogRef.current?.open;
        scene.setRunning(running, !media.matches);
        setSceneState(running ? "running" : "paused");
      } else if (visible && !loading) {
        loading = true;
        void import("./hero-classroom-scene").then(({ mountClassroom }) => {
          loading = false;
          if (disposed || !inView || document.hidden || !canvas || !hero) return;
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

  return (
    <div className={styles.stage} data-hero-classroom data-scene={sceneState}>
      <div className={styles.scenery} data-hero-scenery aria-hidden="true">
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      <div className={styles.controls}>
        <Button ref={quizButton} aria-haspopup="dialog" onClick={openQuiz}>
          <LandingButtonEffects tone="glass">Thử một câu quiz <span aria-hidden="true">↗</span></LandingButtonEffects>
        </Button>
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
