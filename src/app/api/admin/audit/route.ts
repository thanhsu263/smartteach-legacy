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
    const { offset, query } = pageParams(request);
    const result = await client.rpc("admin_audit_search", {
      p_offset: offset,
      p_query: query,
    });
    dbError(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}
