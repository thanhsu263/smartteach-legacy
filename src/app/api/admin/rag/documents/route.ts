import {
  AppError,
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { ragDb } from "@/lib/rag/jobs";
import { keyring } from "@/lib/ai/crypto";
export async function GET() {
  try {
    const { client } = await requireUser(true);
    const result = await client.rpc("admin_rag_documents"),
      preflight = await client.rpc("admin_rag_preflight");
    dbError(result.error);
    dbError(preflight.error);
    let encryptionReady = false;
    try {
      keyring();
      encryptionReady = true;
    } catch {}
    return json({
      ...result.data,
      preflight: {
        ...preflight.data,
        encryptionReady,
        heartbeatFresh:Boolean(preflight.data?.lastRunAt&&Date.now()-Date.parse(preflight.data.lastRunAt)<180000),
        workerReady: (process.env.RAG_WORKER_SECRET?.length ?? 0) >= 32,
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { client } = await requireUser(true);
    const b = await mutation(request);
    try {
      keyring();
    } catch {
      throw new AppError(
        503,
        "encryption_missing",
        "Cần cấu hình khóa mã hóa AI trước khi nạp tài liệu.",
      );
    }
    if ((process.env.RAG_WORKER_SECRET?.length ?? 0) < 32)
      throw new AppError(
        503,
        "worker_missing",
        "Cần cấu hình worker và lịch nền trước khi tải tài liệu.",
      );
    const preflight = await client.rpc("admin_rag_preflight");
    dbError(preflight.error);
    if (
      !preflight.data?.schedulerConfigured ||
      !preflight.data?.credentialReady ||
      !preflight.data?.lastRunAt ||
      Date.now() - Date.parse(preflight.data.lastRunAt) > 180_000
    )
      throw new AppError(
        503,
        "rag_not_ready",
        "Cần key AI đã kiểm kết nối và heartbeat lịch nền trong 3 phút gần nhất trước khi tải tài liệu.",
      );
    const result = await client.rpc("admin_reserve_document", {
      p_title: b.title,
      p_format: b.format,
      p_bytes: b.bytes,
      p_subject: b.subject ?? null,
      p_grades: b.grades ?? [],
      p_source: b.sourceId ? uuid(b.sourceId) : null,
    });
    dbError(result.error);
    const signed = await ragDb()
      .storage.from("rag-documents")
      .createSignedUploadUrl(result.data.path, { upsert: false });
    if (signed.error || !signed.data)
      throw new AppError(
        503,
        "upload_unavailable",
        "Chưa thể cấp quyền tải tệp. Reservation sẽ được tự dọn.",
      );
    return json({
      ...result.data,
      token: signed.data.token,
      uploadUrl: signed.data.signedUrl,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (e) {
    return failure(e);
  }
}
