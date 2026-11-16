import { dbError, failure, json, mutation, requireUser, uuid } from "@/lib/admin/http";
type Context = RouteContext<"/api/exam-imports/[id]">;
export async function GET(_request: Request, { params }: Context) { try { const { client } = await requireUser(); const r = await client.rpc("exam_import_owned", { p_id: uuid((await params).id) }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); } }
export async function DELETE(request: Request, { params }: Context) { try { const { client } = await requireUser(); await mutation(request); const r = await client.rpc("control_exam_import", { p_id: uuid((await params).id), p_action: "cancel" }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); } }
