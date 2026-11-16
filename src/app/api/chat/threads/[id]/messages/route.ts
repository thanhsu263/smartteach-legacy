import {
  AppError,
  dbError,
  failure,
  mutation,
  requireUser,
  uuid,
} from "@/lib/admin/http";
import { answerChat } from "@/lib/chat/service";
export const maxDuration = 30;
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/chat/threads/[id]/messages">,
) {
  try {
    const { client, account } = await requireUser(),
      b = await mutation(request, 8192),
      id = uuid((await params).id),
      requestId = uuid(b.requestId);
    if (typeof b.text !== "string" || !b.text.trim() || b.text.length > 1400)
      throw new AppError(
        400,
        "message_invalid",
        "Câu hỏi cần từ 1 đến 1.400 ký tự.",
      );
    const owner = await client
      .from("chat_threads")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    dbError(owner.error);
    if (!owner.data)
      throw new AppError(404, "thread_not_found", "Không tìm thấy hội thoại.");
    const pages = [
        "home",
        "dashboard",
        "quizzes",
        "classes",
        "library",
        "assignments",
        "games",
        "tools",
      ],
      contextPage =
        typeof b.contextPage === "string" && pages.includes(b.contextPage)
          ? b.contextPage
          : "home";
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: string, data: unknown) => {
          if (!request.signal.aborted)
            controller.enqueue(
              new TextEncoder().encode(
                "event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n",
              ),
            );
        };
        try {
          await answerChat(
            client,
            account.userId,
            id,
            requestId,
            b.text as string,
            contextPage,
            emit,
            request.signal,
          );
        } catch (e) {
          const issue =
            e instanceof AppError
              ? e
              : new AppError(503, "answer_unavailable", "Chưa thể trả lời.");
          emit("error", { code: issue.code, message: issue.message });
        } finally {
          emit("done", {});
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
