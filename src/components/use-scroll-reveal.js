import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

export function useScrollReveal(ref, selector, from, to, addAnimation) {
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const trigger = layer.closest("h2, h3") ?? layer;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const parts = layer.querySelectorAll(selector);
      const timeline = gsap.timeline({ paused: true });
      timeline.fromTo(parts, from, { ...to, immediateRender: true });
      const cleanup = addAnimation?.(timeline);
      const show = () => timeline.progress(1).pause();
      const play = () => timeline.timeScale(1).play();
      const hide = () => timeline.timeScale(timeline.duration() / 0.48).reverse();

      ScrollTrigger.create({
        trigger,
        start: "clamp(top 96%)",
        end: "bottom top",
        onEnter: play,
        onEnterBack: show,
        onLeave: show,
        onUpdate: ({ isActive, direction }) => {
          if (isActive && direction === 1 && timeline.reversed()) play();
        },
      });
      ScrollTrigger.create({ trigger, start: "clamp(top 84%)", onLeaveBack: hide });
      ScrollTrigger.create({
        trigger,
        start: "top bottom",
        onLeaveBack: () => timeline.pause(0),
      });
      return cleanup;
    });
    return () => media.revert();
  }, [ref, selector, from, to, addAnimation]);
}
