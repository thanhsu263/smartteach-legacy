import { execFileSync } from "node:child_process";
import type { TestUser } from "./helpers";
export function localSql(sql: string) {
  // This harness is exclusively connected to readLocalSupabase() by helpers.ts.
  return execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_smartteach",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  );
}
export function seedAdmin(user: TestUser) {
  if (!/^[a-f0-9-]{36}$/i.test(user.id)) throw new Error("Invalid test UUID");
  localSql(
    "insert into private.account_controls(user_id,app_role) values('" +
      user.id +
      "','admin') on conflict(user_id) do update set app_role='admin',status='active';",
  );
}
