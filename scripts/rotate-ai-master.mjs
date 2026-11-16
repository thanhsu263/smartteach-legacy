import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error(
    "Script chỉ chạy cho Supabase cục bộ; thao tác remote theo runbook.",
  );
const ring = JSON.parse(process.env.AI_KEYRING_JSON ?? "{}"),
  active = ring.activeVersion;
if (
  !active ||
  !ring.keys?.[active] ||
  Object.values(ring.keys).some((k) => Buffer.from(k, "base64").length !== 32)
)
  throw new Error("Keyring chưa hợp lệ.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let offset = 0,
  count = 0;
try {
  while (true) {
    const batch = await db.rpc("ai_rotation_batch", { p_offset: offset });
    if (batch.error) throw Error();
    for (const row of batch.data) {
      if (row.ciphertext.v === active) continue;
      const old = ring.keys[row.ciphertext.v];
      if (!old) throw Error();
      const aad = Buffer.from(
        JSON.stringify(["SmartTeach", "gemini", row.id, row.project_ref]),
      );
      const decrypt = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(old, "base64"),
        Buffer.from(row.ciphertext.iv, "base64"),
      );
      decrypt.setAAD(aad);
      decrypt.setAuthTag(Buffer.from(row.ciphertext.tag, "base64"));
      const plaintext = Buffer.concat([
        decrypt.update(Buffer.from(row.ciphertext.data, "base64")),
        decrypt.final(),
      ]);
      const iv = randomBytes(12),
        encrypt = createCipheriv(
          "aes-256-gcm",
          Buffer.from(ring.keys[active], "base64"),
          iv,
        );
      encrypt.setAAD(aad);
      const ciphertext = Buffer.concat([
        encrypt.update(plaintext),
        encrypt.final(),
      ]);
      plaintext.fill(0);
      const result = await db.rpc("ai_rotate_credential", {
        p_id: row.id,
        p_expected_version: row.version,
        p_ciphertext: {
          v: active,
          iv: iv.toString("base64"),
          tag: encrypt.getAuthTag().toString("base64"),
          data: ciphertext.toString("base64"),
        },
      });
      if (result.error) throw Error();
      count++;
    }
    if (batch.data.length < 20) break;
    offset += 20;
  }
  console.log(
    "Đã mã hóa lại " +
      count +
      " credential. Kiểm tra không còn version cũ trước khi gỡ khóa cũ.",
  );
} catch {
  console.error(
    "Rotation dừng do cấu hình/xung đột/giải mã; giữ nguyên keyring cũ và chạy lại sau khi kiểm tra. Không in bí mật.",
  );
  process.exitCode = 1;
}
