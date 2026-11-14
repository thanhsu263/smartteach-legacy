"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { GlassSurfaceFilter } from "./glass-surface-filter";
import styles from "./landing-button-effects.module.css";

const pointerMotion = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const lightRange = 100;
const magnetRange = 28;
const lightOffset = 18;
const buttons = new Set<HTMLElement>();
let visibility: IntersectionObserver | undefined;
let disconnect: (() => void) | undefined;
let active: HTMLElement | undefined;

function reset() {
  active?.removeAttribute("data-magnet-active");
  active = undefined;
}

function connectPointer() {
  const preference = matchMedia(pointerMotion);

  function followPointer(event: PointerEvent) {
    if (!preference.matches || event.pointerType !== "mouse" || event.buttons) return;
    let nearest = lightRange;
    let target: { button: HTMLElement; x: number; y: number; dx: number; dy: number } | undefined;
    const modal = document.querySelector("dialog:modal");

    for (const button of buttons) {
      if (button.matches(":disabled, [aria-disabled='true'], :focus-visible") || (modal && !modal.contains(button))) continue;
      if (button.closest("[data-header-hidden]")) continue;
      const box = button.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom <= 0 || box.top >= innerHeight) continue;
      // Measure the resting position so moving the button cannot pull it farther.
      const [tx = 0, ty = 0] = (getComputedStyle(button).translate || "none").split(" ").map((value) => parseFloat(value) || 0);
      const x = event.clientX - box.left + tx;
      const y = event.clientY - box.top + ty;
      const dx = x - box.width / 2;
      const dy = y - box.height / 2;
      const distance = Math.hypot(Math.max(0, Math.abs(dx) - box.width / 2), Math.max(0, Math.abs(dy) - box.height / 2));
      if (distance >= nearest) continue;
      nearest = distance;
      target = {
        button,
        x: Math.max(-lightOffset, Math.min(box.width + lightOffset, x)),
        y: Math.max(-lightOffset, Math.min(box.height + lightOffset, y)),
        dx,
        dy,
      };
    }

    if (active !== target?.button) reset();
    if (!target) return;
    const { button, x, y, dx, dy } = target;
    const length = Math.hypot(dx, dy);
    const strength = Math.min(0.18, 8 / Math.max(1, length));
    const pull = length < 2 ? 0 : strength * Math.max(0, 1 - nearest / magnetRange);
    button.style.setProperty("--button-pull-x", `${dx * pull}px`);
    button.style.setProperty("--button-pull-y", `${dy * pull}px`);
    button.style.setProperty("--button-light-x", `${x}px`);
    button.style.setProperty("--button-light-y", `${y}px`);
    button.style.setProperty("--button-shine", `${1 - 0.65 * nearest / lightRange}`);
    button.setAttribute("data-magnet-active", "");
    active = button;
  }

  function onFocus(event: FocusEvent) {
    if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) reset();
  }

  window.addEventListener("pointermove", followPointer, { passive: true });
  window.addEventListener("scroll", reset, { passive: true, capture: true });
  window.addEventListener("blur", reset);
  window.addEventListener("pointercancel", reset);
  document.addEventListener("focusin", onFocus);
  document.documentElement.addEventListener("pointerleave", reset);
  preference.addEventListener("change", reset);
  return () => {
    window.removeEventListener("pointermove", followPointer);
    window.removeEventListener("scroll", reset, true);
    window.removeEventListener("blur", reset);
    window.removeEventListener("pointercancel", reset);
    document.removeEventListener("focusin", onFocus);
    document.documentElement.removeEventListener("pointerleave", reset);
    preference.removeEventListener("change", reset);
  };
}

// Adapts React Bits Magnet and SpecularButton to the landing's existing controls.
export function LandingButtonEffects({ children, tone }: { children: ReactNode; tone: "blue" | "yellow" | "glass" | "badge" }) {
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const button = label.current?.parentElement;
    if (!button) return;
    buttons.add(button);
    disconnect ??= connectPointer();
    visibility ??= new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (buttons.has(target as HTMLElement)) target.toggleAttribute("data-button-in-view", isIntersecting);
      }
    });
    visibility.observe(button);
    return () => {
      if (active === button) reset();
      buttons.delete(button);
      visibility?.unobserve(button);
      button.removeAttribute("data-button-in-view");
      if (buttons.size === 0) {
        disconnect?.();
        disconnect = undefined;
        visibility?.disconnect();
        visibility = undefined;
      }
    };
  }, []);

  return (
    <>
      <span ref={label} className={styles.label} data-button-surface={tone}>{children}</span>
      {tone === "glass" && <GlassSurfaceFilter />}
      <span className={styles.rim} aria-hidden="true" data-button-rim="" />
    </>
  );
}
