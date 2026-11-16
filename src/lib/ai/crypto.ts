import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export type Ciphertext = { v: string; iv: string; tag: string; data: string };
export function keyring() {
  try {
    const value = JSON.parse(process.env.AI_KEYRING_JSON ?? "") as {
      activeVersion: string;
      keys: Record<string, string>;
    };
    if (!value.activeVersion || !value.keys || !value.keys[value.activeVersion])
      throw Error();
    for (const key of Object.values(value.keys))
      if (Buffer.from(key, "base64").length !== 32) throw Error();
    return value;
  } catch {
    throw new Error("ai_encryption_not_configured");
  }
}
const aad = (id: string, project: string) =>
  Buffer.from(JSON.stringify(["SmartTeach", "gemini", id, project]));
export function encryptCredential(
  secret: string,
  id: string,
  project: string,
): Ciphertext {
  const ring = keyring(),
    iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(ring.keys[ring.activeVersion], "base64"),
    iv,
  );
  cipher.setAAD(aad(id, project));
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    v: ring.activeVersion,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
}
export function decryptCredential(
  value: Ciphertext,
  id: string,
  project: string,
) {
  const ring = keyring(),
    key = ring.keys[value.v];
  if (!key) throw new Error("ai_key_version_missing");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "base64"),
    Buffer.from(value.iv, "base64"),
  );
  cipher.setAAD(aad(id, project));
  cipher.setAuthTag(Buffer.from(value.tag, "base64"));
  try {
    return Buffer.concat([
      cipher.update(Buffer.from(value.data, "base64")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("ai_credential_invalid");
  }
}
