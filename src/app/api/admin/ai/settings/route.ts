import {
  dbError,
  failure,
  json,
  mutation,
  requireUser,
} from "@/lib/admin/http";
import { keyring } from "@/lib/ai/crypto";
import { CHAT_MODELS, EMBEDDING_MODEL } from "@/lib/ai/models";
export async function GET() {
  try {
    const { client } = await requireUser(true);
    const result = await client.rpc("admin_ai_config");
    dbError(result.error);
    let encryptionReady = false;
    try {
      keyring();
      encryptionReady = true;
    } catch {}
    return json({
      ...result.data,
      models: CHAT_MODELS,
      embeddingModel: EMBEDDING_MODEL,
      encryptionReady,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { client } = await requireUser(true);
    const body = await mutation(request);
    const result = await client.rpc("admin_save_ai_settings", {
      p_data: body.data,
      p_expected_version: body.expectedVersion,
    });
    dbError(result.error);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
