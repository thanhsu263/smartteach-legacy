"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import styles from "./rubber-segment.module.css";

// Adapted from React Bits Rubber Segment for navigation with native links.
const spring = { type: "spring", duration: 0.3, bounce: 0 };
const stretch = { duration: 0.15, ease: [0.23, 1, 0.32, 1] };

export default function RubberSegment({ items, current, destination, className }) {
  const trackRef = useRef(null);
  const links = useRef(new Map());
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const selected = destination ?? current;
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const width = useMotionValue(0);
  const visible = useMotionValue(0);
  const clipPath = useTransform(() => `inset(0 ${Math.max(0, width.get() - right.get())}px 0 ${Math.max(0, left.get())}px round 10px)`);

  function slot(link) {
    const bounds = link.getBoundingClientRect();
    const start = bounds.left - trackRef.current.getBoundingClientRect().left;
    return { left: start, right: start + bounds.width };
  }

  useLayoutEffect(() => {
    const track = trackRef.current;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let generation = 0;
    function measure() {
      width.set(track.getBoundingClientRect().width);
      return links.current.get(selected);
    }

    function snap() {
      generation += 1;
      const link = measure();
      visible.set(link ? 1 : 0);
      const target = link ? slot(link) : { left: 0, right: 0 };
      left.jump(target.left);
      right.jump(target.right);
    }

    const link = measure();
    const target = link && slot(link);
    if (!target || !visible.get() || preference.matches) {
      snap();
    } else if (target.left !== left.get() || target.right !== right.get()) {
      const movingRight = target.left + target.right > left.get() + right.get();
      const id = ++generation;
      void Promise.all([
        animate(left, Math.min(left.get(), target.left), stretch),
        animate(right, Math.max(right.get(), target.right), stretch),
      ]).then(() => {
        if (generation !== id) return;
        const trail = movingRight ? left : right;
        const edge = movingRight ? target.left : target.right;
        animate(movingRight ? right : left, movingRight ? target.right : target.left, spring);
        void animate(trail, edge + (movingRight ? 2 : -2), spring).then(() => {
          if (generation === id) animate(trail, edge, { ...spring, duration: 0.16 });
        });
      });
    }

    let firstMeasurement = true;
    const observer = new ResizeObserver(() => {
      if (firstMeasurement) firstMeasurement = false;
      else snap();
    });
    observer.observe(track);
    for (const link of links.current.values()) observer.observe(link);
    preference.addEventListener("change", snap);
    return () => {
      generation += 1;
      observer.disconnect();
      preference.removeEventListener("change", snap);
      left.stop();
      right.stop();
    };
  }, [selected, left, right, width, visible]);

  function startDrag(event, id) {
    suppressClick.current = false;
    if (id !== selected || event.button !== 0 || event.pointerType !== "mouse" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = slot(event.currentTarget);
    drag.current = { id: event.pointerId, x: event.clientX, bounds, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const delta = event.clientX - gesture.x;
    if (!gesture.active && Math.abs(delta) < 6) return;
    gesture.active = true;
    const shift = Math.max(-gesture.bounds.left + 4, Math.min(delta, width.get() - gesture.bounds.right - 4));
    left.jump(gesture.bounds.left + shift);
    right.jump(gesture.bounds.right + shift);
  }

  function finishDrag(event) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    drag.current = null;
    if (!gesture.active) return;
    const center = (left.get() + right.get()) / 2;
    let closest;
    let distance = Infinity;
    for (const link of links.current.values()) {
      const bounds = slot(link);
      const gap = Math.abs(center - (bounds.left + bounds.right) / 2);
      if (gap < distance) {
        closest = link;
        distance = gap;
      }
    }

    if (event.type === "pointerup" && closest && closest !== event.currentTarget) closest.click();
    else if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      left.jump(gesture.bounds.left);
      right.jump(gesture.bounds.right);
    } else {
      animate(left, gesture.bounds.left, spring);
      animate(right, gesture.bounds.right, spring);
    }
    suppressClick.current = event.type === "pointerup";
  }

  function focusNeighbor(event, index) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const last = items.length - 1;
    const neighbors = new Map([["ArrowLeft", index - 1], ["ArrowRight", index + 1], ["Home", 0], ["End", last]]);
    const next = neighbors.get(event.key);
    if (next === undefined) return;
    event.preventDefault();
    links.current.get(items[Math.min(last, Math.max(0, next))][0])?.focus();
  }

  return (
    <nav ref={trackRef} className={`${className} ${styles.track}`} aria-label="Điều hướng landing">
      <motion.span className={styles.thumb} aria-hidden="true" style={{ clipPath, opacity: visible }} />
      {items.map(([id, label], index) => (
        <a
          key={id}
          ref={(link) => { if (link) links.current.set(id, link); else links.current.delete(id); }}
          href={`#${id}`}
          draggable={false}
          aria-current={current === id ? "location" : undefined}
          onPointerDown={(event) => startDrag(event, id)}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onKeyDown={(event) => focusNeighbor(event, index)}
          onClick={(event) => {
            if (suppressClick.current && event.detail > 0) {
              event.preventDefault();
              suppressClick.current = false;
            }
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
