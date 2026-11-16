import {
  dbError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/admin/rag/documents/[id]">,
) {
  try {
    const { client } = await requireUser(true),
      b = await mutation(request);
    dbError(
      (
        await client.rpc("admin_delete_document", {
          p_id: uuid((await params).id),
          p_generation: b.expectedVersion,
        })
      ).error,
    );
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
