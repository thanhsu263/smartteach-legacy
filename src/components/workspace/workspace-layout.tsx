import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./workspace-layout.module.css";

const classes = (base: string, extra?: string) => [base, extra].filter(Boolean).join(" ");

/** Layout only: values, submission, authorization and materials belong to callers. */
export function WorkspacePage({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={classes(styles.page, className)} />;
}

export function PageHeading({ title, description, actions, className }: { title: string; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return <header className={classes(styles.heading, className)}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className={styles.actions}>{actions}</div>}</header>;
}

export function WorkspaceSection({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return <section {...props} className={classes(styles.section, className)} />;
}

export function FieldLayout({ htmlFor, label, children, className }: { htmlFor: string; label: ReactNode; children: ReactNode; className?: string }) {
  return <div className={classes(styles.field, className)}><label htmlFor={htmlFor}>{label}</label>{children}</div>;
}

export function WorkspaceState({ tone = "empty", children, className }: { tone?: "empty" | "loading" | "error"; children: ReactNode; className?: string }) {
  return <div className={classes(styles.state, className)} role={tone === "error" ? "alert" : tone === "loading" ? "status" : undefined}>{children}</div>;
}
