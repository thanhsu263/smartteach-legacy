"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { describeDbError } from "@/lib/classes/errors";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type FavoritesState = {
  status: "signed-out" | "loading" | "ready" | "error";
  ids: ReadonlySet<string>;
  /** Bật hoặc tắt yêu thích cho một game; trả về lời nhắn lỗi nếu không lưu được. */
  toggle: (gameId: string) => Promise<{ error: string | null }>;
};

const EMPTY: ReadonlySet<string> = new Set();
const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; ids: ReadonlySet<string> } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("favorites")
      .select("game_id")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setFailed(userId);
        } else {
          setFailed(null);
          setLoaded({ userId, ids: new Set(data.map((row) => row.game_id as string)) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const ids = loaded && loaded.userId === userId ? loaded.ids : EMPTY;

  const toggle = useCallback(
    async (gameId: string) => {
      const supabase = getBrowserSupabase();
      if (!supabase || !userId) return { error: "Thầy cô cần đăng nhập để lưu yêu thích." };
      const wasFavorite = ids.has(gameId);

      const apply = (favorite: boolean) =>
        setLoaded((current) => {
          if (!current || current.userId !== userId) return current;
          const next = new Set(current.ids);
          if (favorite) next.add(gameId);
          else next.delete(gameId);
          return { userId, ids: next };
        });

      // Cập nhật ngay trên giao diện, hoàn lại nếu lưu thất bại.
      apply(!wasFavorite);
      const { error } = wasFavorite
        ? await supabase.from("favorites").delete().eq("game_id", gameId)
        : await supabase.from("favorites").insert({ game_id: gameId });
      if (error && !(error.code === "23505" && !wasFavorite)) {
        apply(wasFavorite);
        return { error: describeDbError(error) };
      }
      return { error: null };
    },
    [ids, userId],
  );

  const value = useMemo<FavoritesState>(() => {
    let status: FavoritesState["status"] = "signed-out";
    if (userId) {
      if (loaded && loaded.userId === userId) status = "ready";
      else if (failed === userId) status = "error";
      else status = "loading";
    }
    return { status, ids, toggle };
  }, [userId, loaded, failed, ids, toggle]);

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites(): FavoritesState {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites phải nằm trong FavoritesProvider");
  return value;
}
