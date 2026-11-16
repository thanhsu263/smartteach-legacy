"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { LandingButtonEffects } from "./landing-button-effects";
import { HeroQuizDeck } from "./hero-quiz-deck";
import { heroQuizCards } from "@/data/hero-quiz";
import type { mountClassroom } from "./hero-classroom-scene";
import styles from "./landing-hero-classroom.module.css";

const motionPreference = "(prefers-reduced-motion: no-preference)";

export function LandingHeroClassroom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const quizButton = useRef<HTMLButtonElement>(null);
  const quizTrigger = useRef<HTMLElement | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(2);
  const [quizOpen, setQuizOpen] = useState(false);
  const question = heroQuizCards[quizIndex];
  const [sceneState, setSceneState] = useState<"poster" | "running" | "paused">("poster");
  const syncScene = useRef<() => void>(null);

  function openQuiz(index = 2) {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    quizTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : quizButton.current;
    setQuizIndex(index);
    setQuizOpen(true);
    setAnswer(null);
    dialog.showModal();
    syncScene.current?.();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest("section");
    if (!canvas || !hero || typeof IntersectionObserver !== "function" || typeof ResizeObserver !== "function") return;

    const media = matchMedia(motionPreference);
    let scene: Awaited<ReturnType<typeof mountClassroom>> | undefined;
    const controller = new AbortController();
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
        void import("./hero-classroom-scene").then(async ({ mountClassroom }) => {
          if (disposed || !inView || document.hidden || !canvas || !hero) return;
          const mounted = await mountClassroom({ canvas, hero, onFailure: failScene, signal: controller.signal });
          if (disposed) {
            mounted.dispose();
            return;
          }
          scene = mounted;
          sync();
        }).catch(() => {
          if (!disposed) failScene();
        }).finally(() => { loading = false; });
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
      controller.abort();
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
      <HeroQuizDeck active={!quizOpen} onOpen={openQuiz} />
      <div className={styles.controls}>
        <Button ref={quizButton} aria-haspopup="dialog" onClick={() => openQuiz()}>
          <LandingButtonEffects tone="glass">Thử một câu quiz <span aria-hidden="true">↗</span></LandingButtonEffects>
        </Button>
      </div>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="hero-quiz-title" onClose={() => {
        setQuizOpen(false);
        (quizTrigger.current?.isConnected ? quizTrigger.current : quizButton.current)?.focus({ preventScroll: true });
        syncScene.current?.();
      }}>
        <div className={styles.quizHeader}>
          <h2 id="hero-quiz-title">Thử một câu quiz</h2>
          <form method="dialog">
            <Button type="submit">Đóng</Button>
          </form>
        </div>
        <p className={styles.question}>{question.question}</p>
        <div className={styles.answers} role="group" aria-label="Các đáp án">
          {question.options.map((option) => (
            <Button key={option} aria-pressed={answer === option} onClick={() => setAnswer(option)}>{option}</Button>
          ))}
        </div>
        <p className={styles.feedback} role="status">
          {answer === question.options[question.correct] ? `Chính xác! ${question.explanation}` : answer ? "Chưa đúng. Thử suy nghĩ và chọn lại nhé." : "Chọn một đáp án."}
        </p>
      </dialog>
    </div>
  );
}
