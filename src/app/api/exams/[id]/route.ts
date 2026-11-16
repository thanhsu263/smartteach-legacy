import { dbError, failure, json, mutation, requireUser, uuid } from "@/lib/admin/http";
import { examForm } from "@/lib/exams/http";
type Context = RouteContext<"/api/exams/[id]">;
export async function GET(_request: Request, { params }: Context) {
  try { const { client } = await requireUser(); const r = await client.rpc("exam_detail", { p_exam: uuid((await params).id) }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { const { client } = await requireUser(); const b = await mutation(request, 270000); const form = examForm(b); const r = await client.rpc("save_exam", { p_exam: uuid((await params).id), p_revision: b.revision, p_request: b.requestId, p_title: form.title, p_description: form.description, p_document: form.document }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); }
}
export async function DELETE(request: Request, { params }: Context) {
  try { const { client } = await requireUser(); const b = await mutation(request); const r = await client.rpc("delete_exam", { p_exam: uuid((await params).id), p_revision: b.revision }); dbError(r.error); return json({ ok: true }); } catch(e) { return failure(e); }
}
