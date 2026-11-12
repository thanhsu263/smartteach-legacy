export type NavItem = {
  href: string;
  label: string;
};

/** Liên kết chính trên header và footer. */
export const mainNav: readonly NavItem[] = [
  { href: "/games", label: "Kho game" },
  { href: "/library", label: "Kho học liệu" },
  { href: "/tools", label: "Tiện ích" },
];

export const loginNav: NavItem = { href: "/login", label: "Đăng nhập" };

export const privacyNav: NavItem = { href: "/privacy", label: "Quyền riêng tư" };

/** Chỉ hiện khi giáo viên đã đăng nhập. */
export const accountNav: readonly NavItem[] = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/assignments", label: "Bài đã giao" },
  { href: "/library", label: "Kho học liệu" },
  { href: "/my-quizzes", label: "Quiz của tôi" },
  { href: "/my-classes", label: "Lớp của tôi" },
];
