import {
  AppError,
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { downloadVersion, ragDb, type RagVersion } from "@/lib/rag/jobs";
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/rag/documents/[id]/complete-upload">,
) {
  try {
    const { client } = await requireUser(true);
    const b = await mutation(request),
      id = uuid((await params).id),
      versionId = uuid(b.versionId);
    const docs = await client.rpc("admin_rag_documents");
    dbError(docs.error);
    if (
      !docs.data.items.some(
        (x: { id: string; versionId: string }) =>
          x.id === id && x.versionId === versionId,
      )
    )
      throw new AppError(
        404,
        "source_missing",
        "Không tìm thấy phiên bản tài liệu.",
      );
    const db = ragDb(),
      version = await db.rpc("rag_version", { p_id: versionId });
    dbError(version.error);
    const v = version.data as RagVersion;
    if (!v || v.status !== "reserved")
      throw new AppError(409, "version_conflict", "Phiên bản đã thay đổi.");
    const { hash } = await downloadVersion(v);
    dbError(
      (
        await db.rpc("rag_complete_upload", {
          p_version: versionId,
          p_hash: hash,
        })
      ).error,
    );
    return json({ state: "queued" });
  } catch (e) {
    return failure(e);
  }
}
