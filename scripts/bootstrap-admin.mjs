import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {}
const id = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!id || !/^[a-f0-9-]{36}$/i.test(id) || !url || !key)
  throw new Error(
    "Dùng: node scripts/bootstrap-admin.mjs <user-uuid>; cần Supabase server env.",
  );
if (
  !["localhost", "127.0.0.1"].includes(new URL(url).hostname) &&
  !process.argv.includes("--allow-remote")
)
  throw new Error(
    "Remote target cần --allow-remote và kiểm tra đúng dự án trước khi chạy.",
  );
const client = createClient(url, key, { auth: { persistSession: false } });
const { error } = await client.rpc("bootstrap_admin", { p_user: id });
if (error) {
  console.error("Không bootstrap được admin: " + error.code);
  process.exitCode = 1;
} else console.log("Đã cấp quản trị viên đầu tiên cho UUID được chỉ định.");
