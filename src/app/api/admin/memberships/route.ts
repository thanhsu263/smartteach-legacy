import {
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
export async function GET(request: Request) {
  try {
    const { client } = await requireUser(true);
    const result = await client.rpc("admin_membership", {
      p_user: uuid(new URL(request.url).searchParams.get("userId")),
    });
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { client } = await requireUser(true);
    const body = await mutation(request);
    const result = await client.rpc("admin_adjust_membership", {
      p_user: uuid(body.userId),
      p_action: body.action,
      p_reason: body.reason,
      p_expected_version: body.expectedVersion,
      p_request_id: uuid(body.requestId),
    });
    dbError(result.error);
    return json({ premiumUntil: result.data });
  } catch (e) {
    return failure(e);
  }
}
