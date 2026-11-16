import { GRADES, SUBJECTS } from "@/lib/catalog";
import { AppError, dbError, json, mutation, requireUser } from "./http";
import { revalidateTag } from "next/cache";
export async function saveGame(request: Request, id?: string) {
  const { client } = await requireUser(true);
  const body = await mutation(request);
  const gameId = id ?? body.id;
  if (typeof gameId !== "string")
    throw new AppError(400, "game_invalid", "Đường dẫn game chưa hợp lệ.");
  const payload = body.payload as Record<string, unknown> | undefined;
  if (
    !payload ||
    !Array.isArray(payload.subjects) ||
    !Array.isArray(payload.grades) ||
    payload.subjects.some((x) => !SUBJECTS.some((s) => s.id === x)) ||
    payload.grades.some((x) => !GRADES.some((g) => g.id === x))
  )
    throw new AppError(400, "game_invalid", "Môn hoặc khối lớp chưa hợp lệ.");
  const result = await client.rpc("admin_save_game", {
    p_id: gameId,
    p_payload: payload,
    p_published: body.published,
    p_expected_version: body.expectedVersion,
  });
  dbError(result.error);
  revalidateTag("game-catalog", { expire: 0 });
  return json({ ok: true });
}
