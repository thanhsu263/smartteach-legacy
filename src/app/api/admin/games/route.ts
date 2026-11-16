import { dbError, failure, json, requireUser } from "@/lib/admin/http";
import { saveGame } from "@/lib/admin/content";
export async function GET() {
  try {
    const { client } = await requireUser(true);
    const result = await client.rpc("admin_catalog");
    dbError(result.error);
    return json({ items: result.data });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    return await saveGame(request);
  } catch (e) {
    return failure(e);
  }
}
