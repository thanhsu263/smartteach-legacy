"use client";

import { useCallback, useRef } from "react";
import styles from "./landing-reveal.module.css";
import { useScrollReveal } from "./use-scroll-reveal";

const start = { opacity: 0 };
const end = { opacity: 1, duration: 0.28 };

// React Bits CountUp, using its count mode for the landing's existing values.
export default function CountUp({ to, decimals = 0, suffix = "" }) {
  const root = useRef(null);
  const visual = useRef(null);
  const finalText = `${to.toLocaleString("vi-VN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  const addCount = useCallback((timeline) => {
    const number = visual.current;
    const localized = new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const count = { value: 0 };
    number.textContent = `${localized.format(0)}${suffix}`;
    timeline.to(count, {
      value: to,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => { number.textContent = `${localized.format(count.value)}${suffix}`; },
    }, 0);
    return () => { number.textContent = finalText; };
  }, [to, decimals, suffix, finalText]);
  useScrollReveal(root, "[aria-hidden='true']", start, end, addCount);

  return (
    <span className={styles.count} ref={root}>
      <span>{finalText}</span>
      <span ref={visual} aria-hidden="true">{finalText}</span>
    </span>
  );
}
