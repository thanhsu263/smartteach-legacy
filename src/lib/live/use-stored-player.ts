"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { clearPlayer, loadPlayer, savePlayer, type StoredPlayer } from "@/lib/live/storage";

/**
 * Người chơi đã vào phòng trên thiết bị này. Đọc từ `sessionStorage` (tải lại vẫn vào lại đúng người chơi);
 * nếu trình duyệt chặn lưu trữ thì giữ trong bộ nhớ của tab và `persisted = false` để giao diện nói rõ
 * "tải lại trang thì phải nhập lại PIN".
 */

let memory: StoredPlayer | null = null;
let persisted = true;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

/** Snapshot là chuỗi để so sánh theo giá trị (useSyncExternalStore cần giá trị ổn định). */
const getSnapshot = () => JSON.stringify(memory ?? loadPlayer());
const getServerSnapshot = () => "hydrating";

export type StoredPlayerHook = {
  /** False cho tới khi đã hydrate xong (tránh nhá màn hình nhập PIN với người đang chơi dở). */
  ready: boolean;
  player: StoredPlayer | null;
  /** Lưu thất bại (bị chặn) thì false. */
  persisted: boolean;
  remember: (player: StoredPlayer) => void;
  forget: () => void;
};

export function useStoredPlayer(): StoredPlayerHook {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = raw !== "hydrating";
  const player = useMemo(() => (ready ? (JSON.parse(raw) as StoredPlayer | null) : null), [raw, ready]);

  const remember = useCallback((next: StoredPlayer) => {
    memory = next;
    persisted = savePlayer(next);
    notify();
  }, []);
  const forget = useCallback(() => {
    memory = null;
    persisted = true;
    clearPlayer();
    notify();
  }, []);
  return { ready, player, persisted, remember, forget };
}
