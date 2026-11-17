"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { ChevronDownIcon, LogOutIcon, UserIcon } from "@/components/icons";
import styles from "./account-menu.module.css";

export type AccountMenuLink = { href: string; label: string; icon?: ReactNode };

/**
 * Nút "Tài khoản" trên topbar (Figma Shell 34:3800). Disclosure thay vì role=menu:
 * nội dung là link thường nên Tab/Shift+Tab đi qua tự nhiên; Escape và bấm ra ngoài đóng lại.
 */
export function AccountMenu({ links }: { links: readonly AccountMenuLink[] }) {
  const { status, user, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Đóng khi đổi route (điều chỉnh state trong render thay vì effect).
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status !== "signed-in") {
    return status === "loading" ? <span className={styles.placeholder} aria-hidden="true" /> : <Link href="/login" className={styles.trigger}>Đăng nhập</Link>;
  }

  return (
    <div ref={rootRef} className={styles.root} onBlur={event => { if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { setOpenedAt(pathname); setOpen(value => !value); }}
      >
        <UserIcon size={18} /><span>Tài khoản</span><ChevronDownIcon size={16} className={styles.chevron} />
      </button>
      <div id={panelId} className={styles.panel} data-surface="float" hidden={!open}>
        {user?.email && <p className={styles.email}><span>Đăng nhập với</span><strong>{user.email}</strong></p>}
        <ul>
          {links.map(link => (
            <li key={link.href}>
              <Link href={link.href} className={styles.item} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)}>
                {link.icon}<span>{link.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button type="button" className={styles.item} data-danger onClick={() => { setOpen(false); void signOut(); }}>
              <LogOutIcon size={18} /><span>Thoát tài khoản</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
