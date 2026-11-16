import {
  AppError,
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { ragDb, type RagVersion } from "@/lib/rag/jobs";
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/rag/documents/[id]/reindex">,
) {
  try {
    const { client } = await requireUser(true),
      body = await mutation(request),
      id = uuid((await params).id);
    const docs = await client.rpc("admin_rag_documents");
    dbError(docs.error);
    const item = docs.data.items.find((x: { id: string }) => x.id === id);
    if (!item || item.generation !== body.expectedVersion)
      throw new AppError(
        409,
        "version_conflict",
        "Nguồn đã thay đổi. Hãy tải lại.",
      );
    const db = ragDb(),
      old = await db.rpc("rag_version", { p_id: item.versionId });
    dbError(old.error);
    const version = old.data as RagVersion;
    if (!version?.path || !version.hash)
      throw new AppError(
        409,
        "upload_required",
        "Tệp chưa hoàn tất. Vui lòng tải lại tệp.",
      );
    const next = await client.rpc("admin_reserve_document", {
      p_title: item.title,
      p_format: item.format,
      p_bytes: item.bytes,
      p_subject: item.subject,
      p_grades: item.grades,
      p_source: id,
    });
    dbError(next.error);
    const copied = await db.storage
      .from("rag-documents")
      .copy(version.path, next.data.path);
    if (copied.error)
      throw new AppError(
        503,
        "storage_unavailable",
        "Chưa thể sao chép tệp; reservation lỗi sẽ được tự dọn.",
      );
    dbError(
      (
        await db.rpc("rag_complete_upload", {
          p_version: next.data.versionId,
          p_hash: version.hash,
        })
      ).error,
    );
    return json({ state: "queued" });
  } catch (e) {
    return failure(e);
  }
}
