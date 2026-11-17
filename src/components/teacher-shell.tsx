"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountMenu, type AccountMenuLink } from "@/components/account-menu";
import { useAuth } from "@/components/auth-provider";
import { BlocksIcon, ClipboardListIcon, CloseIcon, CreditCardIcon, DashboardIcon, GamepadIcon, LogoMark, MenuIcon, MessageIcon, PanelLeftIcon, SchoolIcon, SettingsIcon, ShieldCheckIcon } from "@/components/icons";
import styles from "./teacher-shell.module.css";

type NavigationItem = { href: "/dashboard" | "/assignments" | "/my-classes" | "/my-quizzes" | "/my-exams" | "/library" | "/games" | "/tools"; label: string; Icon: typeof SchoolIcon };

const navigation: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Tổng quan", Icon: DashboardIcon },
  { href: "/assignments", label: "Bài đã giao", Icon: ClipboardListIcon },
  { href: "/my-classes", label: "Lớp của tôi", Icon: SchoolIcon },
  { href: "/my-quizzes", label: "Quiz của tôi", Icon: ClipboardListIcon },
  { href: "/my-exams", label: "Đề kiểm tra", Icon: ClipboardListIcon },
  { href: "/library", label: "Kho học liệu", Icon: BlocksIcon },
  { href: "/games", label: "Kho game", Icon: GamepadIcon },
  { href: "/tools", label: "Tiện ích", Icon: BlocksIcon },
];

// Q2: email, bảo mật, gói thành viên và thoát gom vào nút "Tài khoản" trên topbar.
const accountLinks: readonly AccountMenuLink[] = [
  { href: "/account/security", label: "Bảo mật tài khoản", icon: <ShieldCheckIcon size={18} /> },
  { href: "/membership", label: "Gói thành viên", icon: <CreditCardIcon size={18} /> },
];

function current(pathname: string, href: string) { return pathname === href || pathname.startsWith(`${href}/`); }

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { status, user } = useAuth();
  const [adminFor,setAdminFor] = useState<string|null>(null);
  useEffect(()=>{if(!user)return;let live=true;fetch("/api/admin/session",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(live)setAdminFor(d?.role==="admin"?user.id:null);}).catch(()=>{if(live)setAdminFor(null);});return()=>{live=false;};},[user]);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function revealCurrent() {
      if (!nav!.clientHeight) return;
      const active = nav!.querySelector('[aria-current="page"]');
      if (!active) return;
      const item = active.getBoundingClientRect();
      const area = nav!.getBoundingClientRect();
      if (item.top < area.top + 6) nav!.scrollTop += item.top - area.top - 6;
      else if (item.bottom > area.bottom - 6) nav!.scrollTop += item.bottom - area.bottom + 6;
    }

    revealCurrent();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(revealCurrent) : null;
    observer?.observe(nav);
    return () => observer?.disconnect();
  }, [pathname]);

  return <nav ref={navRef} aria-label="Điều hướng chính" className={styles.navigation}>
    <div className={styles.group}>
      <p className={styles.navHeading}>Không gian dạy học</p>
      <ul>{navigation.map(({ href, label, Icon }) => <li key={href}>
        <Link href={href} className={styles.navLink} aria-current={current(pathname, href) ? "page" : undefined} aria-label={label} onClick={onNavigate}>
          <Icon size={20} /><span>{label}</span>
        </Link>
      </li>)}</ul>
    </div>
    {status !== "loading" && <div className={styles.group}>
      <p className={styles.navHeading}>Khác</p>
      <ul>
        {/* Khách không có menu Tài khoản nên gói thành viên vẫn nằm ở sidebar. */}
        {status !== "signed-in" && <li><Link href="/membership" className={styles.navLink} aria-current={current(pathname, "/membership") ? "page" : undefined} aria-label="Gói thành viên" onClick={onNavigate}><CreditCardIcon size={20} /><span>Gói thành viên</span></Link></li>}
        {status === "signed-in" && <li><Link href="/feedback" className={styles.navLink} aria-current={current(pathname, "/feedback") ? "page" : undefined} aria-label="Góp ý" onClick={onNavigate}><MessageIcon size={20} /><span>Góp ý</span></Link></li>}
        {user && adminFor === user.id && <li><Link href="/admin" className={styles.navLink} aria-label="Quản trị hệ thống" onClick={onNavigate}><SettingsIcon size={20} /><span>Quản trị hệ thống</span></Link></li>}
      </ul>
    </div>}
  </nav>;
}

export function TeacherShell() {
  const pathname = usePathname();
  const destination = navigation.find(item => current(pathname, item.href))?.label
    ?? (pathname.startsWith("/membership") ? "Gói thành viên" : pathname.startsWith("/feedback") ? "Góp ý" : pathname.startsWith("/account") ? "Bảo mật tài khoản" : pathname === "/host" ? "Các buổi đã chơi" : "Nguồn học liệu");
  const [collapsed, setCollapsed] = useState(false);
  const [peek, setPeek] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pointerInside = useRef(false);
  const keyboardInside = useRef(false);
  const blockHover = useRef(false);
  const blockFocus = useRef(false);

  useEffect(() => {
    const mobile = matchMedia("(width < 720px)");
    const desktop = matchMedia("(width >= 960px)");
    const hover = matchMedia("(hover: hover) and (pointer: fine)");

    function syncMobile() {
      const dialog = dialogRef.current;
      if (mobile.matches || !dialog?.open) return;
      dialog.close();
      const sidebar = sidebarRef.current;
      (sidebar?.querySelector<HTMLElement>('[aria-current="page"]') ?? sidebar?.querySelector("a"))?.focus({ preventScroll: true });
    }

    function resetPeek() {
      pointerInside.current = false;
      blockHover.current = false;
      if (!desktop.matches) {
        keyboardInside.current = false;
        blockFocus.current = false;
      }
      if (!keyboardInside.current) setPeek(false);
    }

    mobile.addEventListener("change", syncMobile);
    desktop.addEventListener("change", resetPeek);
    hover.addEventListener("change", resetPeek);
    return () => {
      mobile.removeEventListener("change", syncMobile);
      desktop.removeEventListener("change", resetPeek);
      hover.removeEventListener("change", resetPeek);
    };
  }, []);

  function dismissPeek() {
    blockHover.current = pointerInside.current;
    blockFocus.current = keyboardInside.current || (sidebarRef.current?.contains(document.activeElement) && document.activeElement?.matches(":focus-visible")) || false;
    keyboardInside.current = false;
    setPeek(false);
  }

  function openMobileNavigation() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector("button")?.focus({ preventScroll: true });
    setMobileOpen(true);
  }

  function closeMobileNavigation() {
    dialogRef.current?.close();
  }

  const toggleLabel = collapsed ? "Mở rộng menu" : "Thu gọn menu";
  return <div className={styles.shell} data-collapsed={collapsed} data-peek={peek || undefined}>
    <aside
      ref={sidebarRef}
      id="teacher-sidebar"
      className={styles.sidebar}
      aria-label="Thanh điều hướng giáo viên"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || !matchMedia("(width >= 960px) and (hover: hover) and (pointer: fine)").matches) return;
        pointerInside.current = true;
        if (collapsed && !blockHover.current) setPeek(true);
      }}
      onPointerLeave={() => {
        pointerInside.current = false;
        blockHover.current = false;
        if (!keyboardInside.current) setPeek(false);
      }}
      onFocusCapture={(event) => {
        if (!matchMedia("(width >= 960px)").matches || !event.target.matches(":focus-visible")) return;
        keyboardInside.current = true;
        if (collapsed && !blockFocus.current) setPeek(true);
      }}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        keyboardInside.current = false;
        blockFocus.current = false;
        if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.matches(":focus-visible")) {
          blockHover.current = pointerInside.current;
          setPeek(false);
        } else if (!pointerInside.current || blockHover.current) setPeek(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !peek) return;
        event.preventDefault();
        dismissPeek();
      }}
    >
      <Link href="/dashboard" className={styles.brand} aria-label="SmartTeach — Tổng quan"><LogoMark size={40} /><span>SmartTeach</span></Link>
      <Navigation />
      <div className={styles.sidebarFooter}>
        <button ref={toggleRef} type="button" className={styles.collapseButton} aria-controls="teacher-sidebar" aria-expanded={!collapsed || peek} aria-label={toggleLabel} onClick={() => { dismissPeek(); setCollapsed(!collapsed); }}>
          <PanelLeftIcon size={20} /><span>{toggleLabel}</span>
        </button>
      </div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button ref={menuButtonRef} type="button" className={styles.mobileMenuButton} aria-label="Mở menu điều hướng" aria-expanded={mobileOpen} aria-controls="teacher-navigation" onClick={openMobileNavigation}><MenuIcon size={20} /></button>
        <p className={styles.breadcrumb}>Không gian dạy học <span aria-hidden="true"> / </span> {destination}</p>
        <AccountMenu links={accountLinks} />
      </header>
    </div>
    <dialog ref={dialogRef} id="teacher-navigation" className={styles.mobileDialog} aria-label="Điều hướng giáo viên" onClose={(event) => {
      if (event.currentTarget.open) return;
      setMobileOpen(false);
      if (matchMedia("(width < 720px)").matches) menuButtonRef.current?.focus({ preventScroll: true });
    }} onClick={(event) => { if (event.target === event.currentTarget) closeMobileNavigation(); }}>
      <div className={styles.mobileDrawer}>
        <div className={styles.mobileDrawerTop}><Link href="/dashboard" className={styles.brand} onClick={closeMobileNavigation}><LogoMark size={40} /><span>SmartTeach</span></Link><button type="button" aria-label="Đóng menu" onClick={closeMobileNavigation}><CloseIcon size={20} /></button></div>
        <Navigation onNavigate={closeMobileNavigation} />
      </div>
    </dialog>
  </div>;
}
