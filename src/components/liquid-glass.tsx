"use client";

import { useEffect } from "react";
import { initLiquidGlass } from "@/lib/liquid-glass";

/** Gắn tương tác chuột của lớp Liquid Glass một lần cho cả ứng dụng; không vẽ gì. */
export function LiquidGlass() {
  useEffect(() => initLiquidGlass(), []);
  return null;
}
