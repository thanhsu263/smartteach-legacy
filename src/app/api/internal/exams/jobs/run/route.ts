import { timingSafeEqual } from "node:crypto";
import { failure, json } from "@/lib/admin/http";
import { runExamImportStep } from "@/lib/exams/import/jobs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const secret = process.env.EXAM_IMPORT_WORKER_SECRET || process.env.RAG_WORKER_SECRET;
  const authorization = request.headers.get("authorization") ?? "", expected = "Bearer " + (secret ?? "");
  if (!secret || secret.length < 32 || Buffer.byteLength(authorization) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) return json({ error: { code: "forbidden", message: "Không có quyền." } }, 403);
  if ((await request.arrayBuffer()).byteLength > 128) return json({ error: { code: "body_invalid" } }, 400);
  try { return json(await runExamImportStep()); } catch(e) { return failure(e); }
}
