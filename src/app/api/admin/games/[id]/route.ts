import { failure } from "@/lib/admin/http";
import { saveGame } from "@/lib/admin/content";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await saveGame(request, (await context.params).id);
  } catch (e) {
    return failure(e);
  }
}
