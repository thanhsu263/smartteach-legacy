/**
 * Gọi `refresh` khi trình duyệt "thức dậy": tab hiện lại sau khi khoá màn hình hoặc chuyển ứng dụng
 * (bộ đếm giờ bị làm chậm nên tin báo hay nhịp polling có thể đã lỡ), có mạng trở lại, hoặc trang được
 * khôi phục từ bộ nhớ đệm. Các sự kiện hay đến cùng lúc nên được gộp trong `minGapMs`.
 */

type Target = Pick<EventTarget, "addEventListener" | "removeEventListener">;

export function attachWakeListeners(
  refresh: () => void,
  doc: (Target & { visibilityState: string }) | undefined,
  win: Target | undefined,
  options: { minGapMs?: number; now?: () => number } = {},
): () => void {
  const minGapMs = options.minGapMs ?? 500;
  const now = options.now ?? Date.now;
  let last = -Infinity;

  const wake = () => {
    const t = now();
    if (t - last < minGapMs) return;
    last = t;
    refresh();
  };
  const onVisibility = () => {
    if (doc?.visibilityState === "visible") wake();
  };

  doc?.addEventListener("visibilitychange", onVisibility);
  win?.addEventListener("online", wake);
  win?.addEventListener("pageshow", wake);
  win?.addEventListener("focus", wake);
  return () => {
    doc?.removeEventListener("visibilitychange", onVisibility);
    win?.removeEventListener("online", wake);
    win?.removeEventListener("pageshow", wake);
    win?.removeEventListener("focus", wake);
  };
}
