import {
  dbError,
  failure,
  json,
  mutation,
  pageParams,
  requireUser,
  uuid,
} from "@/lib/admin/http";
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/chat/threads/[id]">,
) {
  try {
    const { client } = await requireUser();
    const result = await client.rpc("chat_thread_messages", {
      p_id: uuid((await params).id),
      p_offset: pageParams(request).offset,
    });
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/chat/threads/[id]">,
) {
  try {
    const { client } = await requireUser();
    await mutation(request);
    dbError(
      (
        await client.rpc("chat_delete_thread", {
          p_id: uuid((await params).id),
        })
      ).error,
    );
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
