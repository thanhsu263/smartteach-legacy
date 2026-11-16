import { dbError, failure, json, requireUser } from "@/lib/admin/http";
import { keyring } from "@/lib/ai/crypto";
export async function GET() {
  try {
    const { client } = await requireUser(true);
    const [rag, ai, preflight, authSync, exams] = await Promise.all([
      client.rpc("rag_operations"),
      client.rpc("admin_ai_config"),
      client.rpc("admin_rag_preflight"),
      client.rpc("admin_auth_sync_status"),
      client.rpc("admin_exam_import_operations"),
    ]);
    for (const result of [rag, ai, preflight, authSync, exams]) dbError(result.error);
    let encryption = "Chưa cấu hình";
    try {
      keyring();
      encryption = "Sẵn sàng";
    } catch {}
    const heartbeat = rag.data.heartbeat;
    return json({
      payments: "Hoãn kích hoạt payOS",
      examImport: "Worker nhập đề: " + (exams.data.heartbeat ?? "chưa chạy") + " · " + Object.entries(exams.data.jobs).map(([state, count]) => `${state}: ${count}`).join(", "),
      examFinalizer: exams.data.finalizer ?? "Chưa có heartbeat chốt bài thi",
      ai: ai.data.settings.model ?? "Chưa chọn model",
      rag:
        String(rag.data.sources) +
        " nguồn hoạt động · " +
        String(rag.data.chunks) +
        " chunk · " +
        (Number(rag.data.bytes) / 1048576).toFixed(1) +
        " MiB",
      scheduler: preflight.data.schedulerConfigured
        ? heartbeat.last_run_at
          ? "Lần chạy: " + heartbeat.last_run_at + " · " + heartbeat.last_result
          : "Đã đặt lịch; chưa có heartbeat"
        : "Chưa cấu hình Vault/worker",
      jobs:
        Object.entries(rag.data.jobs)
          .map(([state, count]) => state + ": " + count)
          .join(" · ") || "Chưa có job",
      credentials:
        String(
          ai.data.credentials.filter(
            (c: { enabled: boolean; state: string }) =>
              c.enabled && c.state === "healthy",
          ).length,
        ) + " key đã kiểm kết nối",
      authSync:
        String(authSync.data) +
        " tài khoản chờ đồng bộ Auth (DB guard vẫn có hiệu lực)",
      encryption,
      worker: process.env.RAG_WORKER_SECRET
        ? "Đã đặt bí mật worker"
        : "Chưa cấu hình",
    });
  } catch (e) {
    return failure(e);
  }
}
