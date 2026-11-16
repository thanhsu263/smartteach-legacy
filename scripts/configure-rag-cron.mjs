import { execFileSync } from "node:child_process";
try {
  process.loadEnvFile(".env.local");
} catch {}
// Deliberately local-only. Remote Vault writes belong to the deployment runbook.
const base = process.env.APP_BASE_URL,
  secret = process.env.RAG_WORKER_SECRET;
if (
  !base ||
  !/^http:\/\/localhost:\d+$/.test(base) ||
  !secret ||
  !/^[a-zA-Z0-9_-]{32,200}$/.test(secret)
)
  throw new Error(
    "Cần APP_BASE_URL localhost có cổng và RAG_WORKER_SECRET >=32 ký tự chữ/số/dấu _-.",
  );
const endpoint =
  base.replace("localhost", "host.docker.internal") +
  "/api/internal/rag/jobs/run";
const sql =
  "do $vault$ declare v_id uuid; begin select id into v_id from vault.secrets where name='smartteach_rag_worker_url'; if v_id is null then perform vault.create_secret('" +
  endpoint +
  "','smartteach_rag_worker_url'); else perform vault.update_secret(v_id,'" +
  endpoint +
  "'); end if; select id into v_id from vault.secrets where name='smartteach_rag_worker_secret'; if v_id is null then perform vault.create_secret('" +
  secret +
  "','smartteach_rag_worker_secret'); else perform vault.update_secret(v_id,'" +
  secret +
  "'); end if; end; $vault$;";
try {
  // SQL arrives over stdin, never command-line arguments or stdout.
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_smartteach",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
    ],
    { input: sql, stdio: ["pipe", "ignore", "pipe"] },
  );
  console.log(
    "Đã cấu hình Vault cho lịch RAG cục bộ. Cần quan sát heartbeat/HTTP trước khi bật tải tài liệu.",
  );
} catch {
  console.error("Không thể cấu hình lịch cục bộ. Không in SQL hoặc bí mật.");
  process.exitCode = 1;
}
