"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { accountNav, loginNav, mainNav, type NavItem } from "@/config/navigation";
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

  const { status, signOut } = useAuth();
  const signedIn = status === "signed-in";

  return (
    <nav aria-label="Điều hướng chính" className={styles.nav}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        data-glass="btn"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
        <span>Menu</span>
      </button>
      <ul id="site-menu" className={styles.list} data-open={open}>
        {(signedIn ? [...mainNav, ...accountNav] : mainNav).map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={styles.link}
              data-glass="row"
              aria-current={isCurrent(pathname, item) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className={styles.login}>
          {signedIn ? (
            <button
              type="button"
              className={styles.link}
              data-glass="btn"
              data-variant="secondary"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              Đăng xuất
            </button>
          ) : (
            <Link
              href={loginNav.href}
              className={styles.link}
              data-glass="btn"
              data-variant="secondary"
              aria-current={isCurrent(pathname, loginNav) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {loginNav.label}
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
