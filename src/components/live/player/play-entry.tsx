"use client";

import { useSearchParams } from "next/navigation";
import { PlayScreen } from "./play-screen";

/** Đọc PIN từ `?pin=` (link hoặc mã QR giáo viên chiếu) rồi vào luồng của học sinh. */
export function PlayEntry() {
  const params = useSearchParams();
  return <PlayScreen initialPin={params.get("pin") ?? ""} />;
}
