"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { loginNav, mainNav, type NavItem } from "@/config/navigation";
import styles from "./site-nav.module.css";

function isCurrent(pathname: string, item: NavItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const items = [...mainNav, loginNav];

  return (
    <nav aria-label="Điều hướng chính" className={styles.nav}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        <span>Menu</span>
      </button>
      <ul id="site-menu" className={styles.list} data-open={open}>
        {items.map((item) => {
          const current = isCurrent(pathname, item);
          const isLogin = item.href === loginNav.href;
          return (
            <li key={item.href} className={isLogin ? styles.login : undefined}>
              <Link
                href={item.href}
                className={styles.link}
                aria-current={current ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
