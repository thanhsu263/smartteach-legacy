import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readLocalSupabase } from "./supabase-local.mjs";

/**
 * Quét phần mà trình duyệt tải được tìm thứ không được lộ: khoá service_role / khoá bí mật của Supabase,
 * chuỗi kết nối Postgres, tên biến môi trường bí mật, Google client secret.
 *
 * - Bản build ở máy (sau `npm run build`): `npm run scan:bundle` quét `.next/static` và các trang dựng sẵn.
 * - Bản đã triển khai: `npm run scan:bundle -- --url https://<địa chỉ Vercel>` chỉ gửi GET tới trang chủ và vài trang
 *   công khai, rồi tải các tệp JS/CSS mà các trang đó nhắc tới. Cách này kiểm đúng thứ trình duyệt nhận được, kể cả
 *   khi biến môi trường trên Vercel khác với máy phát triển.
 *
 * Thoát với mã 1 nếu thấy gì đáng ngờ. Báo cáo chỉ nêu tệp và loại phát hiện, tuyệt đối không in giá trị khớp,
 * để log (kể cả log CI) không chứa một phần của khoá.
 *
 * Đáp án đúng của quiz không nằm trong mã nguồn mà trong cơ sở dữ liệu, và chỉ ra khỏi máy chủ sau khi câu đóng;
 * phần đó được kiểm bằng `tests/db/live.test.ts` (FORBIDDEN_KEYS trên host_state và player_state khi câu đang mở).
 */

const args = process.argv.slice(2);
const urlFlag = args.indexOf("--url");
const siteUrl = urlFlag >= 0 ? args[urlFlag + 1] : null;
if (urlFlag >= 0 && !/^https?:\/\//.test(siteUrl ?? "")) {
  console.error("Dùng: node scripts/scan-bundle.mjs --url https://<địa chỉ trang>");
  process.exit(2);
}
const positional = args.filter((_, i) => i !== urlFlag && i !== urlFlag + 1);
const root = positional[0] ?? ".next";
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
  ["khoá bí mật sb_secret_", /sb_secret_[A-Za-z0-9_-]{8,}/],
  ["chuỗi kết nối Postgres", /postgres(?:ql)?:\/\/[^\s"'`]+/],
  ["tên biến khoá service_role", /SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/],
  ["Google client secret", /GOCSPX-[A-Za-z0-9_-]{10,}/],
];

const findings = [];
let files = 0;

/** Quét một đoạn văn bản; `label` là tên tệp hoặc đường dẫn. Không bao giờ ghi giá trị khớp vào kết quả. */
function scanText(label, text) {
  files += 1;
  for (const [name, value] of exactSecrets) if (value && text.includes(value)) findings.push(`${label}: ${name}`);
  for (const [name, pattern] of patterns) if (pattern.test(text)) findings.push(`${label}: ${name}`);
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

/** Bản đã triển khai: tải vài trang công khai, rồi mọi tệp /_next/static mà chúng nhắc tới. */
async function scanSite(base) {
  const pages = ["/", "/games", "/tools", "/play", "/privacy", "/login"];
  const assets = new Set();
  for (const page of pages) {
    const response = await fetch(new URL(page, base)).catch(() => null);
    if (!response?.ok) continue;
    const html = await response.text();
    scanText(page, html);
    for (const match of html.matchAll(/\/_next\/static\/[^"'\s\\)]+\.(?:js|css)/g)) assets.add(match[0]);
  }
  for (const asset of assets) {
    const response = await fetch(new URL(asset, base)).catch(() => null);
    if (response?.ok) scanText(asset, await response.text());
  }
}

if (siteUrl) {
  await scanSite(siteUrl);
} else {
  for (const base of scanRoots) {
    for (const path of walk(base)) scanText(relative(root, path), readFileSync(path, "utf8"));
  }
}

// Không gọi process.exit sau khi đã fetch: trên Windows nó có thể chết giữa chừng (mã 127) khi còn kết nối đang đóng,
// làm mất mã 1. Đặt exitCode rồi để tiến trình tự kết thúc.
if (files === 0) {
  console.error(
    siteUrl ? `Không tải được trang nào từ ${siteUrl}.` : `Không có tệp nào để quét trong ${scanRoots.join(", ")}. Chạy \`npm run build\` trước.`,
  );
  process.exitCode = 2;
} else if (findings.length > 0) {
  console.error(`Phát hiện ${findings.length} mục đáng ngờ trong ${files} tệp:\n- ${[...new Set(findings)].join("\n- ")}`);
  process.exitCode = 1;
} else {
  const where = siteUrl ? `tải từ ${siteUrl}` : `trong ${scanRoots.join(" và ")}`;
  console.log(`Sạch: đã quét ${files} tệp ${where}, không thấy khoá bí mật hay chuỗi kết nối.`);
}
