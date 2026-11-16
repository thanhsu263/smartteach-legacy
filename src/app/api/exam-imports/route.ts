import { AppError, dbError, failure, json, mutation, requireUser } from "@/lib/admin/http";
import { examImportDb } from "@/lib/exams/import/jobs";
import { importReadiness } from "@/lib/exams/import/readiness";
export async function GET() {
  try { const { client } = await requireUser(); const [jobs, preflight, membership] = await Promise.all([client.rpc("exam_import_list"), client.rpc("exam_import_preflight"), client.rpc("membership_status")]); for(const r of [jobs,preflight,membership]) dbError(r.error); return json({ ...jobs.data, preflight: importReadiness(preflight.data), membership: membership.data }); } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const { client } = await requireUser(); const b = await mutation(request);
    const membership = await client.rpc("membership_status"); dbError(membership.error);
    if (!membership.data?.active) throw new AppError(402, "premium_required", "Cần Premium để nhập đề bằng AI.");
    const preflight = await client.rpc("exam_import_preflight"); dbError(preflight.error);
    if (!importReadiness(preflight.data).ready) throw new AppError(503, "exam_worker_not_ready", "AI nhập đề chưa sẵn sàng. Cần kiểm tra cấu hình AI và lịch xử lý nền trước khi nhận tệp.");
    const r = await client.rpc("reserve_exam_import", { p_request: b.requestId, p_title: b.title, p_format: b.format, p_bytes: b.bytes, p_consent: b.consent }); dbError(r.error);
    if (!r.data.path) return json(r.data);
    const signed = await examImportDb().storage.from("exam-imports").createSignedUploadUrl(r.data.path, { upsert: false });
    if (signed.error || !signed.data) throw new AppError(503, "upload_unavailable", "Chưa cấp được quyền tải tệp. Thầy cô thử lại với cùng yêu cầu.");
    return json({ ...r.data, token: signed.data.token });
  } catch(e) { return failure(e); }
}
