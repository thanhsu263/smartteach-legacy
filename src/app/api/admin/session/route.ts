import { failure, json, requireUser } from "@/lib/admin/http";
export async function GET() {
  try {
    const { account } = await requireUser();
    return json(account);
  } catch (error) {
    return failure(error);
  }
}
