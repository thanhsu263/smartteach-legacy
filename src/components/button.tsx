import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "on-primary";

type CommonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
};

type ButtonLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "children">;

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "children">;

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
