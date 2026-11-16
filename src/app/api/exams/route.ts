import { dbError, failure, json, mutation, pageParams, requireUser } from "@/lib/admin/http";
import { examForm } from "@/lib/exams/http";
export async function GET(request: Request) {
  try { const { client } = await requireUser(); const { offset } = pageParams(request); const r = await client.rpc("exam_list", { p_offset: offset }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try { const { client } = await requireUser(); const b = await mutation(request, 270000); const form = examForm(b); const r = await client.rpc("save_exam", { p_exam: null, p_revision: null, p_request: b.requestId, p_title: form.title, p_description: form.description, p_document: form.document }); dbError(r.error); return json(r.data, 201); } catch(e) { return failure(e); }
}
