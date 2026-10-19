"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { createServerClock } from "@/lib/live/clock";
import { createSessionChannel, type SessionChannel } from "@/lib/live/channel";
import { hostFetcher, playerFetcher, type LiveResult } from "@/lib/live/rpc";
import { createLiveSync, pollIntervalForPhase, type LiveSync, type SyncSnapshot, type SyncState } from "@/lib/live/sync";
import type { HostState, PlayerState } from "@/lib/live/types";
import { getBrowserSupabase } from "@/lib/supabase/client";

const emptyClock = createServerClock();

function emptySnapshot<T>(): SyncSnapshot<T> {
  return { state: null, status: "polling", error: null, fatal: false, clock: emptyClock };
}

const EMPTY: SyncSnapshot<never> = emptySnapshot<never>();

/** Gắn một lõi đồng bộ vào vòng đời React: chạy khi gắn vào trang, dừng khi gỡ (kể cả StrictMode). */
function useLiveSync<T extends SyncState>(sync: LiveSync<T> | null): SyncSnapshot<T> {
  useEffect(() => {
    if (!sync) return;
    sync.start();
    return () => sync.stop();
  }, [sync]);

  const subscribe = useCallback((listener: () => void) => (sync ? sync.listen(listener) : () => {}), [sync]);
  const getSnapshot = useCallback(() => (sync ? sync.getSnapshot() : (EMPTY as SyncSnapshot<T>)), [sync]);
  const getServerSnapshot = useCallback(() => EMPTY as SyncSnapshot<T>, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Sau một thao tác điều khiển thành công: hỏi lại trạng thái rồi báo `{ seq }` cho người chơi. Gửi tin
 * thất bại không làm hỏng thao tác vì người chơi vẫn hỏi định kỳ.
 */
export async function runHostAction(
  sync: Pick<LiveSync<HostState>, "refresh" | "getSnapshot">,
  channel: Pick<SessionChannel, "notify">,
  run: () => Promise<LiveResult<object>>,
): Promise<LiveResult<object>> {
  const result = await run();
  if (result.ok) {
    await sync.refresh();
    const seq = sync.getSnapshot().state?.seq;
    if (seq !== undefined) await channel.notify(seq);
  }
  return result;
}

export type HostLive = SyncSnapshot<HostState> & {
  refresh: () => Promise<void>;
  /** Chạy một thao tác điều khiển rồi báo cho người chơi. */
  act: (run: () => Promise<LiveResult<object>>) => Promise<LiveResult<object>>;
};

/** Trạng thái phiên cho màn hình giáo viên (đồng thời là màn chiếu). */
export function useHostLive(sessionId: string): HostLive {
  const { sync, channel } = useMemo(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { sync: null, channel: null };
    const session = createSessionChannel(supabase, sessionId);
    return {
      sync: createLiveSync<HostState>({
        fetchState: hostFetcher(supabase, sessionId),
        channelFor: (state) => ({ key: state.id, source: session.source }),
        pollMs: (state) => pollIntervalForPhase(state?.status),
      }),
      channel: session,
    };
  }, [sessionId]);

  const snapshot = useLiveSync(sync);
  const refresh = useCallback(() => (sync ? sync.refresh() : Promise.resolve()), [sync]);
  const act = useCallback(
    async (run: () => Promise<LiveResult<object>>) => (sync && channel ? runHostAction(sync, channel, run) : run()),
    [sync, channel],
  );
  return { ...snapshot, refresh, act };
}

export type PlayerLive = SyncSnapshot<PlayerState> & { refresh: () => Promise<void> };

/** Trạng thái của một người chơi theo mã tham gia; `token` null thì chưa chạy gì. */
export function usePlayerLive(token: string | null): PlayerLive {
  const sync = useMemo(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !token) return null;
    return createLiveSync<PlayerState>({
      fetchState: playerFetcher(supabase, token),
      // Id phiên chỉ biết sau lần hỏi đầu, nên đăng ký kênh từ trạng thái nhận được.
      channelFor: (state) => ({ key: state.session_id, source: createSessionChannel(supabase, state.session_id).source }),
      pollMs: (state) => pollIntervalForPhase(state?.phase),
    });
  }, [token]);

  const snapshot = useLiveSync(sync);
  const refresh = useCallback(() => (sync ? sync.refresh() : Promise.resolve()), [sync]);
  return { ...snapshot, refresh };
}
