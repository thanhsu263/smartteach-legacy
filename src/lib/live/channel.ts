import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignalHandlers, SignalSource } from "@/lib/live/sync";

/**
 * Kênh Realtime Broadcast của một phiên: `session:<id>`.
 *
 * Kênh công khai: ai biết `session:<id>` đều nghe và gửi được; id chỉ được trả về sau khi vào phòng.
 * Điều đó chấp nhận được vì tin báo CHỈ mang `{ seq }` (số thứ tự pha), không có dữ liệu nào khác, và
 * người nhận không tin nội dung: nó chỉ làm thêm một lần hỏi trạng thái từ Postgres. Một tin giả
 * không đổi được trạng thái, điểm hay đáp án của ai.
 */

export const SIGNAL_EVENT = "seq";

export const channelName = (sessionId: string) => `session:${sessionId}`;

/** Đọc `seq` từ tin Broadcast; sai dạng thì trả null (vẫn là gợi ý hỏi lại, không tin giá trị). */
export function parseSignal(message: unknown): number | null {
  const seq = (message as { payload?: { seq?: unknown } } | null)?.payload?.seq;
  return typeof seq === "number" && Number.isSafeInteger(seq) && seq >= 0 ? seq : null;
}

export type SessionChannel = {
  source: SignalSource;
  /** Giáo viên báo "đã sang pha mới"; thất bại thì bỏ qua vì người chơi vẫn hỏi định kỳ. */
  notify(seq: number): Promise<void>;
};

type Channel = ReturnType<SupabaseClient["channel"]>;

export function createSessionChannel(supabase: SupabaseClient, sessionId: string): SessionChannel {
  let channel: Channel | null = null;

  const source: SignalSource = (handlers: SignalHandlers) => {
    const current = supabase.channel(channelName(sessionId), { config: { broadcast: { self: false } } });
    channel = current;
    current
      .on("broadcast", { event: SIGNAL_EVENT }, (message) => handlers.onSignal(parseSignal(message)))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") handlers.onStatus("subscribed");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") handlers.onStatus("closed");
      });
    return () => {
      if (channel === current) channel = null;
      void supabase.removeChannel(current);
    };
  };

  return {
    source,
    async notify(seq) {
      const current = channel;
      if (!current || !Number.isSafeInteger(seq) || seq < 0) return;
      try {
        // Chỉ gửi seq, tuyệt đối không kèm dữ liệu khác.
        await current.send({ type: "broadcast", event: SIGNAL_EVENT, payload: { seq } });
      } catch {
        // Người chơi vẫn đồng bộ được bằng polling.
      }
    },
  };
}
