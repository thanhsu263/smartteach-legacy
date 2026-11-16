import {
  AppError,
  dbError,
  failure,
  json,
  requireUser,
  uuid,
} from "@/lib/admin/http";
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/chat/sources/[id]">,
) {
  try {
    const { client } = await requireUser();
    const result = await client.rpc("rag_source", {
      p_id: uuid((await params).id),
    });
    dbError(result.error);
    if (!result.data)
      throw new AppError(
        404,
        "source_unavailable",
        "Nguồn không còn được công bố.",
      );
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
