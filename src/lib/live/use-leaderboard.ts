"use client";

import { useEffect, useState } from "react";
import { player, type LiveResult } from "@/lib/live/rpc";
import type { LeaderboardView } from "@/lib/live/types";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Loaded = { key: string; result: LiveResult<{ board: LeaderboardView }> };

/** Bảng xếp hạng của người chơi; hỏi lại mỗi khi `key` (thường là seq của pha) đổi. Null khi đang tải. */
export function useLeaderboard(token: string, key: string): LiveResult<{ board: LeaderboardView }> | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    player.leaderboard(supabase, token).then((result) => {
      if (!cancelled) setLoaded({ key, result });
    });
    return () => {
      cancelled = true;
    };
  }, [token, key]);

  return loaded && loaded.key === key ? loaded.result : null;
}
