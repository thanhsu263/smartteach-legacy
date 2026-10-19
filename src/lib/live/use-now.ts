"use client";

import { useEffect, useState } from "react";

/** Giờ máy khách (ms), cập nhật mỗi `intervalMs`; `active = false` thì ngừng (đỡ hao pin khi không đếm giờ). */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
