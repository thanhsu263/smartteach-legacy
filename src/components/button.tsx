import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "on-primary";

type CommonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
};

type ButtonLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "children">;

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "children"> & { ref?: Ref<HTMLButtonElement> };

type IconButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  /** Tên thao tác là bắt buộc vì biểu tượng không tự truyền đạt đủ ngữ cảnh cho trình đọc màn hình. */
  "aria-label": string;
  children: ReactNode;
  /** Gợi ý ngắn cho người dùng chuột/bàn phím; mặc định dùng nhãn truy cập. */
  tooltip?: string | null;
  tone?: "default" | "danger";
};

function classes(extra?: string) {
  return [styles.button, extra].filter(Boolean).join(" ");
}

/** Vai trò thị giác của nút được định nghĩa tập trung trong styles/glass.css. */
function glass(variant: ButtonVariant) {
  return {
    "data-glass": "btn",
    "data-variant": variant,
  };
}

export function ButtonLink({
  variant = "secondary",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classes(className)} {...glass(variant)} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "secondary",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={classes(className)} {...glass(variant)} {...props}>
      {children}
    </button>
  );
}

/**
 * Nút chỉ có biểu tượng cho các thao tác lặp lại trong hàng danh sách.
 * Vẫn bắt buộc tên truy cập, tooltip và vùng bấm 44px để không biến biểu tượng thành thao tác bí mật.
 */
export function IconButton({
  className,
  type = "button",
  children,
  tooltip,
  tone = "default",
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  const hint = tooltip === null ? undefined : tooltip ?? ariaLabel;

  return (
    <button
      type={type}
      className={classes(className)}
      data-glass="icon"
      data-icon-only
      data-tone={tone === "danger" ? "danger" : undefined}
      data-tooltip={hint}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}
