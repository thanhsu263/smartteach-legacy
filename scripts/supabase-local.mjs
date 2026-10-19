import { execSync } from "node:child_process";

/**
 * Đọc địa chỉ và khoá của stack Supabase chạy cục bộ (`npm run supabase:start`).
 * Khoá cục bộ là khoá mẫu công khai của Supabase CLI, không phải bí mật của dự án thật.
 */
export function readLocalSupabase() {
  let output;
  try {
    output = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    throw new Error("Không đọc được trạng thái Supabase cục bộ. Chạy `npm run supabase:start` trước.");
  }
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  const url = values.API_URL;
  const anonKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  const serviceRoleKey = values.SERVICE_ROLE_KEY ?? values.SECRET_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Thiếu API_URL, ANON_KEY hoặc SERVICE_ROLE_KEY trong `supabase status -o env`.");
  }
  return { url, anonKey, serviceRoleKey };
}
