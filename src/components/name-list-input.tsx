import { useId } from "react";
import { parseNames } from "@/lib/utilities/draw";
import styles from "./name-list-input.module.css";

type NameListInputProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Ô nhập danh sách tên, mỗi dòng một tên; dùng chung cho bốc thăm và chia nhóm. */
export function NameListInput({ value, onChange }: NameListInputProps) {
  const id = useId();
  const count = parseNames(value).length;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Danh sách tên
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        placeholder={"Mỗi dòng một tên, ví dụ:\nMinh Anh\nGia Huy\nThảo My"}
        aria-describedby={`${id}-hint`}
        spellCheck={false}
      />
      <p id={`${id}-hint`} className={styles.hint}>
        {count === 0 ? "Chưa có tên nào. Dán hoặc gõ mỗi bạn một dòng." : `${count} tên`}
      </p>
    </div>
  );
}
