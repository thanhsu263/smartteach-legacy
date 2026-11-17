"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/account-menu";
import {
  ActivityIcon,
  ArrowLeftIcon,
  BlocksIcon,
  CloseIcon,
  CreditCardIcon,
  DashboardIcon,
  FileTextIcon,
  GamepadIcon,
  ListIcon,
  LockIcon,
  LogoMark,
  MenuIcon,
  MessageIcon,
  PanelLeftIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";
import page from "./admin.module.css";
import styles from "./admin-shell.module.css";

type Item = { href: string; label: string; Icon: typeof UsersIcon };
type Group = { label: string | null; items: readonly Item[] };

/** Nhóm theo Q4 (plan 20261117): Tổng quan · Người dùng · Nội dung · Hệ thống. */
const groups: readonly Group[] = [
  { label: null, items: [{ href: "/admin", label: "Tổng quan", Icon: DashboardIcon }] },
  {
    label: "Người dùng",
    items: [
      { href: "/admin/users", label: "Tài khoản", Icon: UsersIcon },
      { href: "/admin/memberships", label: "Thành viên/đơn", Icon: CreditCardIcon },
      { href: "/admin/feedback", label: "Góp ý", Icon: MessageIcon },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { href: "/admin/library", label: "Duyệt học liệu", Icon: ShieldCheckIcon },
      { href: "/admin/games", label: "Danh mục game", Icon: GamepadIcon },
      { href: "/admin/rag/documents", label: "Tài liệu RAG", Icon: FileTextIcon },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/admin/ai", label: "AI/API", Icon: SparklesIcon },
      { href: "/admin/settings", label: "Cấu hình website", Icon: SettingsIcon },
      { href: "/admin/operations", label: "Vận hành", Icon: ActivityIcon },
      { href: "/admin/audit", label: "Nhật ký", Icon: ListIcon },
    ],
  },
];

const items = groups.flatMap(group => group.items);

function isCurrent(path: string, href: string) {
  return path === href || (href !== "/admin" && path.startsWith(`${href}/`));
}

const accountLinks = [
  { href: "/dashboard", label: "Về không gian dạy học", icon: <BlocksIcon size={18} /> },
  { href: "/account/security", label: "Bảo mật tài khoản", icon: <LockIcon size={18} /> },
] as const;

function Navigation({ idPrefix, collapsed = false, onNavigate }: { idPrefix: string; collapsed?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Điều hướng quản trị" className={styles.navigation}>
      {groups.map(group => {
        const headingId = group.label ? `${idPrefix}-${group.label}` : undefined;
        return (
          <div key={group.label ?? "root"} className={styles.group}>
            {group.label && <p id={headingId} className={styles.groupLabel}>{group.label}</p>}
            <ul aria-labelledby={headingId}>
              {group.items.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={styles.navLink}
                    aria-current={isCurrent(path, href) ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    onClick={onNavigate}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Shell quản trị theo ST/Shell (Figma 34:3800) với nhận diện riêng: sidebar navy, nhãn "Quản trị". */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const destination = items.find(item => isCurrent(path, item.href))?.label ?? "Tổng quan";

  useEffect(() => {
    const mobile = matchMedia("(width < 720px)");
    function syncMobile() {
      if (!mobile.matches && dialogRef.current?.open) dialogRef.current.close();
    }
    mobile.addEventListener("change", syncMobile);
    return () => mobile.removeEventListener("change", syncMobile);
  }, []);

  function openDrawer() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    dialogRef.current?.close();
  }

  const toggleLabel = collapsed ? "Mở rộng menu" : "Thu gọn menu";

  return (
    <div className={styles.shell} data-collapsed={collapsed || undefined}>
      <div id="admin-sidebar" className={styles.sidebar}>
        <Link href="/admin" className={styles.brand} aria-label="SmartTeach Quản trị">
          <LogoMark size={36} />
          <span className={styles.brandText}><strong>SmartTeach</strong> <small>Quản trị</small></span>
        </Link>
        <Navigation idPrefix="admin-nav" collapsed={collapsed} />
        <div className={styles.sidebarFooter}>
          <Link href="/dashboard" className={styles.navLink} title={collapsed ? "Về không gian dạy học" : undefined}>
            <ArrowLeftIcon size={20} /><span>Về không gian dạy học</span>
          </Link>
          <button type="button" className={`${styles.navLink} ${styles.collapse}`} aria-controls="admin-sidebar" aria-expanded={!collapsed} aria-label={toggleLabel} title={collapsed ? toggleLabel : undefined} onClick={() => setCollapsed(value => !value)}>
            <PanelLeftIcon size={20} /><span>{toggleLabel}</span>
          </button>
        </div>
      </div>
      <div className={styles.column}>
        <header className={styles.topbar} data-surface="float">
          <button ref={menuButtonRef} type="button" className={styles.menuButton} aria-label="Mở menu quản trị" aria-expanded={drawerOpen} aria-controls="admin-navigation" onClick={openDrawer}>
            <MenuIcon size={20} />
          </button>
          <p className={styles.breadcrumb}><span>Quản trị</span><span aria-hidden="true">/</span><strong>{destination}</strong></p>
          <AccountMenu links={accountLinks} />
        </header>
        <div className={page.workspace}>{children}</div>
      </div>
      <dialog
        ref={dialogRef}
        id="admin-navigation"
        className={styles.drawer}
        aria-label="Điều hướng quản trị"
        onClose={() => {
          setDrawerOpen(false);
          if (matchMedia("(width < 720px)").matches) menuButtonRef.current?.focus({ preventScroll: true });
        }}
        onClick={event => { if (event.target === event.currentTarget) closeDrawer(); }}
      >
        <div className={styles.drawerBody}>
          <div className={styles.drawerTop}>
            <Link href="/admin" className={styles.brand} onClick={closeDrawer}>
              <LogoMark size={36} />
              <span className={styles.brandText}><strong>SmartTeach</strong> <small>Quản trị</small></span>
            </Link>
            <button type="button" className={styles.menuButton} aria-label="Đóng menu" onClick={closeDrawer}><CloseIcon size={20} /></button>
          </div>
          <Navigation idPrefix="admin-drawer" onNavigate={closeDrawer} />
          <div className={styles.sidebarFooter}>
            <Link href="/dashboard" className={styles.navLink} onClick={closeDrawer}><ArrowLeftIcon size={20} /><span>Về không gian dạy học</span></Link>
          </div>
        </div>
      </dialog>
    </div>
  );
}
