import {
  dbError,
  failure,
  json,
  mutation,
  pageParams,
  requireUser,
  uuid,
} from "@/lib/admin/http";
export async function GET(request: Request) {
  try {
    const { client } = await requireUser(true);
    const result = await client.rpc("admin_reports", {
      p_offset: pageParams(request).offset,
    });
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { client } = await requireUser(true);
    const body = await mutation(request);
    const result = await client.rpc("admin_resolve_report", {
      p_id: uuid(body.id),
      p_reason: body.reason,
    });
    dbError(result.error);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
