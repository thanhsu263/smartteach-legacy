import { dbError, failure, json, mutation, requireUser, uuid } from "@/lib/admin/http";
export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/feedback/[id]">) {
  try { const { client } = await requireUser(true); const b = await mutation(request); const r = await client.rpc("admin_feedback_status", { p_id: uuid((await params).id), p_status: b.status, p_version: b.version }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); }
}
