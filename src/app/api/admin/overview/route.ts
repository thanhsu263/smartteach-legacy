import { dbError, failure, json, requireUser } from "@/lib/admin/http";
export async function GET() {
  try {
    const { client } = await requireUser(true);
    const result = await client.rpc("admin_overview");
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
