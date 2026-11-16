import {
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await requireUser(true);
    const body = await mutation(request);
    const result = await client.rpc("admin_moderate_publication", {
      p_id: uuid((await context.params).id),
      p_status: body.status,
      p_reason: body.reason ?? "",
      p_expected_version: body.expectedVersion,
    });
    dbError(result.error);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
