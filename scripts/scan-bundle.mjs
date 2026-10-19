import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readLocalSupabase } from "./supabase-local.mjs";

/**
 * Quét phần mà trình duyệt tải được (`.next/static` và các trang đã dựng sẵn) tìm thứ không được lộ:
 * khoá service_role / khoá bí mật của Supabase, chuỗi kết nối Postgres, tên biến môi trường bí mật.
 * Chạy sau `npm run build`: `npm run scan:bundle`. Thoát với mã 1 nếu thấy gì đáng ngờ.
 *
 * Đáp án đúng của quiz không nằm trong mã nguồn mà trong cơ sở dữ liệu, và chỉ ra khỏi máy chủ sau khi câu đóng;
 * phần đó được kiểm bằng `tests/db/live.test.ts` (FORBIDDEN_KEYS trên host_state và player_state khi câu đang mở).
 */

const root = process.argv[2] ?? ".next";
const scanRoots = [join(root, "static"), join(root, "server", "app")];
const TEXT = /\.(js|mjs|css|html|rsc|json|txt|map)$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) yield* walk(path);
    else if (TEXT.test(name)) yield path;
  }
}

// Giá trị thật của khoá bí mật cục bộ (nếu stack đang chạy): có mặt trong bất kỳ tệp nào cũng là lộ.
const exactSecrets = [];
try {
  const local = readLocalSupabase();
  exactSecrets.push(["khoá service_role/secret của Supabase cục bộ", local.serviceRoleKey]);
} catch {
  console.log("(Không đọc được Supabase cục bộ: bỏ qua so khớp giá trị khoá thật, vẫn quét theo mẫu.)");
}

const patterns = [
  ["khoá bí mật sb_secret_", /sb_secret_[A-Za-z0-9_-]{8,}/g],
  ["chuỗi kết nối Postgres", /postgres(?:ql)?:\/\/[^\s"'`]+/g],
  ["tên biến khoá service_role", /SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/g],
  ["Google client secret", /GOCSPX-[A-Za-z0-9_-]{10,}/g],
];

const findings = [];
let files = 0;
for (const base of scanRoots) {
  for (const path of walk(base)) {
    files += 1;
    const text = readFileSync(path, "utf8");
    const label = relative(root, path);
    for (const [name, value] of exactSecrets) if (value && text.includes(value)) findings.push(`${label}: ${name}`);
    for (const [name, pattern] of patterns) {
      const hit = text.match(pattern);
      if (hit) findings.push(`${label}: ${name} (${hit[0].slice(0, 24)}…)`);
    }
    // Mọi JWT nhúng sẵn phải là khoá anon (công khai); role khác (đặc biệt service_role) là lộ.
    for (const token of text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g) ?? []) {
      try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
        if (payload.role && payload.role !== "anon") findings.push(`${label}: JWT có role "${payload.role}"`);
      } catch {
        // Không phải JWT thật: bỏ qua.
      }
    }
  }
}

if (files === 0) {
  console.error(`Không có tệp nào để quét trong ${scanRoots.join(", ")}. Chạy \`npm run build\` trước.`);
  process.exit(2);
}
if (findings.length > 0) {
  console.error(`Phát hiện ${findings.length} mục đáng ngờ trong ${files} tệp:\n- ${[...new Set(findings)].join("\n- ")}`);
  process.exit(1);
}
console.log(`Sạch: đã quét ${files} tệp trong ${scanRoots.join(" và ")}, không thấy khoá bí mật hay chuỗi kết nối.`);
