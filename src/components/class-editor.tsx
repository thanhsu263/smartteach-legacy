"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button, ButtonLink, IconButton } from "@/components/button";
import { PencilIcon, TrashIcon } from "@/components/icons";
import {
  addStudents,
  deleteStudent,
  getClass,
  renameClass,
  renameStudent,
  type Result,
  type Student,
} from "@/lib/classes/api";
import { MAX_STUDENTS_PER_CLASS } from "@/lib/classes/limits";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { parseNames } from "@/lib/utilities/draw";
import styles from "./class-editor.module.css";

type Loaded = {
  key: string;
  result: Result<{ found: boolean; name: string; students: Student[] }>;
};

export function ClassEditor({ classId }: { classId: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${classId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [studentDraft, setStudentDraft] = useState("");
  const [addText, setAddText] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const addId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    getClass(supabase, classId).then((result) => {
      if (!cancelled) setLoaded({ key: `${userId}:${classId}`, result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, classId, reloadKey]);

  const current = loaded && loaded.key === key ? loaded.result : null;
  const reload = () => setReloadKey((value) => value + 1);

  async function run(action: (supabase: NonNullable<ReturnType<typeof getBrowserSupabase>>) => Promise<Result<object>>, info?: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) return false;
    setMessage(null);
    const result = await action(supabase);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.message });
      return false;
    }
    if (info) setMessage({ kind: "info", text: info });
    reload();
    return true;
  }

  if (current === null) {
    return (
      <div className={styles.skeleton} aria-busy="true">
        <p className="visually-hidden" role="status">
          Đang tải lớp…
        </p>
        <span className="glass-skeleton" />
        <span />
      </div>
    );
  }

  if (!current.ok) {
    return (
      <div className={styles.empty}>
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {current.message}
        </p>
        <Button variant="secondary" onClick={() => { setLoaded(null); reload(); }}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!current.found) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Không tìm thấy lớp này</h1>
        <p className={styles.hint}>Lớp có thể đã bị xoá, hoặc đường dẫn chưa đúng.</p>
        <ButtonLink href="/my-classes" variant="secondary">
          Về Lớp của tôi
        </ButtonLink>
      </div>
    );
  }

  const { name, students } = current;

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await run((supabase) => renameClass(supabase, classId, nameDraft))) setRenaming(false);
  }

  async function submitStudentRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (await run((supabase) => renameStudent(supabase, id, studentDraft))) setEditingId(null);
  }

  async function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = parseNames(addText);
    if (names.length === 0) {
      setMessage({ kind: "error", text: "Thầy cô nhập ít nhất một tên, mỗi dòng một bạn." });
      return;
    }
    if (await run((supabase) => addStudents(supabase, classId, names, students), `Đã thêm ${names.length} bạn.`)) {
      setAddText("");
    }
  }

  return (
    <div className={styles.editor}>
      <Breadcrumb items={[{ label: "Lớp của tôi", href: "/my-classes" }, { label: name }]} />

      <header className={styles.header}>
        {renaming ? (
          <form onSubmit={submitRename} className={styles.inline}>
            <label htmlFor={`${addId}-name`} className="visually-hidden">
              Tên lớp
            </label>
            <input
              id={`${addId}-name`}
              value={nameDraft}
              maxLength={100}
              onChange={(event) => setNameDraft(event.target.value)}
              autoFocus
            />
            <Button type="submit" variant="primary">
              Lưu
            </Button>
            <Button variant="secondary" onClick={() => setRenaming(false)}>
              Huỷ
            </Button>
          </form>
        ) : (
          <>
            <h1 className={styles.title}>{name}</h1>
            <Button
              variant="secondary"
              onClick={() => {
                setNameDraft(name);
                setRenaming(true);
              }}
            >
              Đổi tên lớp
            </Button>
          </>
        )}
      </header>

      <p className={styles.hint}>
        {students.length} / {MAX_STUDENTS_PER_CLASS} học sinh. Dùng danh sách này trong{" "}
        <Link href="/tools/draw">Bốc thăm tên</Link> và <Link href="/tools/groups">Chia nhóm</Link> bằng cách chọn lớp đã lưu.
      </p>

      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? styles.error : styles.notice}>
          {message.text}
        </p>
      ) : null}

      <section aria-labelledby={`${addId}-students`} className={styles.panel}>
        <h2 id={`${addId}-students`} className={styles.heading}>
          Học sinh
        </h2>
        {students.length === 0 ? (
          <p className={styles.hint}>Lớp chưa có học sinh. Thêm tên ở bên dưới.</p>
        ) : (
          <ol className={styles.students}>
            {students.map((student) => (
              <li key={student.id} className={styles.student}>
                {editingId === student.id ? (
                  <form onSubmit={(event) => submitStudentRename(event, student.id)} className={styles.inline}>
                    <label htmlFor={`${addId}-${student.id}`} className="visually-hidden">
                      Tên học sinh
                    </label>
                    <input
                      id={`${addId}-${student.id}`}
                      value={studentDraft}
                      maxLength={100}
                      onChange={(event) => setStudentDraft(event.target.value)}
                      autoFocus
                    />
                    <Button type="submit" variant="primary">
                      Lưu
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      Huỷ
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className={styles.studentName}>{student.name}</span>
                    <span className={styles.studentActions}>
                      <IconButton
                        aria-label={`Sửa tên ${student.name}`}
                        tooltip="Sửa tên"
                        onClick={() => {
                          setStudentDraft(student.name);
                          setEditingId(student.id);
                        }}
                      >
                        <PencilIcon size={20} />
                      </IconButton>
                      <IconButton
                        aria-label={`Xoá ${student.name}`}
                        tooltip="Xoá học sinh"
                        tone="danger"
                        onClick={() => run((supabase) => deleteStudent(supabase, student.id), `Đã xoá ${student.name}.`)}
                      >
                        <TrashIcon size={20} />
                      </IconButton>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby={`${addId}-add`} className={styles.panel}>
        <h2 id={`${addId}-add`} className={styles.heading}>
          Thêm học sinh
        </h2>
        <form onSubmit={submitAdd} className={styles.form}>
          <label htmlFor={addId}>Mỗi dòng một tên (có thể dán cả danh sách)</label>
          <textarea
            id={addId}
            rows={6}
            value={addText}
            spellCheck={false}
            onChange={(event) => setAddText(event.target.value)}
          />
          <p className={styles.hint}>{parseNames(addText).length} tên</p>
          <Button type="submit" variant="primary">
            Thêm vào lớp
          </Button>
        </form>
      </section>
    </div>
  );
}
