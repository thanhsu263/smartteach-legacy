/**
 * Ước lượng độ lệch giữa đồng hồ máy khách và đồng hồ máy chủ từ trường `server_now` của mỗi lần hỏi
 * trạng thái, để thanh đếm giờ khớp với hạn chót thật. Chỉ để HIỂN THỊ: hạn chót thật luôn do máy chủ
 * quyết định (`submit_answer` so với `clock_timestamp()` của Postgres), nên ước lượng sai chỉ làm thanh
 * đếm lệch chứ không cho ai nộp trễ được.
 */

const WINDOW = 8;

type Sample = { offset: number; rtt: number };

export type ServerClock = {
  /** Ghi một mẫu: máy chủ báo `serverNowMs` trong khoảng máy khách gửi lúc `sentAt` và nhận lúc `receivedAt`. */
  sample(serverNowMs: number, sentAt: number, receivedAt: number): void;
  /** Giờ máy chủ ước lượng (ms). */
  now(): number;
  /** Số ms còn lại tới `deadlineMs` (giờ máy chủ), không âm. */
  remainingMs(deadlineMs: number): number;
  /** Độ lệch hiện tại (máy chủ trừ máy khách), ms. */
  offsetMs(): number;
};

export function createServerClock(clientNow: () => number = Date.now): ServerClock {
  const samples: Sample[] = [];

  // Mẫu có độ trễ khứ hồi thấp nhất là mẫu tin cậy nhất (sai số tối đa bằng nửa độ trễ).
  const best = () => samples.reduce<Sample | null>((acc, s) => (acc === null || s.rtt < acc.rtt ? s : acc), null);
  const offsetMs = () => best()?.offset ?? 0;

  return {
    sample(serverNowMs, sentAt, receivedAt) {
      if (!Number.isFinite(serverNowMs) || receivedAt < sentAt) return;
      const rtt = receivedAt - sentAt;
      samples.push({ offset: serverNowMs - (sentAt + rtt / 2), rtt });
      if (samples.length > WINDOW) samples.shift();
    },
    now: () => clientNow() + offsetMs(),
    remainingMs: (deadlineMs) => Math.max(0, deadlineMs - (clientNow() + offsetMs())),
    offsetMs,
  };
}
