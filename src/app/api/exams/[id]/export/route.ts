import { AppError, dbError, failure, requireUser, uuid } from "@/lib/admin/http";
import type { ExamDetail } from "@/lib/exams/types";
import { examPrintModel } from "@/lib/exams/export/print-model";
import { renderDocx } from "@/lib/exams/export/docx";
import { renderPdf } from "@/lib/exams/export/pdf";
export const maxDuration = 30;
export async function GET(request: Request, { params }: RouteContext<"/api/exams/[id]/export">) {
  try {
    const { client } = await requireUser(); const id = uuid((await params).id); const p = new URL(request.url).searchParams;
    const format = p.get("format"), audience = p.get("audience"), revision = Number(p.get("revision"));
    if (!["docx", "pdf"].includes(format ?? "") || !["student", "teacher"].includes(audience ?? "") || !Number.isSafeInteger(revision) || revision < 1) throw new AppError(400, "export_invalid", "Chọn đúng định dạng, phiên bản và đối tượng nhận đề.");
    const r = await client.rpc("exam_detail", { p_exam: id }); dbError(r.error); const exam = r.data as ExamDetail;
    if (exam.revision !== revision) throw new AppError(409, "version_conflict", "Đề đã thay đổi. Tải lại bản mới trước khi xuất.");
    let lines; try { lines = examPrintModel(exam, audience as "student" | "teacher"); } catch { throw new AppError(400, "exam_incomplete", "Đề chưa đủ nội dung hoặc đáp án. Thầy cô kiểm tra lại."); }
    const bytes = format === "docx" ? await renderDocx(lines) : await renderPdf(lines);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf", "Content-Disposition": `attachment; filename="de-${id}-${audience}.${format}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch(e) { return failure(e); }
}
