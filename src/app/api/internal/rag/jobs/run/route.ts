import { timingSafeEqual } from "node:crypto";
import { json } from "@/lib/admin/http";
import { runRagStep } from "@/lib/rag/jobs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const secret = process.env.RAG_WORKER_SECRET,
    authorization = request.headers.get("authorization") ?? "";
  const expected = "Bearer " + (secret ?? "");
  if (
    !secret ||
    secret.length < 32 ||
    Buffer.byteLength(authorization) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
  )
    return json(
      { error: { code: "forbidden", message: "Không có quyền." } },
      403,
    );
  if ((await request.arrayBuffer()).byteLength > 128)
    return json({ error: { code: "body_invalid" } }, 400);
  try {
    return json(await runRagStep());
  } catch {
    return json(
      {
        error: { code: "worker_unavailable", message: "Worker chưa sẵn sàng." },
      },
      503,
    );
  }
}
