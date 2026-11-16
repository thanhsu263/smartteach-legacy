import {
  dbError,
  failure,
  json,
  pageParams,
  requireUser,
} from "@/lib/admin/http";
export async function GET(request: Request) {
  try {
    const { client } = await requireUser(true);
    const { query, offset, params } = pageParams(request);
    const result = await client.rpc("admin_users", {
      p_query: query,
      p_offset: offset,
      p_role: params.get("role") ?? "",
      p_status: params.get("status") ?? "",
    });
    dbError(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}
