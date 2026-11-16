import { spawnSync } from "node:child_process";
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["vitest", "run", "src/lib/exams/import/import-export.test.ts"];
// Fixed command arguments only; no user or file content is interpolated into a shell.
const result = spawnSync(command, args, { env: { ...process.env, GENERATE_EXAM_TEMPLATES: "1" }, stdio: "inherit", shell: process.platform === "win32" });
process.exitCode = result.status ?? 1;
