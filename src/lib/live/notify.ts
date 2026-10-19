import type { SupabaseClient } from "@supabase/supabase-js";
import { createSessionChannel } from "@/lib/live/channel";
import { host, type LiveResult } from "@/lib/live/rpc";

/**
 * Kết thúc một phiên rồi báo `{ seq }` cho người chơi, dùng khi giáo viên không ở màn hình điều khiển của phiên đó
 * (ví dụ kết thúc phiên cũ từ danh sách quiz). Nếu không báo thì học sinh chỉ biết qua polling, chậm tới 10 giây.
 * Báo thất bại không làm hỏng việc kết thúc.
 */
export async function endSessionAndNotify(supabase: SupabaseClient, sessionId: string): Promise<LiveResult<object>> {
  const result = await host.end(supabase, sessionId);
  // Phiên đã kết thúc từ trước (hết hạn, hay kết thúc ở nơi khác) vẫn đáng báo lại cho chắc.
  if (result.ok || result.reason === "session_ended") {
    const state = await host.state(supabase, sessionId);
    if (state.ok) await createSessionChannel(supabase, sessionId).notify(state.state.seq);
  }
  return result;
}
