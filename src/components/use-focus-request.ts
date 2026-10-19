"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Chuyển focus tới phần tử có `id` sau lần render kế tiếp. Dùng khi nút vừa bấm bị thay hoặc gỡ khỏi
 * trang (xác nhận tại chỗ, xoá một dòng), nếu không focus rơi về đầu trang và người dùng bàn phím
 * hay trình đọc màn hình phải đi lại từ thanh điều hướng.
 */
export function useFocusRequest(): (id: string) => void {
  const pending = useRef<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = pending.current;
    if (!id) return;
    pending.current = null;
    document.getElementById(id)?.focus();
  }, [tick]);

  return useCallback((id: string) => {
    pending.current = id;
    setTick((value) => value + 1);
  }, []);
}
