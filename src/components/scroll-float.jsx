"use client";

import { useRef } from "react";
import styles from "./landing-reveal.module.css";
import { useScrollReveal } from "./use-scroll-reveal";

const start = { opacity: 0, yPercent: 44.8, scaleY: 1.14 };
const end = { opacity: 1, yPercent: 0, scaleY: 1, duration: 1.3, ease: "power2.out", stagger: 0.09 };

// React Bits ScrollFloat, using a word stagger and the original heading as the scroll trigger.
export default function ScrollFloat({ children, accentLastLine = false }) {
  const text = useRef(null);
  const lines = children.split("\n");
  useScrollReveal(text, `.${styles.word}`, start, end);

  return (
    <span className={styles.float} ref={text} data-scroll-float="">
      <span className="visually-hidden">{lines.join(" ")}</span>
      <span aria-hidden="true">
        {lines.map((line, lineIndex) => (
          <span className={styles.line} key={lineIndex} data-float-accent={accentLastLine && lineIndex === lines.length - 1 ? "" : undefined}>
            {line.split(/(\s+)/).map((word, index) => word.trim()
              ? <span className={styles.word} key={index}>{word}</span>
              : word)}
          </span>
        ))}
      </span>
    </span>
  );
}
