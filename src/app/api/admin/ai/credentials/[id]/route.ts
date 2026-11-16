import {
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
async function control(request: Request, id: string, remove = false) {
  const { client } = await requireUser(true);
  const b = await mutation(request);
  const result = await client.rpc("admin_control_ai_credential", {
    p_id: uuid(id),
    p_operation: remove ? "delete" : b.operation,
    p_expected_version: b.expectedVersion,
  });
  dbError(result.error);
  return json({ ok: true });
}
export async function PATCH(
  r: Request,
  { params }: RouteContext<"/api/admin/ai/credentials/[id]">,
) {
  try {
    return await control(r, (await params).id);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  r: Request,
  { params }: RouteContext<"/api/admin/ai/credentials/[id]">,
) {
  try {
    return await control(r, (await params).id, true);
  } catch (e) {
    return failure(e);
  }
}
