"use client";

import { useId, useState, type ComponentPropsWithRef } from "react";
import { UploadIcon } from "@/components/icons";
import styles from "./ui.module.css";

type FileDropProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label: string;
  hint?: string;
  /** Tên tệp do caller quản lý (ví dụ sau khi reset form); bỏ trống thì tự theo input. */
  selectedNames?: readonly string[];
};

/**
 * Vùng kéo-thả bọc `<input type="file">` thật: form submit, `name`, `accept`, `required`
 * và bàn phím giữ nguyên hành vi trình duyệt. Chỉ thêm phần hiển thị tên tệp đã chọn.
 */
export function FileDrop({ label, hint, selectedNames, onChange, id, className, ...props }: FileDropProps) {
  const fallback = useId();
  const inputId = id ?? fallback;
  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const shown = selectedNames ?? names;
  return (
    <div
      className={[styles.drop, className].filter(Boolean).join(" ")}
      data-dragging={dragging || undefined}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDrop={() => setDragging(false)}
    >
      <span className={styles.dropIcon} aria-hidden="true"><UploadIcon size={22} /></span>
      <label htmlFor={inputId}><strong>{label}</strong></label>
      {hint && <small id={`${inputId}-hint`}>{hint}</small>}
      <span className={styles.dropFile} aria-live="polite">{shown.length > 0 ? `Đã chọn: ${shown.join(", ")}` : ""}</span>
      <input
        {...props}
        id={inputId}
        type="file"
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        onChange={event => {
          setNames(Array.from(event.currentTarget.files ?? []).map(file => file.name));
          onChange?.(event);
        }}
      />
    </div>
  );
}
