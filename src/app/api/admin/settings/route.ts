import { revalidateTag } from "next/cache";
import {
  AppError,
  dbError,
  failure,
  json,
  mutation,
  requireUser,
} from "@/lib/admin/http";
export async function GET() {
  try {
    const { client } = await requireUser(true);
    const result = await client
      .from("site_settings")
      .select("data,version")
      .eq("id", true)
      .single();
    dbError(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { client } = await requireUser(true);
    const body = await mutation(request),
      data = body.data as Record<string, unknown> | undefined;
    if (
      !data ||
      typeof data.contactEmail !== "string" ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.contactEmail) ||
      !Array.isArray(data.faq) ||
      data.faq.some(
        (item) =>
          !item ||
          typeof item.question !== "string" ||
          typeof item.answer !== "string" ||
          item.question.length > 200 ||
          item.answer.length > 2000,
      )
    )
      throw new AppError(
        400,
        "settings_invalid",
        "Email hoặc câu hỏi thường gặp chưa hợp lệ.",
      );
    const result = await client.rpc("admin_save_settings", {
      p_data: data,
      p_expected_version: body.expectedVersion,
    });
    dbError(result.error);
    revalidateTag("site-settings", { expire: 0 });
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
