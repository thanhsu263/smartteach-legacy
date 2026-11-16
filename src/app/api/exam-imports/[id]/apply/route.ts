import { dbError, failure, json, mutation, requireUser, uuid } from "@/lib/admin/http";
import { examForm } from "@/lib/exams/http";
export async function POST(request: Request, { params }: RouteContext<"/api/exam-imports/[id]/apply">) { try { const { client } = await requireUser(); const b = await mutation(request, 270000); const r = await client.rpc("apply_exam_import", { p_id: uuid((await params).id), p_form: examForm(b.form), p_reviewed: b.reviewed }); dbError(r.error); return json(r.data); } catch(e) { return failure(e); } }
