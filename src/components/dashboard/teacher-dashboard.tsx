"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { listAssignments } from "@/lib/assignments/api";
import type { AssignmentSummary } from "@/lib/assignments/types";
import { listClasses, type ClassSummary } from "@/lib/classes/api";
import { host } from "@/lib/live/rpc";
import { formatDateTime, type HistoryRow } from "@/lib/live/results";
import { listQuizzes } from "@/lib/quiz/api";
import type { QuizSummary } from "@/lib/quiz/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./teacher-dashboard.module.css";

type Block<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: T[] };

type DashboardState = {
  classes: Block<ClassSummary>;
  quizzes: Block<QuizSummary>;
  sessions: Block<HistoryRow>;
  assignments: Block<AssignmentSummary>;
};

const LOADING: DashboardState = {
  classes: { status: "loading" },
  quizzes: { status: "loading" },
  sessions: { status: "loading" },
  assignments: { status: "loading" },
};

function toBlock<T>(result: { ok: true; items: T[] } | { ok: false; message: string }): Block<T> {
  return result.ok ? { status: "ready", items: result.items } : { status: "error", message: result.message };
}

function BlockState({ block, empty, children, onRetry }: { block: Block<unknown>; empty: string; children: () => React.ReactNode; onRetry: () => void }) {
  if (block.status === "loading") {
    return <div className={styles.loading}>
      <p role="status">Đang tải…</p>
      <div aria-hidden="true" className="glass-skeleton" />
    </div>;
  }
  if (block.status === "error") {
    return (
      <div className={styles.blockError} role="alert">
        <p>{block.message}</p>
        <Button onClick={onRetry}>Thử lại</Button>
      </div>
    );
  }
  if (block.items.length === 0) return <p className={styles.emptyText}>{empty}</p>;
  return <>{children()}</>;
}

/** Tổng quan giáo viên: chỉ hiển thị dữ liệu đã có route/action thật. */
export function TeacherDashboard() {
  const [data, setData] = useState<DashboardState>(LOADING);
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setData(LOADING);
    setReloadKey((value) => value + 1);
  }

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;

    void listClasses(supabase).then((result) => {
      if (cancelled) return;
      setData((current) => ({
        ...current,
        classes: result.ok ? toBlock({ ok: true, items: result.classes.slice(0, 5) }) : toBlock(result),
      }));
    });
    void listQuizzes(supabase).then((result) => {
      if (cancelled) return;
      setData((current) => ({
        ...current,
        quizzes: result.ok ? toBlock({ ok: true, items: result.quizzes.slice(0, 5) }) : toBlock(result),
      }));
    });
    void host.history(supabase, { limit: 5, offset: 0 }).then((result) => {
      if (cancelled) return;
      setData((current) => ({
        ...current,
        sessions: result.ok ? toBlock({ ok: true, items: result.rows }) : toBlock(result),
      }));
    });
    void listAssignments(supabase, { limit: 5 }).then((result) => {
      if (cancelled) return;
      setData((current) => ({
        ...current,
        assignments: result.ok ? toBlock({ ok: true, items: result.assignments }) : toBlock(result),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const isNewAccount =
    data.classes.status === "ready" &&
    data.quizzes.status === "ready" &&
    data.sessions.status === "ready" &&
    data.assignments.status === "ready" &&
    data.classes.items.length === 0 &&
    data.quizzes.items.length === 0 &&
    data.sessions.items.length === 0;

  return (
    <div className={styles.page} data-workspace-controls>
      <header className={styles.header}>
        <div>
          <h1>Tổng quan</h1>
          <p>Tiếp tục việc dạy học của thầy cô từ nơi đã dừng.</p>
        </div>
        <div className={styles.quickActions} aria-label="Thao tác nhanh">
          <ButtonLink href="/my-quizzes" variant="primary">Tạo quiz</ButtonLink>
          <ButtonLink href="/my-classes" variant="secondary">Tạo lớp</ButtonLink>
        </div>
      </header>

      {isNewAccount ? (
        <section className={styles.onboarding} aria-labelledby="dashboard-start-title">
          <div>
            <h2 id="dashboard-start-title">Bắt đầu với một lớp hoặc một quiz</h2>
            <p>Lưu danh sách lớp để dùng lại trong tiện ích, hoặc soạn quiz để tổ chức một buổi chơi trực tiếp.</p>
          </div>
          <div className={styles.quickActions}>
            <ButtonLink href="/my-classes" variant="primary">Tạo lớp đầu tiên</ButtonLink>
            <ButtonLink href="/my-quizzes" variant="secondary">Tạo quiz đầu tiên</ButtonLink>
          </div>
          <p className={styles.onboardingLinks}>
            Cần dùng ngay? <Link href="/games">Mở kho game</Link> hoặc <Link href="/tools">chọn một tiện ích lớp học</Link>.
          </p>
        </section>
      ) : (
        <div className={styles.grid}>
          <section className={styles.section} aria-labelledby="dashboard-classes">
            <div className={styles.sectionHeading}>
              <h2 id="dashboard-classes">Lớp gần đây</h2>
              <Link href="/my-classes">Xem tất cả</Link>
            </div>
            <BlockState block={data.classes} empty="Thầy cô chưa có lớp nào." onRetry={reload}>
              {() => (
                <ul className={styles.list}>
                  {(data.classes as Extract<Block<ClassSummary>, { status: "ready" }>).items.map((item) => (
                    <li key={item.id}>
                      <Link href={`/my-classes/${item.id}`}>
                        <span>{item.name}</span>
                        <small>{item.studentCount} học sinh</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </BlockState>
          </section>

          <section className={styles.section} aria-labelledby="dashboard-quizzes">
            <div className={styles.sectionHeading}>
              <h2 id="dashboard-quizzes">Quiz gần đây</h2>
              <Link href="/my-quizzes">Xem tất cả</Link>
            </div>
            <BlockState block={data.quizzes} empty="Thầy cô chưa có quiz nào." onRetry={reload}>
              {() => (
                <ul className={styles.list}>
                  {(data.quizzes as Extract<Block<QuizSummary>, { status: "ready" }>).items.map((item) => (
                    <li key={item.id}>
                      <Link href={`/my-quizzes/${item.id}`}>
                        <span>{item.title}</span>
                        <small>{item.questionCount} câu hỏi</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </BlockState>
          </section>

          <section className={`${styles.section} ${styles.sessions}`} aria-labelledby="dashboard-sessions">
            <div className={styles.sectionHeading}>
              <h2 id="dashboard-sessions">Phiên gần đây</h2>
              <Link href="/host">Xem tất cả</Link>
            </div>
            <BlockState block={data.sessions} empty="Chưa có buổi chơi nào." onRetry={reload}>
              {() => (
                <ul className={styles.list}>
                  {(data.sessions as Extract<Block<HistoryRow>, { status: "ready" }>).items.map((item) => (
                    <li key={item.session_id}>
                      <Link href={item.ended_at ? `/host/${item.session_id}/results` : `/host/${item.session_id}`}>
                        <span>{item.quiz_title}</span>
                        <small>
                          {formatDateTime(item.created_at)} · {item.player_count} bạn chơi{item.ended_at ? "" : " · Đang diễn ra"}
                        </small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </BlockState>
          </section>

          <section className={`${styles.section} ${styles.sessions}`} aria-labelledby="dashboard-assignments">
            <div className={styles.sectionHeading}>
              <h2 id="dashboard-assignments">Bài đã giao</h2>
              <Link href="/assignments">Xem tất cả</Link>
            </div>
            <BlockState block={data.assignments} empty="Chưa có bài nào được giao." onRetry={reload}>
              {() => (
                <ul className={styles.list}>
                  {(data.assignments as Extract<Block<AssignmentSummary>, { status: "ready" }>).items.map((item) => (
                    <li key={item.id}>
                      <Link href={`/assignments/${item.id}`}>
                        <span>{item.title}</span>
                        <small>{item.className} · {item.status === "published" ? "Đang giao" : item.status === "draft" ? "Bản nháp" : "Đã đóng"}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </BlockState>
          </section>
        </div>
      )}
    </div>
  );
}
