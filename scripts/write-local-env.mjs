import { writeFileSync } from "node:fs";
import { readLocalSupabase } from "./supabase-local.mjs";

// Ghi .env.local để ứng dụng và Playwright dùng stack Supabase cục bộ.
// Chỉ ghi khoá công khai (anon); khoá service_role không bao giờ vào ứng dụng.
const { url, anonKey } = readLocalSupabase();

const content = [
  "# Sinh bởi `npm run supabase:env` cho stack Supabase cục bộ. Không commit.",
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
  "",
].join("\n");

writeFileSync(".env.local", content, "utf8");
console.log(`Đã ghi .env.local (${url})`);
