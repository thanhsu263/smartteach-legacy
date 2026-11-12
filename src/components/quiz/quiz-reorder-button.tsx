"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/button";
import styles from "./quiz-editor.module.css";

type Props = { label: string; hint: string; disabled: boolean; onClick: () => void; children: ReactNode };

export function QuizReorderButton({ label, hint, disabled, onClick, children }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const timeout = useRef(0);
  const stopTracking = useRef<() => void>(undefined);

  function hide() {
    window.clearTimeout(timeout.current);
    stopTracking.current?.();
    stopTracking.current = undefined;
    const tooltip = tooltipRef.current;
    if (tooltip?.hidePopover && tooltip.matches(":popover-open")) tooltip.hidePopover();
  }

  function show() {
    window.clearTimeout(timeout.current);
    const button = buttonRef.current;
    const tooltip = tooltipRef.current;
    if (!button || button.disabled || !tooltip?.showPopover || tooltip.matches(":popover-open")) return;
    tooltip.showPopover();

    function position() {
      const rect = button!.getBoundingClientRect();
      const { offsetWidth, offsetHeight } = tooltip!;
      const left = Math.max(8, Math.min(innerWidth - offsetWidth - 8, rect.left + (rect.width - offsetWidth) / 2));
      tooltip!.style.left = `${left}px`;
      tooltip!.style.top = `${rect.top > offsetHeight + 8 ? rect.top - offsetHeight - 3 : rect.bottom + 3}px`;
    }

    position();
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) hide();
    }) : undefined;
    observer?.observe(button);
    window.addEventListener("scroll", position, { capture: true, passive: true });
    window.addEventListener("resize", position);
    stopTracking.current = () => {
      observer?.disconnect();
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }

  useEffect(() => {
    if (disabled) hide();
    return hide;
  }, [disabled]);

  function dismissSoon() {
    window.clearTimeout(timeout.current);
    if (!buttonRef.current?.matches(":focus-visible")) timeout.current = window.setTimeout(hide, 80);
  }

  return <>
    <IconButton
      ref={buttonRef}
      aria-label={label}
      tooltip={null}
      disabled={disabled}
      onClick={() => { hide(); onClick(); }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        window.clearTimeout(timeout.current);
        timeout.current = window.setTimeout(show, 150);
      }}
      onPointerLeave={dismissSoon}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(); }}
      onBlur={hide}
      onKeyDown={(event) => {
        const tooltip = tooltipRef.current;
        if (event.key === "Escape" && tooltip?.hidePopover && tooltip.matches(":popover-open")) {
          event.stopPropagation();
          hide();
        }
      }}
    >{children}</IconButton>
    <span ref={tooltipRef} popover="manual" role="tooltip" className={styles.reorderTooltip} onPointerEnter={() => window.clearTimeout(timeout.current)} onPointerLeave={dismissSoon}>
      {hint}
    </span>
  </>;
}
