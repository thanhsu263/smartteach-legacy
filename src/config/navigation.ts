export type NavItem = {
  href: string;
  label: string;
};

/** Liên kết chính trên header và footer. */
export const mainNav: readonly NavItem[] = [
  { href: "/games", label: "Kho game" },
  { href: "/tools", label: "Tiện ích" },
];

export const loginNav: NavItem = { href: "/login", label: "Đăng nhập" };

/** Chỉ hiện khi giáo viên đã đăng nhập. */
export const accountNav: NavItem = { href: "/my-classes", label: "Lớp của tôi" };
