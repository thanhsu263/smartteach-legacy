import { dbError, failure, json, mutation, pageParams, requireUser } from "@/lib/admin/http";
export async function GET(request: Request) {
  try { const { client } = await requireUser(); const { offset } = pageParams(request); const r = await client.rpc("teacher_feedback_list", { p_offset: offset }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try { const { client } = await requireUser(); const b = await mutation(request); const r = await client.rpc("submit_teacher_feedback", { p_request: b.requestId, p_kind: b.kind, p_body: b.body, p_path: null }); dbError(r.error); return json(r.data, 201); } catch(e) { return failure(e); }
}
