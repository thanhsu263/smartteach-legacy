import { isUuid } from "@/lib/classes/api";

/**
 * Lưu mã tham gia của học sinh trong `sessionStorage` để tải lại trang vẫn vào lại đúng người chơi.
 * Mã tham gia là bí mật của chính học sinh nên chỉ nằm trong tab này (hết khi đóng tab), không bao giờ
 * vào URL. Mọi truy cập đều bọc try/catch vì trình duyệt có thể chặn lưu trữ (chế độ riêng tư, chặn
 * cookie): khi đó trang vẫn chạy, chỉ là tải lại thì phải nhập PIN lại.
 */

const KEY = "smartteach.live.player";

export type StoredPlayer = { token: string; nickname: string };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePlayer(player: StoredPlayer, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(KEY, JSON.stringify(player));
    return true;
  } catch {
    return false;
  }
}

export function loadPlayer(storage: StorageLike | null = defaultStorage()): StoredPlayer | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPlayer> | null;
    if (!parsed || typeof parsed.token !== "string" || !isUuid(parsed.token)) return null;
    return { token: parsed.token, nickname: typeof parsed.nickname === "string" ? parsed.nickname.slice(0, 20) : "" };
  } catch {
    return null;
  }
}

export function clearPlayer(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    // Không xoá được thì thôi: lần tải sau mã hỏng sẽ tự bị bỏ.
  }
}
