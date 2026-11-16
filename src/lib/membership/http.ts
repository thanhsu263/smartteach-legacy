import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { BillingError } from "./service";

export function billingJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function billingFailure(error: unknown) {
  if (error instanceof BillingError) return billingJson({ error: error.message, code: error.code }, error.status);
  return billingJson({ error: "Chưa thể kết nối dịch vụ thanh toán. Vui lòng thử lại sau.", code: "payment_unavailable" }, 503);
}

export async function billingUser() {
  const client = await getServerSupabase();
  if (!client) throw new BillingError(503, "auth_unavailable", "Chưa thể kiểm tra tài khoản. Vui lòng thử lại sau.");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new BillingError(401, "sign_in_required", "Vui lòng đăng nhập để tiếp tục.");
  return client;
}

export function assertBillingOrigin(request: Request, origin: string | null) {
  if (!origin) throw new BillingError(503, "payment_unavailable", "Thanh toán đang tạm thời chưa sẵn sàng. Vui lòng thử lại sau.");
  if (request.headers.get("origin") !== origin) throw new BillingError(403, "origin_invalid", "Yêu cầu chưa hợp lệ.");
}

export async function billingBody(request: Request, maxBytes = 8192): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new BillingError(415, "json_required", "Yêu cầu cần định dạng JSON.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw new BillingError(413, "body_too_large", "Yêu cầu quá lớn.");
  const reader = request.body?.getReader();
  if (!reader) throw new BillingError(400, "body_invalid", "Yêu cầu chưa hợp lệ.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new BillingError(413, "body_too_large", "Yêu cầu quá lớn."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof BillingError) throw error;
    throw new BillingError(400, "body_invalid", "Yêu cầu chưa hợp lệ.");
  } finally { reader.releaseLock(); }
}
