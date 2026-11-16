import { execFileSync } from "node:child_process";
try { process.loadEnvFile(".env.local"); } catch {}
// Local-only, like configure-rag-cron.mjs. Never writes to a linked remote project.
const base = process.env.APP_BASE_URL;
const secret = process.env.EXAM_IMPORT_WORKER_SECRET || process.env.RAG_WORKER_SECRET;
if (!base || !/^http:\/\/localhost:\d+$/.test(base) || !secret || !/^[a-zA-Z0-9_-]{32,200}$/.test(secret)) {
  throw new Error("Cần APP_BASE_URL localhost có cổng và EXAM_IMPORT_WORKER_SECRET (hoặc RAG_WORKER_SECRET) dài 32–200 ký tự chữ/số/_-.");
}
const endpoint = base.replace("localhost", "host.docker.internal") + "/api/internal/exams/jobs/run";
const sql = `do $vault$ declare v_id uuid; begin
  select id into v_id from vault.secrets where name='smartteach_exam_worker_url';
  if v_id is null then perform vault.create_secret('${endpoint}','smartteach_exam_worker_url');
  else perform vault.update_secret(v_id,'${endpoint}'); end if;
  select id into v_id from vault.secrets where name='smartteach_exam_worker_secret';
  if v_id is null then perform vault.create_secret('${secret}','smartteach_exam_worker_secret');
  else perform vault.update_secret(v_id,'${secret}'); end if;
end; $vault$;`;
try {
  execFileSync("docker", ["exec", "-i", "supabase_db_smartteach", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "ignore", "pipe"] });
  console.log("Đã cấu hình worker nhập đề cục bộ. Next.js phải chạy; kiểm heartbeat trước khi nhận tệp AI.");
} catch {
  console.error("Chưa cấu hình được worker cục bộ. Không in SQL hoặc bí mật."); process.exitCode = 1;
}
