"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { listClasses, listStudents, type ClassSummary } from "@/lib/classes/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./saved-class-picker.module.css";

type Props = {
  /** Gọi với tên học sinh của lớp được chọn, theo thứ tự đã lưu. */
  onPick: (names: string[]) => void;
};

/** Ô chọn lớp đã lưu để điền sẵn danh sách tên. Khách chưa đăng nhập không thấy phần này. */
export function SavedClassPicker({ onPick }: Props) {
  const { status, user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; classes: ClassSummary[] | null } | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const selectId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    listClasses(supabase).then((result) => {
      if (!cancelled) setLoaded({ userId, classes: result.ok ? result.classes : null });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (status !== "signed-in") return null;

  const current = loaded && loaded.userId === userId ? loaded : null;

  async function choose(id: string) {
    setSelected(id);
    setMessage(null);
    if (id === "") return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const result = await listStudents(supabase, id);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return;
    }
    const className = current?.classes?.find((item) => item.id === id)?.name ?? "";
    onPick(result.students.map((student) => student.name));
    setMessage({
      kind: "info",
      text: result.students.length === 0
        ? `Lớp “${className}” chưa có học sinh. Thêm tên ở Lớp của tôi.`
        : `Đã điền ${result.students.length} học sinh của lớp “${className}”.`,
    });
  }

  return (
    <div className={styles.picker}>
      <label htmlFor={selectId} className={styles.label}>
        Dùng lớp đã lưu
      </label>
      {current === null ? (
        <p className={styles.hint}>Đang tải danh sách lớp…</p>
      ) : current.classes === null ? (
        <p role="alert" className={styles.error}>
          Không tải được các lớp đã lưu. Thầy cô vẫn có thể nhập tên tay ở bên dưới.
        </p>
      ) : current.classes.length === 0 ? (
        <p className={styles.hint}>
          Thầy cô chưa lưu lớp nào. <Link href="/my-classes">Tạo lớp ở Lớp của tôi</Link> để dùng lại cho các tiện ích.
        </p>
      ) : (
        <select id={selectId} value={selected} onChange={(event) => choose(event.target.value)}>
          <option value="">Chọn một lớp…</option>
          {current.classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.studentCount} học sinh)
            </option>
          ))}
        </select>
      )}
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? styles.error : styles.hint}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
