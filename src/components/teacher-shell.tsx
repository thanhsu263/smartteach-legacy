"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BlocksIcon, ClipboardListIcon, CloseIcon, GamepadIcon, LogoMark, MenuIcon, PanelLeftIcon, SchoolIcon } from "@/components/icons";
import styles from "./teacher-shell.module.css";

type NavigationItem = { href: "/my-classes" | "/my-quizzes" | "/games" | "/tools"; label: string; Icon: typeof SchoolIcon };

const navigation: readonly NavigationItem[] = [
  { href: "/my-classes", label: "Lớp của tôi", Icon: SchoolIcon },
  { href: "/my-quizzes", label: "Quiz của tôi", Icon: ClipboardListIcon },
  { href: "/games", label: "Kho game", Icon: GamepadIcon },
  { href: "/tools", label: "Tiện ích", Icon: BlocksIcon },
];

function current(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`); }

function Navigation({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { status, signOut } = useAuth();
  return <nav aria-label="Điều hướng chính" className={styles.navigation}>
    {!compact ? <p className={styles.navHeading}>Không gian dạy học</p> : null}
    <ul>{navigation.map(({ href, label, Icon }) => <li key={href}>
      <Link href={href} className={styles.navLink} aria-current={current(pathname, href) ? "page" : undefined} aria-label={label} data-tooltip={compact ? label : undefined} onClick={onNavigate}>
        <Icon size={20} />{!compact ? <span>{label}</span> : null}
      </Link>
    </li>)}</ul>
    <div className={styles.navigationAccount}>
      {status === "signed-in" ? (
        <button type="button" onClick={() => { void signOut(); onNavigate?.(); }}>Đăng xuất</button>
      ) : (
        <Link href="/login" onClick={onNavigate}>Đăng nhập</Link>
      )}
    </div>
  </nav>;
}

export function TeacherShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { status, user, signOut } = useAuth();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  function closeMobileNavigation() {
    setMobileOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  return <div className={styles.shell} data-collapsed={collapsed}>
    <aside className={styles.sidebar} aria-label="Thanh điều hướng giáo viên">
      <Link href="/my-classes" className={styles.brand} aria-label="SmartTeach — Lớp học"><LogoMark size={40} />{!collapsed ? <span>SmartTeach</span> : null}</Link>
      <Navigation compact={collapsed} />
      <div className={styles.sidebarFooter}><button type="button" className={styles.collapseButton} aria-pressed={collapsed} aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"} data-tooltip={collapsed ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setCollapsed((value) => !value)}><PanelLeftIcon size={20} />{!collapsed ? <span>Thu gọn menu</span> : null}</button></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button ref={menuButtonRef} type="button" className={styles.mobileMenuButton} aria-label="Mở menu điều hướng" aria-expanded={mobileOpen} aria-controls="teacher-navigation" onClick={() => setMobileOpen(true)}><MenuIcon size={20} /></button>
        <p className={styles.breadcrumb}>Không gian dạy học</p>
        <div className={styles.account}>
          {status === "signed-in" && user?.email ? <span>{user.email}</span> : null}
          {status === "signed-in" ? <button type="button" aria-label="Thoát tài khoản" onClick={() => void signOut()}>Thoát</button> : <Link href="/login">Đăng nhập</Link>}
        </div>
      </header>
    </div>
    <dialog ref={dialogRef} id="teacher-navigation" className={styles.mobileDialog} aria-label="Điều hướng giáo viên" onClose={closeMobileNavigation} onClick={(event) => { if (event.target === event.currentTarget) closeMobileNavigation(); }}>
      <div className={styles.mobileDrawer}>
        <div className={styles.mobileDrawerTop}><Link href="/my-classes" className={styles.brand} onClick={closeMobileNavigation}><LogoMark size={40} /><span>SmartTeach</span></Link><button type="button" aria-label="Đóng menu" onClick={closeMobileNavigation}><CloseIcon size={20} /></button></div>
        <Navigation onNavigate={closeMobileNavigation} />
      </div>
    </dialog>
  </div>;
}
