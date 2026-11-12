"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "@/app/page.module.css";

export function LandingHeroMotion({ children }: { children: ReactNode }) {
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const demo = demoRef.current;
    const hero = demo?.parentElement;
    if (!demo || !hero || typeof IntersectionObserver !== "function") return;

    const media = matchMedia("(width > 650px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let bounds: { x: number; y: number; width: number; height: number } | undefined;
    let visible = false;
    let washStarted = false;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    function available() {
      return visible && media.matches && !document.hidden;
    }

    function reset(immediate = false) {
      cancelAnimationFrame(frame);
      frame = 0;
      bounds = undefined;
      demo!.removeAttribute("data-quiz-tracking");
      demo!.toggleAttribute("data-quiz-static", immediate);
      for (const variable of ["--quiz-x", "--quiz-y", "--quiz-angle"]) {
        demo!.style.removeProperty(variable);
      }
    }

    function syncVisibility() {
      if (!available()) {
        reset(true);
        demo!.removeAttribute("data-hero-wash");
      } else if (!washStarted) {
        washStarted = true;
        demo!.setAttribute("data-hero-wash", "");
      }
    }

    function move(event: PointerEvent) {
      if (!available() || event.pointerType !== "mouse") return;
      if (!bounds) {
        const rect = demo!.getBoundingClientRect();
        bounds = { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
      }
      pointerX = event.pageX;
      pointerY = event.pageY;
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!bounds || !available()) return;
        const x = Math.max(-1, Math.min(1, (pointerX - bounds.x) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (pointerY - bounds.y) / bounds.height * 2 - 1));
        demo!.removeAttribute("data-quiz-static");
        demo!.setAttribute("data-quiz-tracking", "");
        demo!.style.setProperty("--quiz-x", `${x * 8}px`);
        demo!.style.setProperty("--quiz-y", `${y * 8}px`);
        demo!.style.setProperty("--quiz-angle", `${x * 2}deg`);
      });
    }

    function leave() { reset(); }
    function resize() { bounds = undefined; }
    function finish(event: AnimationEvent) {
      if (event.target === demo && event.pseudoElement === "::before") demo!.removeAttribute("data-hero-wash");
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      syncVisibility();
    }, { threshold: 0.25 });
    observer.observe(hero);
    media.addEventListener("change", syncVisibility);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("resize", resize);
    demo.addEventListener("pointermove", move, { passive: true });
    demo.addEventListener("pointerleave", leave);
    demo.addEventListener("pointercancel", leave);
    demo.addEventListener("animationend", finish);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncVisibility);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("resize", resize);
      demo.removeEventListener("pointermove", move);
      demo.removeEventListener("pointerleave", leave);
      demo.removeEventListener("pointercancel", leave);
      demo.removeEventListener("animationend", finish);
      demo.removeAttribute("data-hero-wash");
      reset(true);
    };
  }, []);

  return <div ref={demoRef} className={styles.heroDemo} role="img" aria-label="Minh họa quiz trực tiếp">{children}</div>;
}
