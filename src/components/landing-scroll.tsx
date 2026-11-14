"use client";

import { useEffect } from "react";
import type Lenis from "lenis";

const smoothWheelMedia = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const scrollKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

export function LandingScroll() {
  useEffect(() => {
    const media = window.matchMedia(smoothWheelMedia);
    let smoother: Lenis | undefined;
    let disposed = false;
    let loading = false;

    function sync() {
      if (!media.matches) {
        smoother?.destroy();
        smoother = undefined;
        return;
      }
      if (smoother || loading) return;

      loading = true;
      void import("lenis").then(({ default: Lenis }) => {
        if (disposed || !media.matches) return;
        smoother = new Lenis({
          autoRaf: true,
          duration: 1.1,
          syncTouch: false,
          stopInertiaOnNavigate: true,
          prevent: (element) => element.matches("dialog, #site-menu"),
          virtualScroll: ({ event, deltaX, deltaY }) => event.type === "wheel" && !(event as WheelEvent).shiftKey && Math.abs(deltaY) > Math.abs(deltaX),
        });
      }).catch(() => {
        // The landing uses native scrolling if the enhancement cannot load.
      }).finally(() => { loading = false; });
    }

    function stopInertia() {
      if (smoother?.isScrolling !== "smooth") return;
      smoother.stop();
      smoother.start();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab" || scrollKeys.has(event.key)) stopInertia();
    }

    media.addEventListener("change", sync);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", stopInertia);
    window.addEventListener("hashchange", stopInertia);
    window.addEventListener("landing:navigate", stopInertia);
    sync();
    return () => {
      disposed = true;
      media.removeEventListener("change", sync);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", stopInertia);
      window.removeEventListener("hashchange", stopInertia);
      window.removeEventListener("landing:navigate", stopInertia);
      smoother?.destroy();
    };
  }, []);

  return null;
}
