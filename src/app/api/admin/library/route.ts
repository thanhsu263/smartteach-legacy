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
    const { offset, query, params } = pageParams(request);
    const result = await client.rpc("admin_library", {
      p_offset: offset,
      p_query: query,
      p_status: params.get("status") ?? "",
    });
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
