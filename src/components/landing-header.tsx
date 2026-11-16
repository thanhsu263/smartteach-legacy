"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "@/app/page.module.css";
import { LandingMobileMenu } from "./landing-mobile-menu";
import { GlassSurfaceFilter } from "./glass-surface-filter";
import RubberSegment from "./rubber-segment";

const links = [
  ["tinh-nang", "Tính năng"],
  ["giao-vien", "Dành cho giáo viên"],
  ["cach-dung", "Cách hoạt động"],
  ["hoc-lieu", "Kho học liệu"],
] as const;

function landingUrl() {
  return location.pathname + location.search;
}

export function LandingHeader({ brand, account }: { brand: ReactNode; account: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [current, setCurrent] = useState<string>();
  const [destination, setDestination] = useState<string>();

  useEffect(() => {
    const header = headerRef.current;
    const menu = menuRef.current;
    const landing = header?.parentElement;
    if (!header || !landing || !menu) return;
    const sections = [...landing.querySelectorAll<HTMLElement>("section[id]")];
    const desktop = matchMedia("(width > 1000px)");
    const motion = matchMedia("(width > 1000px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let previousY = Math.max(0, scrollY);
    let travel = 0;
    let frame = 0;
    let focusFrame = 0;
    let anchorTimer = 0;
    let anchorPending = false;
    let hidden = false;
    let lastSection: string | undefined;
    let menuFocus: string | null = null;
    let touchInput = false;

    function changeVisibility(nextHidden: boolean) {
      if (hidden === nextHidden) return;
      hidden = nextHidden;
      header!.toggleAttribute("data-header-hidden", hidden);
      if (hidden) window.addEventListener("pointermove", revealAtEdge, { passive: true });
      else window.removeEventListener("pointermove", revealAtEdge);
    }

    function show() {
      travel = 0;
      changeVisibility(false);
    }

    function revealAtEdge(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.clientY <= 12) show();
    }

    function releaseAnchor() {
      if (!anchorPending) return;
      window.clearTimeout(anchorTimer);
      anchorPending = false;
      setDestination(undefined);
      previousY = Math.max(0, scrollY);
      travel = 0;
    }

    function refresh() {
      frame = 0;
      const y = Math.max(0, scrollY);
      const delta = y - previousY;
      previousY = y;
      const height = header!.offsetHeight;
      const active = sections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= height + 13 && rect.bottom > height + 13;
      })?.id;

      if (active !== lastSection) {
        lastSection = active;
        setCurrent(active);
      }
      header!.toggleAttribute("data-header-scrolled", y > 0);
      if (!motion.matches || touchInput || document.hidden || y <= 0 || anchorPending || menu!.open || header!.matches(":focus-within, :hover")) {
        show();
        return;
      }
      if (!delta) return;
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (y > height && travel >= 24) changeVisibility(true);
      if (travel <= -12) show();
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(refresh);
    }

    function onScroll() {
      if (anchorPending) {
        window.clearTimeout(anchorTimer);
        anchorTimer = window.setTimeout(releaseAnchor, 160);
      }
      schedule();
    }

    function scrollToSection(target: HTMLElement, behavior: ScrollBehavior = "auto") {
      window.dispatchEvent(new Event("landing:navigate"));
      target.scrollIntoView({ block: "start", behavior });
    }

    function onAnchor(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const target = sections.find(({ id }) => anchor?.hash === `#${id}`);
      if (!anchor || !landing!.contains(anchor) || !target) return;

      event.preventDefault();
      releaseAnchor();
      anchorPending = true;
      setDestination(target.id);
      anchorTimer = window.setTimeout(releaseAnchor, 240);
      show();
      const inMenu = menu!.contains(anchor);
      if (inMenu) menu!.open = false;
      if (history.state?.landingSection !== target.id) {
        history.pushState({ landingSection: target.id }, "", landingUrl());
      }
      scrollToSection(target);
      if (inMenu || event.detail === 0) {
        cancelAnimationFrame(focusFrame);
        // Animated wrappers may hydrate after the menu. Focusing an ancestor
        // with visibility:hidden is ignored, so wait until its heading is visible.
        let remaining = 120;
        const focusHeading = () => {
          const heading = target.querySelector("h2");
          if (heading && heading.getClientRects().length && getComputedStyle(heading).visibility === "visible") {
            heading.focus({ preventScroll: true });
          } else if (--remaining > 0) focusFrame = requestAnimationFrame(focusHeading);
        };
        focusFrame = requestAnimationFrame(focusHeading);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") cancelAnimationFrame(focusFrame);
      if (event.key === "Escape" && menu!.open) {
        event.preventDefault();
        menu!.open = false;
        menu!.querySelector("summary")?.focus({ preventScroll: true });
      }
    }

    function onPointerDown(event: PointerEvent) {
      cancelAnimationFrame(focusFrame);
      touchInput = event.pointerType === "touch";
      if (touchInput) show();
      if (anchorPending) releaseAnchor();
    }

    function onWheel() {
      touchInput = false;
      releaseAnchor();
    }

    function onResize() {
      if (desktop.matches && menu!.open) {
        menu!.open = false;
        if (menuFocus !== null) {
          const navLinks = [...header!.querySelectorAll<HTMLAnchorElement>(`nav.${styles.nav} a`)];
          (navLinks.find((link) => link.hash === menuFocus) ?? navLinks[0])?.focus({ preventScroll: true });
        }
      }
      show();
      schedule();
    }

    function onFocus(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (menu!.contains(target)) menuFocus = target instanceof HTMLAnchorElement ? target.hash : "";
      else if (target !== document.body) menuFocus = null;
      if (header!.contains(target)) show();
    }

    function onHash() {
      const target = sections.find(({ id }) => location.hash === `#${id}`);
      if (!target) return;
      history.replaceState({ ...history.state, landingSection: target.id }, "", landingUrl());
      scrollToSection(target, "instant");
      show();
      schedule();
    }

    function onHistory() {
      if (location.hash) return;
      show();
      schedule();
    }

    function onVisibility() {
      cancelAnimationFrame(frame);
      frame = 0;
      show();
      releaseAnchor();
      if (!document.hidden) schedule();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", releaseAnchor);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHistory);
    motion.addEventListener("change", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("click", onAnchor);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKeyDown);
    onHash();
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      releaseAnchor();
      show();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", releaseAnchor);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHistory);
      motion.removeEventListener("change", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("click", onAnchor);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const items = links.map(([id, label]) => (
    <a key={id} href={`#${id}`} aria-current={current === id ? "location" : undefined}>{label}</a>
  ));

  return (
    <header ref={headerRef} className={styles.header} data-no-button-rim="">
      <GlassSurfaceFilter strength={14} />
      {brand}
      <RubberSegment className={styles.nav} items={links} current={current} destination={destination} />
      <LandingMobileMenu menuRef={menuRef}>{items}</LandingMobileMenu>
      {account}
    </header>
  );
}
