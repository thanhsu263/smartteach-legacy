"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import styles from "./landing-animated-content.module.css";

// React Bits AnimatedContent with once=false, using the existing landing elements as targets.
export function LandingAnimatedContent() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const landing = marker.current?.parentElement;
    if (!landing) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      for (const target of landing.querySelectorAll<HTMLElement>("[data-animated-content]")) {
        target.classList.add(styles.content);
        const tween = gsap.fromTo(target, { "--content-y": "24px", opacity: 0 }, {
          "--content-y": "0px",
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          paused: true,
        });

        ScrollTrigger.create({
          trigger: target,
          start: "clamp(top 90%)",
          onEnter: () => tween.timeScale(1).play(),
          onLeaveBack: () => tween.timeScale(2).reverse(),
        });
      }
      return () => {
        for (const target of landing.querySelectorAll("[data-animated-content]")) target.classList.remove(styles.content);
      };
    });
    return () => media.revert();
  }, []);

  return <span ref={marker} hidden />;
}
