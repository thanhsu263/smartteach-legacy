"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { playerAnnouncement } from "@/lib/live/announce";
import { player } from "@/lib/live/rpc";
import type { AnswerValue } from "@/lib/live/types";
import { usePlayerLive } from "@/lib/live/use-live-state";
import { useStoredPlayer } from "@/lib/live/use-stored-player";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Final } from "./final";
import { JoinForm } from "./join-form";
import { Lobby } from "./lobby";
import { Question } from "./question";
import { Result } from "./result";
import { StatusBanner } from "./status-banner";
import styles from "./player.module.css";

/** Toàn bộ luồng của học sinh: nhập PIN, phòng chờ, từng câu, kết quả, kết thúc. */
export function PlayScreen({ initialPin }: { initialPin: string }) {
  const stored = useStoredPlayer();
  const token = stored.player?.token ?? null;
  const live = usePlayerLive(token);
  const state = live.state;
  const focusRef = useRef<HTMLDivElement>(null);

  // Sang pha hoặc câu mới thì đưa focus về đầu màn hình, nếu không nút vừa bấm bị gỡ khiến focus rơi về đầu trang.
  const phaseKey = state ? `${state.phase}-${state.question_index ?? 0}` : "none";
  const firstKey = useRef(phaseKey);
  useEffect(() => {
    if (phaseKey === firstKey.current || phaseKey === "none") return;
    focusRef.current?.focus({ preventScroll: true });
  }, [phaseKey]);

  /**
   * Rời phòng: quên mã ở máy này TRƯỚC (để vòng hỏi trạng thái dừng ngay, nếu không sẽ thấy "mã hết hiệu lực"
   * thoáng qua), rồi báo máy chủ trả chỗ và biệt danh. Báo thất bại (mất mạng) thì đành để người chơi ma
   * cho giáo viên loại.
   */
  function leave() {
    const supabase = getBrowserSupabase();
    const leavingToken = token;
    stored.forget();
    if (supabase && leavingToken) void player.leave(supabase, leavingToken);
  }

  async function submit(answer: AnswerValue) {
    const supabase = getBrowserSupabase();
    if (!supabase || !token) return { ok: false as const, message: "Chưa kết nối được máy chủ.", fatal: false };
    const result = await player.submit(supabase, token, answer);
    if (result.ok) void live.refresh();
    return result;
  }

  if (!stored.ready) {
    return (
      <div className={styles.screen} aria-busy="true">
        <h1 className={styles.title}>Đang tải…</h1>
      </div>
    );
  }

  if (!token || live.fatal) {
    return (
      <JoinForm
        key={token ?? "new"}
        initialPin={initialPin}
        notice={live.fatal ? live.error : null}
        onJoined={(joined) => stored.remember(joined)}
      />
    );
  }

  const offline = live.status === "offline" || live.error !== null;

  let body;
  if (!state) {
    body = (
      <div className={styles.screen} aria-busy="true">
        <p role="status" className={`${styles.waiting} animate-fade-up`}>
          Đang vào phòng…
        </p>
      </div>
    );
  } else if (state.phase === "lobby") {
    body = <Lobby nickname={state.nickname} playerCount={state.player_count ?? 0} persisted={stored.persisted} onLeave={leave} />;
  } else if (state.phase === "question") {
    body = <Question key={state.question_index} state={state} clock={live.clock} submit={submit} />;
  } else if (state.phase === "reveal") {
    body = <Result state={state} token={token} clock={live.clock} onChestOpened={() => void live.refresh()} />;
  } else if (state.phase === "ended") {
    body = <Final state={state} token={token} onLeave={stored.forget} />;
  } else {
    body = (
      <div className={styles.screen}>
        <h1 className={styles.title}>Bạn đã rời phòng</h1>
        <p className={styles.lead}>Thầy cô đã mời bạn rời phòng. Bạn có thể nhập PIN để vào phòng khác.</p>
        <Button variant="primary" className={styles.big} onClick={stored.forget}>
          Nhập PIN
        </Button>
      </div>
    );
  }

  return (
    <div ref={focusRef} tabIndex={-1} className={styles.focusRoot}>
      <p className="visually-hidden" role="status" aria-live="polite">
        {playerAnnouncement(state)}
      </p>
      {offline ? (
        <div className={styles.bannerWrap}>
          <StatusBanner offline />
        </div>
      ) : null}
      {body}
    </div>
  );
}
