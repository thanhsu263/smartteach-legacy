"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button, ButtonLink } from "@/components/button";
import { ToolStage } from "@/components/tool-stage";
import { host, type LiveResult } from "@/lib/live/rpc";
import type { HostPlayer, HostState } from "@/lib/live/types";
import { useHostLive } from "@/lib/live/use-live-state";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { HostLobby } from "./lobby";
import { Podium } from "./podium";
import { QuestionView } from "./question-view";
import { RevealView } from "./reveal-view";
import styles from "./host.module.css";

function announcement(state: HostState | null): string {
  if (!state) return "";
  switch (state.status) {
    case "lobby":
      return "Phòng chờ. Chờ các bạn vào phòng.";
    case "question":
      return `Câu ${state.question_index} trên ${state.question_total} đang mở: ${state.question?.prompt ?? ""}`;
    case "reveal":
      return `Đã hiện đáp án câu ${state.question_index}.`;
    case "ended":
      return "Phiên chơi đã kết thúc.";
  }
}

/** Khoảng bỏ qua phím Space sau mỗi lần đổi pha (ms). */
const SPACE_COOLDOWN_MS = 1200;

const INTERACTIVE = new Set(["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "SUMMARY"]);

/** Cả màn chiếu lẫn bảng điều khiển của một phiên chơi trực tiếp, trên một trang. */
export function HostScreen({ sessionId }: { sessionId: string }) {
  const live = useHostLive(sessionId);
  const state = live.state;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<(() => void) | null>(null);
  // Lúc đổi pha gần nhất: phím Space ngay sau đó bị bỏ qua để bấm đúp hay phím lặp không đóng luôn câu vừa mở.
  const phaseChangedAt = useRef(0);

  async function run(task: (supabase: SupabaseClient) => Promise<LiveResult<object>>) {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage(null);
    const result = await live.act(() => task(supabase));
    setBusy(false);
    if (!result.ok) setMessage(result.message);
  }

  /**
   * Hết giờ: nhờ máy chủ đóng câu (chỉ đóng khi giờ máy chủ đã qua hạn). Trả true nếu đã đóng; false nếu chưa tới
   * hạn hoặc gặp lỗi (lỗi được báo cho giáo viên và sẽ thử lại).
   */
  async function closeOnTimeUp(): Promise<boolean> {
    const supabase = getBrowserSupabase();
    if (!supabase) return false;
    const result = await live.act(() => host.closeIfExpired(supabase, sessionId));
    if (!result.ok) {
      setMessage(result.message);
      return false;
    }
    setMessage(null);
    return result.closed;
  }

  const activeCount = state ? state.players.filter((player) => !player.removed).length : 0;
  const status = state?.status;

  // Phím tắt Space cho thao tác chính (bắt đầu, hiện đáp án, câu tiếp theo), không ghi đè Space trên nút hay ô nhập.
  useEffect(() => {
    primaryRef.current =
      status === "lobby" && activeCount > 0
        ? () => void run((s) => host.open(s, sessionId))
        : status === "question"
          ? () => void run((s) => host.close(s, sessionId))
          : status === "reveal"
            ? () => void run((s) => host.next(s, sessionId))
            : null;
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;
      if (performance.now() - phaseChangedAt.current < SPACE_COOLDOWN_MS) return;
      const target = event.target as HTMLElement | null;
      if (target && (INTERACTIVE.has(target.tagName) || target.isContentEditable)) return;
      if (!primaryRef.current) return;
      event.preventDefault();
      primaryRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Sang pha mới thì đưa focus về đầu màn hình (nút vừa bấm có thể đã đổi hoặc biến mất).
  const phaseKey = state ? `${state.status}-${state.question_index}` : "none";
  const firstKey = useRef(phaseKey);
  useEffect(() => {
    if (phaseKey === "none") return;
    phaseChangedAt.current = performance.now();
    if (phaseKey === firstKey.current) return;
    focusRef.current?.focus({ preventScroll: true });
  }, [phaseKey]);

  if (live.fatal) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Không tìm thấy phiên chơi này</h1>
        <p className={styles.hint}>Phiên có thể không phải của thầy cô, hoặc đã bị xoá. {live.error ?? ""}</p>
        <ButtonLink href="/my-quizzes" variant="secondary">
          Về Quiz của tôi
        </ButtonLink>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.screen} aria-busy="true">
        <h1 className={styles.title}>Đang tải phiên chơi…</h1>
      </div>
    );
  }

  const ended = state.status === "ended";
  const offline = live.status === "offline" || live.error !== null;

  const endButton = ended ? null : (
    <Button variant="secondary" onClick={() => setConfirmEnd(true)} aria-expanded={confirmEnd}>
      Kết thúc phiên
    </Button>
  );

  let body;
  if (state.status === "lobby") {
    body = (
      <HostLobby
        title={state.quiz_title}
        pin={state.pin}
        locked={state.locked}
        players={state.players}
        busy={busy}
        onToggleLock={() => void run((s) => host.setLocked(s, sessionId, !state.locked))}
        onRemove={(player: HostPlayer) => void run((s) => host.remove(s, sessionId, player.id))}
        onStart={() => void run((s) => host.open(s, sessionId))}
      />
    );
  } else if (state.status === "question") {
    body = (
      <QuestionView
        key={state.question_index}
        state={state}
        clock={live.clock}
        busy={busy}
        onShowAnswer={() => void run((s) => host.close(s, sessionId))}
        onTimeUp={closeOnTimeUp}
      />
    );
  } else if (state.status === "reveal") {
    body = <RevealView state={state} busy={busy} onNext={() => void run((s) => host.next(s, sessionId))} />;
  } else {
    const total = state.players.filter((player) => !player.removed).length;
    body = (
      <div className={styles.screen}>
        <h1 className={styles.title}>Kết thúc: {state.quiz_title}</h1>
        <p className={styles.hint}>
          {total} bạn đã chơi {state.question_total} câu.
        </p>
        <section aria-label="Bục vinh danh">
          <h2 className={styles.reviewTitle}>Top 3</h2>
          <Podium rows={state.leaderboard ?? []} />
        </section>
        <div className={styles.controls}>
          <ButtonLink href="/my-quizzes" variant="primary">
            Về Quiz của tôi
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <ToolStage label="Màn hình chiếu của phiên chơi" actions={endButton}>
      <div ref={focusRef} tabIndex={-1} className={styles.focusRoot}>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement(state)}
        </p>

        {confirmEnd && !ended ? (
          <div className={styles.confirm} role="group" aria-label="Xác nhận kết thúc phiên">
            <p>Kết thúc phiên ngay? Các bạn đang chơi sẽ bị ngắt, điểm đã tính được giữ lại.</p>
            <div className={styles.buttons}>
              <Button variant="secondary" autoFocus onClick={() => setConfirmEnd(false)}>
                Giữ phiên
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setConfirmEnd(false);
                  void run((s) => host.end(s, sessionId));
                }}
              >
                Kết thúc phiên
              </Button>
            </div>
          </div>
        ) : null}

        {offline ? (
          <p role="status" className={styles.banner}>
            Mất kết nối. Đang thử lại…
          </p>
        ) : null}
        {message ? (
          <p role="alert" className={styles.error}>
            {message}
          </p>
        ) : null}

        {body}

        {ended ? null : (
          <p className={styles.hint}>
            Các bạn chơi tại <strong>/play</strong>. Thầy cô có thể chiếu trang này toàn màn hình.
          </p>
        )}
      </div>
    </ToolStage>
  );
}
