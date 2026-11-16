import { afterEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
vi.mock("server-only", () => ({}));
import { encryptCredential, decryptCredential } from "./crypto";
afterEach(() => vi.unstubAllEnvs());
it("AES GCM randomizes IV and authenticates project/id; supports master key transition", () => {
  const first = randomBytes(32).toString("base64"),
    second = randomBytes(32).toString("base64");
  vi.stubEnv(
    "AI_KEYRING_JSON",
    JSON.stringify({ activeVersion: "1", keys: { "1": first } }),
  );
  const value = encryptCredential(
    "CANARY_PRIVATE_API_KEY_0123456789",
    "id",
    "project",
  );
  expect(value).not.toEqual(
    encryptCredential("CANARY_PRIVATE_API_KEY_0123456789", "id", "project"),
  );
  expect(decryptCredential(value, "id", "project")).toBe(
    "CANARY_PRIVATE_API_KEY_0123456789",
  );
  expect(() => decryptCredential(value, "other-id", "project")).toThrow();
  expect(() =>
    decryptCredential(
      { ...value, tag: randomBytes(16).toString("base64") },
      "id",
      "project",
    ),
  ).toThrow();
  vi.stubEnv(
    "AI_KEYRING_JSON",
    JSON.stringify({ activeVersion: "2", keys: { "1": first, "2": second } }),
  );
  expect(decryptCredential(value, "id", "project")).toBe(
    "CANARY_PRIVATE_API_KEY_0123456789",
  );
  expect(encryptCredential("replacement", "id", "project").v).toBe("2");
  vi.stubEnv(
    "AI_KEYRING_JSON",
    JSON.stringify({ activeVersion: "2", keys: { "2": second } }),
  );
  expect(() => decryptCredential(value, "id", "project")).toThrow(
    "ai_key_version_missing",
  );
});
it("never falls back to plaintext when encryption is missing", () => {
  vi.stubEnv("AI_KEYRING_JSON", "");
  expect(() => encryptCredential("secret", "id", "project")).toThrow(
    "ai_encryption_not_configured",
  );
});
