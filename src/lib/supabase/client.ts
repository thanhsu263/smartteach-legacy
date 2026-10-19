import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

let cached: SupabaseClient | null | undefined;

/**
 * Client Supabase dùng chung cho trình duyệt (phiên lưu trong cookie).
 * Trả về null khi chạy trên server hoặc khi chưa cấu hình.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (cached === undefined) {
    const config = getSupabaseConfig();
    cached = config ? createBrowserClient(config.url, config.key) : null;
  }
  return cached;
}
