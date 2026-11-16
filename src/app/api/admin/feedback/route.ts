import { dbError, failure, json, pageParams, requireUser } from "@/lib/admin/http";
export async function GET(request: Request) {
  try { const { client } = await requireUser(true); const { offset, params } = pageParams(request); const r = await client.rpc("teacher_feedback_list", { p_offset: offset, p_status: params.get("status") ?? "", p_admin: true }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); }
}
