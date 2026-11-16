import { dbError, failure, json, requireUser } from "@/lib/admin/http";
import { keyring } from "@/lib/ai/crypto";
export async function GET() {
  try {
    const { client } = await requireUser();
    const result = await client.rpc("chat_config");
    dbError(result.error);
    let encryptionReady = false;
    try {
      keyring();
      encryptionReady = true;
    } catch {}
    return json({
      ...result.data,
      available: result.data.available && encryptionReady,
      message:
        !encryptionReady && result.data.enabled
          ? "Trợ lý chưa hoàn tất cấu hình máy chủ."
          : result.data.message,
    });
  } catch (e) {
    return failure(e);
  }
}
