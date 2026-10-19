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

function classes(variant: ButtonVariant, extra?: string) {
  return [styles.button, styles[variant], extra].filter(Boolean).join(" ");
}

export function ButtonLink({
  variant = "secondary",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classes(variant, className)} {...props}>
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
    <button type={type} className={classes(variant, className)} {...props}>
      {children}
    </button>
  );
}
