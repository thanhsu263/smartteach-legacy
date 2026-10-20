"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/button";
import { describeProblem } from "@/lib/quiz/errors";
import { getQuizProblems } from "@/lib/quiz/api";
import type { QuizProblem } from "@/lib/quiz/types";
import { endSessionAndNotify } from "@/lib/live/notify";
import { host } from "@/lib/live/rpc";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./host.module.css";

/** Số giây hiện đáp án khi tự động qua câu (máy chủ chỉ nhận đúng ba giá trị này). */
const REVEAL_CHOICES = [5, 8, 12] as const;

/** Khớp với `create_session`: bật kho báu cùng tự động thì hiện đáp án tối thiểu bấy nhiêu giây. */
const MIN_TREASURE_REVEAL = 8;

type ActiveSession = { id: string; pin: string } | null;

type Loaded = { quizId: string; active: ActiveSession; problems: QuizProblem[] | null; error: string | null };

/**
 * Nút "Chơi ngay" của một quiz và bảng bắt đầu phiên: chặn khi quiz còn lỗi (nêu lý do), báo nếu giáo viên
 * đang có phiên chưa kết thúc (cho tiếp tục hoặc kết thúc phiên cũ), chọn có tính thêm điểm tốc độ không.
 * `problems` truyền sẵn (trình soạn đã có) thì khỏi hỏi lại.
 */
export function StartSession({ quizId, problems: knownProblems = null }: { quizId: string; problems?: readonly QuizProblem[] | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [treasureMode, setTreasureMode] = useState(false);
  const [revealSeconds, setRevealSeconds] = useState<(typeof REVEAL_CHOICES)[number]>(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const [sessions, problems] = await Promise.all([
        supabase.from("live_sessions").select("id, pin, expires_at").neq("status", "ended"),
        knownProblems ? Promise.resolve({ ok: true as const, problems: [...knownProblems] }) : getQuizProblems(supabase, quizId),
      ]);
      if (cancelled) return;
      const now = Date.now();
      const row = (sessions.data as { id: string; pin: string; expires_at: string }[] | null)?.find((s) => Date.parse(s.expires_at) > now);
      setLoaded({
        quizId,
        active: row ? { id: row.id, pin: row.pin } : null,
        problems: problems.ok ? problems.problems : null,
        error: sessions.error || !problems.ok ? "Chưa kiểm tra được quiz và phiên đang chạy. Thầy cô thử lại nhé." : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, quizId, knownProblems, reloadKey]);

  const current = loaded && loaded.quizId === quizId ? loaded : null;
  // Trình soạn cập nhật danh sách lỗi theo từng lần lưu: ưu tiên bản mới nhất nó có.
  const problems = knownProblems ?? current?.problems ?? null;

  async function start() {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const result = await host.create(supabase, quizId, { speedBonus, autoAdvance, revealSeconds, treasureMode });
    if (result.ok) {
      router.push(`/host/${result.sessionId}`);
      return;
    }
    setBusy(false);
    setError(result.message);
    // Có thể vừa có phiên khác mở ở tab khác: tải lại để hiện đường dẫn tiếp tục.
    if (result.reason === "session_already_active") setReloadKey((n) => n + 1);
  }

  async function endOld(id: string) {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const result = await endSessionAndNotify(supabase, id);
    setBusy(false);
    setConfirmingEnd(false);
    if (!result.ok && result.reason !== "session_ended") {
      setError(result.message);
      return;
    }
    setReloadKey((n) => n + 1);
  }

  return (
    <div className={styles.startRoot}>
      <Button variant="secondary" aria-expanded={open} aria-controls={`${baseId}-panel`} onClick={() => setOpen((value) => !value)}>
        {open ? "Đóng" : "Chơi ngay"}
      </Button>

      {open ? (
        <div id={`${baseId}-panel`} className={styles.startPanel} role="group" aria-label="Bắt đầu phiên chơi">
          {!current && !knownProblems ? (
            <p role="status" className={styles.hint}>
              Đang kiểm tra quiz…
            </p>
          ) : current?.error ? (
            <>
              <p role="alert" className={styles.error}>
                {current.error}
              </p>
              <Button variant="secondary" onClick={() => setReloadKey((n) => n + 1)}>
                Thử lại
              </Button>
            </>
          ) : problems && problems.length > 0 ? (
            <>
              <p className={styles.notice}>
                <strong>Quiz chưa chơi được.</strong> Thầy cô sửa các điểm dưới đây rồi quay lại.
              </p>
              <ul className={styles.problemList}>
                {problems.map((problem) => (
                  <li key={`${problem.position}-${problem.code}`}>{describeProblem(problem.code, problem.position)}</li>
                ))}
              </ul>
              <Link href={`/my-quizzes/${quizId}`}>Sửa quiz</Link>
            </>
          ) : current?.active ? (
            <>
              <p className={styles.notice}>
                Thầy cô đang có một phiên chưa kết thúc (PIN <strong>{current.active.pin}</strong>). Mỗi lần chỉ chạy được một phiên.
              </p>
              {confirmingEnd ? (
                <div role="group" aria-label="Xác nhận kết thúc phiên cũ" className={styles.row}>
                  <p>Kết thúc phiên cũ? Học sinh đang chơi sẽ bị ngắt và điểm hiện có được giữ lại.</p>
                  <div className={styles.buttons}>
                    <Button variant="secondary" autoFocus onClick={() => setConfirmingEnd(false)}>
                      Giữ phiên
                    </Button>
                    <Button variant="secondary" disabled={busy} onClick={() => endOld(current.active!.id)}>
                      Kết thúc phiên cũ
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.buttons}>
                  <Button variant="primary" onClick={() => router.push(`/host/${current.active!.id}`)}>
                    Tiếp tục phiên đang chạy
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmingEnd(true)}>
                    Kết thúc phiên cũ
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <label className={styles.check}>
                <input type="checkbox" checked={speedBonus} onChange={(event) => setSpeedBonus(event.target.checked)} />
                <span>Tính thêm điểm theo tốc độ (trả lời nhanh được điểm cao hơn, 500 đến 1000 mỗi câu)</span>
              </label>
              <label className={styles.check}>
                <input type="checkbox" checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} />
                <span>Tự động qua câu (hết giờ thì hiện đáp án rồi tự sang câu kế; giữ màn hình điều khiển luôn hiển thị, không thu nhỏ hay che)</span>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={treasureMode}
                  onChange={(event) => {
                    setTreasureMode(event.target.checked);
                    if (event.target.checked && revealSeconds < MIN_TREASURE_REVEAL) setRevealSeconds(MIN_TREASURE_REVEAL);
                  }}
                />
                <span>
                  Chế độ giải trí: kho báu (sau 3 câu đúng, hoặc 3 câu sai hay bỏ trống liên tiếp, học sinh nhận một rương làm cộng, nhân, chia
                  hoặc trừ điểm của chính mình; không ảnh hưởng điểm bạn khác)
                </span>
              </label>
              {autoAdvance ? (
                <fieldset className={styles.choices}>
                  <legend className={styles.choicesLegend}>Thời gian hiện đáp án trước khi sang câu kế</legend>
                  {REVEAL_CHOICES.map((seconds) => {
                    // Kho báu cần đủ thời gian để học sinh mở rương: máy chủ ép tối thiểu 8 giây, nên không cho chọn 5.
                    const tooShort = treasureMode && seconds < MIN_TREASURE_REVEAL;
                    return (
                      <label key={seconds} className={styles.check} aria-disabled={tooShort}>
                        <input
                          type="radio"
                          name={`${baseId}-reveal`}
                          checked={revealSeconds === seconds}
                          disabled={tooShort}
                          onChange={() => setRevealSeconds(seconds)}
                        />
                        <span>{tooShort ? `${seconds} giây (kho báu cần tối thiểu ${MIN_TREASURE_REVEAL} giây)` : `${seconds} giây`}</span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}
              <div className={styles.buttons}>
                <Button variant="primary" disabled={busy} onClick={start}>
                  {busy ? "Đang tạo phiên…" : "Bắt đầu phiên"}
                </Button>
              </div>
            </>
          )}
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
