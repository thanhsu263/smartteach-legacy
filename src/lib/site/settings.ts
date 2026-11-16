import "server-only";
import { defaultFaqs } from "@/data/site-faqs";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { games } from "@/data/games";
import { siteConfig } from "@/config/site";
import type { Game } from "@/lib/catalog";
export type SiteSettings = {
  contactEmail: string;
  announcement: string;
  faq: { question: string; answer: string }[];
  chatbotEnabled: boolean;
  librarySubmissionsEnabled: boolean;
};
export const defaultSettings: SiteSettings = {
  contactEmail: siteConfig.contactEmail,
  announcement: "",
  faq: defaultFaqs.map(([question, answer]) => ({ question, answer })),
  chatbotEnabled: false,
  librarySubmissionsEnabled: true,
};
function publicClient() {
  const config = getSupabaseConfig();
  return config
    ? createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
export async function getPublicSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag("site-settings");
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const client = publicClient();
  if (!client) return defaultSettings;
  const result = await client
    .from("site_settings")
    .select("data")
    .eq("id", true)
    .single();
  if (result.error) throw new Error("Cấu hình website chưa sẵn sàng.");
  return result.data.data as SiteSettings;
}
export async function getPublicGames(): Promise<Game[]> {
  "use cache";
  cacheTag("game-catalog");
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const client = publicClient();
  if (!client) return [...games];
  const result = await client
    .from("game_catalog")
    .select("id,payload")
    .order("id");
  if (result.error) throw new Error("Kho game chưa sẵn sàng.");
  return result.data.map((row) => ({ id: row.id, ...row.payload })) as Game[];
}
