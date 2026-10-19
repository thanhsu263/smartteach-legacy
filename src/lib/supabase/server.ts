import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Client Supabase cho server component, route handler. Luôn tạo mới cho mỗi yêu cầu.
 * Đọc `cookies()` nên chỉ dùng được bên trong ranh giới Suspense (Cache Components).
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server component không ghi được cookie; proxy.ts làm mới phiên thay phần này.
        }
      },
    },
  });
}
