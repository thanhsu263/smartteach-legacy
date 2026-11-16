import { AppError, dbError, failure, json, mutation, requireUser, uuid } from "@/lib/admin/http";
import { examImportDb } from "@/lib/exams/import/jobs";
import { examHash, validateExamBytes } from "@/lib/exams/import/extract-server";
export async function POST(request: Request, { params }: RouteContext<"/api/exam-imports/[id]/complete-upload">) {
  try {
    const { client } = await requireUser(); await mutation(request); const id = uuid((await params).id);
    const target = await client.rpc("exam_import_upload_target", { p_id: id });
    if (target.error) {
      const owned = await client.rpc("exam_import_owned", { p_id: id }); dbError(owned.error);
      if (owned.data.status !== "reserved") return json(owned.data);
      dbError(target.error);
    }
    const file = await examImportDb().storage.from("exam-imports").download(target.data.path);
    if (file.error || !file.data || file.data.size !== target.data.bytes) throw new AppError(409, "source_changed", "Tệp chưa tải đủ hoặc đã thay đổi.");
    const bytes = new Uint8Array(await file.data.arrayBuffer()); validateExamBytes(bytes);
    const prefix = new TextDecoder().decode(bytes.subarray(0, 5));
    if ((target.data.format === "pdf" && prefix !== "%PDF-") || (["docx", "xlsx"].includes(target.data.format) && (bytes[0] !== 80 || bytes[1] !== 75))) throw new AppError(400, "file_invalid", "Nội dung tệp không khớp định dạng.");
    const r = await client.rpc("complete_exam_import", { p_id: id, p_hash: examHash(bytes) }); dbError(r.error); return json(r.data);
  } catch(e) { return failure(e); }
}
