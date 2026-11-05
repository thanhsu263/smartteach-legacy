"use client";

import { useState } from "react";

import styles from "@/app/page.module.css";

const links = [
  ["#tinh-nang", "Tính năng"],
  ["#hoc-lieu", "Kho học liệu"],
  ["#cach-dung", "Cách hoạt động"],
  ["#giao-vien", "Dành cho giáo viên"],
] as const;

export function LandingMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.mobileMenu}>
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label="Menu"
        aria-controls="site-menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      {isOpen ? (
        <nav id="site-menu" className={styles.mobileMenuPanel} aria-label="Điều hướng landing trên điện thoại">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setIsOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
