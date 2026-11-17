import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { InboxIcon } from "@/components/icons";
import styles from "./ui.module.css";

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

/** Figma Card 27:19241: nền trắng đặc, viền nhạt, bo 12 (lg = 16). */
export function Card({ size = "md", className, ...props }: ComponentPropsWithoutRef<"section"> & { size?: "md" | "lg" }) {
  return <section {...props} data-size={size === "lg" ? "lg" : undefined} className={cx(styles.card, className)} />;
}

export function CardHeader({ title, description, actions, level = 2, id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; level?: 2 | 3; id?: string }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <header className={styles.cardHead}>
      <div>
        <Heading id={id}>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </header>
  );
}

/** Figma Empty State 27:19465. Vai trò status/alert do caller chọn qua `role`. */
export function EmptyState({ title, description, icon, actions, level = 2, role, className }: { title: ReactNode; description?: ReactNode; icon?: ReactNode; actions?: ReactNode; level?: 1 | 2 | 3; role?: "status" | "alert"; className?: string }) {
  const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return (
    <div className={cx(styles.empty, className)} role={role}>
      <span className={styles.emptyIcon} aria-hidden="true">{icon ?? <InboxIcon />}</span>
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {actions && <div className={styles.emptyActions}>{actions}</div>}
    </div>
  );
}

export type StatusTone = "neutral" | "ok" | "warn" | "bad" | "info";

/** Nhãn trạng thái dạng pill; màu chỉ bổ trợ, chữ luôn mang nghĩa. */
export function StatusBadge({ tone = "neutral", children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return <span className={cx(styles.badge, className)} data-tone={tone === "neutral" ? undefined : tone}>{children}</span>;
}

/** Figma Progress 27:19506: dùng `<progress>` gốc để trình đọc màn hình đọc được giá trị. */
export function ProgressMeter({ label, value, max, valueText, tone }: { label: string; value: number; max: number; valueText?: ReactNode; tone?: "warn" | "bad" }) {
  return (
    <div className={styles.progress} data-tone={tone}>
      <div className={styles.progressHead}><span>{label}</span><span>{valueText ?? `${value}/${max}`}</span></div>
      <progress value={Math.min(value, Math.max(max, 1))} max={Math.max(max, 1)} aria-label={label} />
    </div>
  );
}

/** Khung bảng cuộn ngang cục bộ; caller giữ nguyên `<table>` ngữ nghĩa. */
export function TableFrame({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={cx(styles.table, className)} />;
}

export function FieldHelp({ id, children }: { id: string; children: ReactNode }) {
  return <small id={id} className={styles.help}>{children}</small>;
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return <small id={id} className={styles.error} role="alert">{children}</small>;
}

export function Skeleton({ width = "100%", height = "1em", className }: { width?: string; height?: string; className?: string }) {
  return <span aria-hidden="true" className={cx(styles.skeleton, className)} style={{ width, height }} />;
}

/** Figma Chip 27:18843 dạng chọn nhiều: mỗi chip là checkbox thật trong fieldset có legend. */
export function ChoiceChips({ legend, options, value, onChange, name, disabled }: { legend: string; options: ReadonlyArray<{ value: string; label: string }>; value: readonly string[]; onChange: (next: string[]) => void; name?: string; disabled?: boolean }) {
  return (
    <fieldset className={styles.chips} disabled={disabled}>
      <legend>{legend}</legend>
      <div>
        {options.map(option => (
          <label key={option.value} className={styles.chip}>
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={value.includes(option.value)}
              onChange={event => onChange(event.currentTarget.checked ? options.filter(o => o.value === option.value || value.includes(o.value)).map(o => o.value) : value.filter(v => v !== option.value))}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
