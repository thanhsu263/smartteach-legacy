import {
  AppError,
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { encryptCredential } from "@/lib/ai/crypto";
export async function POST(request: Request) {
  try {
    const { client } = await requireUser(true);
    const b = await mutation(request),
      id = b.id ? uuid(b.id) : crypto.randomUUID();
    if (
      typeof b.key !== "string" ||
      b.key.length < 20 ||
      b.key.length > 256 ||
      typeof b.projectRef !== "string" ||
      !/^[a-z0-9][a-z0-9-]{2,99}$/.test(b.projectRef)
    )
      throw new AppError(
        400,
        "credential_invalid",
        "Key hoặc project chưa hợp lệ.",
      );
    let encrypted;
    try {
      encrypted = encryptCredential(b.key, id, b.projectRef);
    } catch {
      throw new AppError(
        503,
        "encryption_missing",
        "Chưa cấu hình khóa mã hóa phía máy chủ.",
      );
    }
    const result = await client.rpc("admin_save_ai_credential", {
      p_id: id,
      p_label: b.label,
      p_project: b.projectRef,
      p_ciphertext: encrypted,
      p_last4: b.key.slice(-4),
      p_free_verified: b.freeVerified,
      p_expected_version: b.expectedVersion ?? 0,
    });
    dbError(result.error);
    return json({ ok: true, id });
  } catch (e) {
    return failure(e);
  }
}
