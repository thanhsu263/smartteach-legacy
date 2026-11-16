import {
  AppError,
  failure,
  json,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { runtime, withGemini } from "@/lib/ai/gemini";
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/ai/credentials/[id]/test">,
) {
  try {
    await requireUser(true);
    await mutation(request);
    const id = uuid((await params).id),
      config = await runtime();
    if (!config.settings.chat_model)
      throw new AppError(
        409,
        "model_missing",
        "Chọn model trước khi kiểm kết nối.",
      );
    await withGemini(
      config.settings.chat_model,
      200,
      (ai, signal) =>
        ai.models.generateContent({
          model: config.settings.chat_model!,
          contents: "Reply with OK.",
          config: { maxOutputTokens: 8, abortSignal: signal },
        }),
      id,
    );
    return json({ state: "healthy", checkedAt: new Date().toISOString() });
  } catch (e) {
    return failure(e);
  }
}
