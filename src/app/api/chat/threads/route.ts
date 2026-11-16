import {
  dbError,
  failure,
  json,
  mutation,
  pageParams,
  requireUser,
} from "@/lib/admin/http";
export async function GET(request: Request) {
  try {
    const { client } = await requireUser(),
      { offset } = pageParams(request);
    const result = await client.rpc("chat_list_threads", { p_offset: offset });
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { client } = await requireUser();
    await mutation(request);
    const result = await client.rpc("chat_create_thread");
    dbError(result.error);
    return json({ id: result.data }, 201);
  } catch (e) {
    return failure(e);
  }
}
