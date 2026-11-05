"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from "react";

type PointerInertiaOptions = {
  /** Lớp transform riêng bên trong vùng tương tác; không áp dụng lên target bấm. */
  targetRef: RefObject<HTMLElement | null>;
  maxTilt?: number;
  maxTranslate?: number;
  smoothing?: number;
};

/**
 * Pointer inertia cục bộ cho signature demo. Hook chỉ ghi CSS custom property
 * trong rAF, không đổi React state theo frame và tự dừng khi về điểm cân bằng.
 */
export function usePointerInertia<T extends HTMLElement>({
  targetRef,
  maxTilt = 4,
  maxTranslate = 8,
  smoothing = 0.12,
}: PointerInertiaOptions) {
  const regionRef = useRef<T>(null);
  const enabledRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const frameCallbackRef = useRef<() => void>(() => {});
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  const apply = useCallback(() => {
    const element = targetRef.current;
    if (!element) return;
    element.style.setProperty("--pointer-x", `${current.current.x.toFixed(3)}`);
    element.style.setProperty("--pointer-y", `${current.current.y.toFixed(3)}`);
    element.style.setProperty("--pointer-tilt", `${maxTilt}`);
    element.style.setProperty("--pointer-translate", `${maxTranslate}`);
  }, [maxTilt, maxTranslate, targetRef]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const frame = useCallback(() => {
    rafRef.current = null;
    current.current.x += (target.current.x - current.current.x) * smoothing;
    current.current.y += (target.current.y - current.current.y) * smoothing;
    const settled = Math.abs(target.current.x - current.current.x) < 0.002 && Math.abs(target.current.y - current.current.y) < 0.002;
    if (settled) current.current = { ...target.current };
    apply();
    if (!settled && document.visibilityState === "visible") {
      rafRef.current = requestAnimationFrame(() => frameCallbackRef.current());
    }
  }, [apply, smoothing]);

  const schedule = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(() => frameCallbackRef.current());
  }, []);

  useEffect(() => {
    frameCallbackRef.current = frame;
  }, [frame]);

  const reset = useCallback(() => {
    target.current = { x: 0, y: 0 };
    schedule();
  }, [schedule]);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      enabledRef.current = fine.matches && !reduced.matches;
      if (!enabledRef.current) {
        target.current = { x: 0, y: 0 };
        current.current = { x: 0, y: 0 };
        apply();
        stop();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") stop();
      else if (enabledRef.current) schedule();
    };
    sync();
    fine.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      fine.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [apply, schedule, stop]);

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (!enabledRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    target.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    target.current.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    // Phản hồi một phần ngay ở input frame; các frame còn lại vẫn nội suy qua rAF.
    current.current.x += (target.current.x - current.current.x) * smoothing;
    current.current.y += (target.current.y - current.current.y) * smoothing;
    apply();
    schedule();
  }, [apply, schedule, smoothing]);

  return { regionRef, onPointerMove, onPointerLeave: reset, onBlur: reset };
}
