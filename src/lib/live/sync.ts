import { createServerClock, parseServerTime, type ServerClock } from "@/lib/live/clock";
import type { ConnectionStatus } from "@/lib/live/types";

/**
 * Lõi đồng bộ trạng thái phiên chơi, không phụ thuộc React.
 *
 * Nguồn đúng duy nhất là `fetchState` (gọi hàm Postgres). Realtime Broadcast chỉ là "chuông báo": mỗi
 * tin `{ seq }` chỉ làm thêm một lần hỏi trạng thái. Nếu kênh hỏng hay mất tin thì hỏi định kỳ (polling)
 * nên trò chơi vẫn tiếp tục. Một client độc hại gửi tin giả chỉ gây thêm một lần hỏi, và các lần hỏi do
 * tin báo gây ra cách nhau tối thiểu `minSignalGapMs`.
 */

export type SyncState = { seq: number; server_now: string };

export type FetchOutcome<T> =
  | { ok: true; state: T }
  /** `fatal`: lỗi không thể tự khỏi (mã tham gia hỏng); dừng hỏi và báo giao diện. */
  | { ok: false; message: string; fatal?: boolean };

export type SignalHandlers = {
  /** Nhận tin báo; `seq` là null nếu tin không đọc được (vẫn coi là gợi ý hỏi lại). */
  onSignal: (seq: number | null) => void;
  onStatus: (status: "subscribed" | "closed") => void;
};

/** Trả về hàm huỷ đăng ký. */
export type SignalSource = (handlers: SignalHandlers) => () => void;

export type SyncSnapshot<T> = {
  state: T | null;
  status: ConnectionStatus;
  /** Lời nhắn của lần hỏi lỗi gần nhất (xoá khi hỏi thành công). */
  error: string | null;
  /** Lỗi không thể tự khỏi: giao diện cần đưa người chơi về bước vào phòng. */
  fatal: boolean;
  clock: ServerClock;
};

export type SyncOptions<T extends SyncState> = {
  fetchState: () => Promise<FetchOutcome<T>>;
  /**
   * Chọn kênh Realtime từ trạng thái vừa nhận (học sinh chỉ biết id phiên sau lần hỏi đầu). Cùng `key`
   * thì giữ nguyên kênh; trả null thì chưa đăng ký.
   */
  channelFor?: (state: T) => { key: string; source: SignalSource } | null;
  /** Khoảng hỏi định kỳ (ms) khi kênh không báo; 0 nghĩa là trạng thái đã cuối cùng, ngừng hỏi. */
  pollMs?: (state: T | null) => number;
  /** Khoảng hỏi dự phòng khi kênh đang sống (ms). */
  livePollMs?: number;
  maxBackoffMs?: number;
  /** Khoảng tối thiểu giữa hai lần hỏi do tin báo gây ra (ms). */
  minSignalGapMs?: number;
  now?: () => number;
};

export const DEFAULT_POLL_MS = 3000;
export const DEFAULT_LIVE_POLL_MS = 10_000;
export const DEFAULT_MAX_BACKOFF_MS = 30_000;
export const DEFAULT_MIN_SIGNAL_GAP_MS = 500;

export type LiveSync<T extends SyncState> = {
  /** Bắt đầu hỏi và đăng ký kênh. Có thể `stop()` rồi `start()` lại (React StrictMode, ẩn/hiện trang). */
  start(): void;
  stop(): void;
  /**
   * Hỏi lại ngay (ví dụ sau khi giáo viên vừa thao tác) và chờ lần hỏi BẮT ĐẦU SAU lệnh gọi này xong. Nếu
   * đang có một lần hỏi bay thì lần đó có thể đã đọc trước thao tác, nên phải chờ lần hỏi tiếp theo.
   */
  refresh(): Promise<void>;
  getSnapshot(): SyncSnapshot<T>;
  /** Đăng ký nghe thay đổi; trả về hàm huỷ. Tương thích `useSyncExternalStore`. */
  listen(listener: () => void): () => void;
};

export function createLiveSync<T extends SyncState>(options: SyncOptions<T>): LiveSync<T> {
  const now = options.now ?? Date.now;
  const clock = createServerClock(now);
  const pollMs = options.pollMs ?? (() => DEFAULT_POLL_MS);
  const livePollMs = options.livePollMs ?? DEFAULT_LIVE_POLL_MS;
  const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const minSignalGapMs = options.minSignalGapMs ?? DEFAULT_MIN_SIGNAL_GAP_MS;

  let state: T | null = null;
  let error: string | null = null;
  let fatal = false;
  let channelUp = false;
  let channelKey: string | null = null;
  let failures = 0;
  let lastSeq = -1;
  let running = false;
  // Tăng mỗi lần stop() để bỏ kết quả của các lần hỏi cũ còn đang bay.
  let generation = 0;
  let inFlight = false;
  let pendingRefetch = false;
  // Người đang chờ `refresh()`: được gỡ khi lần hỏi KẾ TIẾP (bắt đầu sau khi họ đăng ký) hoàn tất.
  let nextWaiters: (() => void)[] = [];
  let lastFetchStartedAt = -Infinity;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let signalTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  let snapshot: SyncSnapshot<T> = { state: null, status: "polling", error: null, fatal: false, clock };
  const listeners = new Set<() => void>();

  const computeStatus = (): ConnectionStatus => {
    if (failures >= 2) return "offline";
    if (channelUp && failures === 0 && state !== null) return "live";
    return "polling";
  };

  // Chỉ tạo snapshot mới khi có gì đổi, để `useSyncExternalStore` không render thừa.
  const publish = () => {
    const status = computeStatus();
    if (snapshot.state === state && snapshot.status === status && snapshot.error === error && snapshot.fatal === fatal) return;
    snapshot = { state, status, error, fatal, clock };
    for (const listener of [...listeners]) listener();
  };

  const dropChannel = () => {
    unsubscribe?.();
    unsubscribe = undefined;
    channelKey = null;
    channelUp = false;
  };

  const isFinal = () => state !== null && options.pollMs !== undefined && options.pollMs(state) <= 0;

  const nextPollDelay = (): number | null => {
    if (fatal) return null;
    const base = pollMs(state);
    if (base <= 0) return null;
    const normal = channelUp ? Math.max(base, livePollMs) : base;
    // Giãn dần khi lỗi liên tiếp: 2x, 4x, ... tới mức trần.
    return failures > 0 ? Math.min(normal * 2 ** failures, maxBackoffMs) : normal;
  };

  const schedulePoll = () => {
    clearTimeout(pollTimer);
    pollTimer = undefined;
    if (!running) return;
    const delay = nextPollDelay();
    if (delay === null) return;
    pollTimer = setTimeout(() => void fetchNow(), delay);
  };

  const ensureChannel = () => {
    if (!running || state === null || !options.channelFor || isFinal()) return;
    const spec = options.channelFor(state);
    if (!spec || spec.key === channelKey) return;
    dropChannel();
    channelKey = spec.key;
    const mine = spec.key;
    unsubscribe = spec.source({
      onSignal: (seq) => handleSignal(seq),
      onStatus: (status) => {
        if (channelKey !== mine) return;
        const up = status === "subscribed";
        const reconnected = up && !channelUp;
        channelUp = up;
        publish();
        schedulePoll();
        // Kênh vừa sống (hoặc sống lại): có thể đã lỡ tin trong lúc mất kênh.
        if (reconnected && state !== null) void fetchNow();
      },
    });
  };

  async function fetchNow(): Promise<void> {
    if (!running) return;
    if (inFlight) {
      pendingRefetch = true;
      return;
    }
    inFlight = true;
    clearTimeout(pollTimer);
    const waiters = nextWaiters;
    nextWaiters = [];
    const release = () => waiters.forEach((resolve) => resolve());
    const mine = generation;
    const sentAt = now();
    lastFetchStartedAt = sentAt;
    let outcome: FetchOutcome<T>;
    try {
      outcome = await options.fetchState();
    } catch {
      outcome = { ok: false, message: "Mất kết nối. Ứng dụng sẽ tự thử lại." };
    }
    if (mine !== generation) {
      release();
      return;
    }
    const receivedAt = now();
    inFlight = false;

    if (outcome.ok) {
      failures = 0;
      error = null;
      clock.sample(parseServerTime(outcome.state.server_now), sentAt, receivedAt);
      // Bỏ qua trạng thái cũ hơn trạng thái đã nhận (theo seq); cùng seq thì lấy bản mới
      // (số người đã trả lời có thể đổi mà seq chưa đổi).
      if (outcome.state.seq >= lastSeq) {
        lastSeq = outcome.state.seq;
        state = outcome.state;
      }
      // Trạng thái cuối cùng: ngừng hỏi và nhả kênh Realtime để không chiếm kết nối.
      if (isFinal()) dropChannel();
      else ensureChannel();
    } else {
      failures += 1;
      error = outcome.message;
      if (outcome.fatal) {
        fatal = true;
        // Mã tham gia hỏng thì không cần nghe kênh nữa: nhả kết nối (gói Free chỉ có 200).
        dropChannel();
      }
    }
    publish();
    release();

    if (pendingRefetch) {
      pendingRefetch = false;
      void fetchNow();
    } else {
      schedulePoll();
    }
  }

  function handleSignal(seq: number | null) {
    if (!running || fatal) return;
    // Tin báo cũ hoặc trùng với trạng thái đã có thì bỏ qua. Tin giả có seq lớn chỉ gây một lần hỏi.
    if (seq !== null && seq <= lastSeq) return;
    if (signalTimer !== undefined) return;
    const wait = Math.max(0, lastFetchStartedAt + minSignalGapMs - now());
    if (wait === 0) {
      void fetchNow();
      return;
    }
    signalTimer = setTimeout(() => {
      signalTimer = undefined;
      void fetchNow();
    }, wait);
  }

  return {
    start() {
      if (running) return;
      running = true;
      // Bắt đầu lại sau stop(): coi như chưa có kênh và chưa có lỗi.
      failures = 0;
      error = null;
      void fetchNow();
      ensureChannel();
    },
    stop() {
      if (!running) return;
      running = false;
      generation += 1;
      inFlight = false;
      pendingRefetch = false;
      const waiting = nextWaiters;
      nextWaiters = [];
      waiting.forEach((resolve) => resolve());
      clearTimeout(pollTimer);
      clearTimeout(signalTimer);
      pollTimer = undefined;
      signalTimer = undefined;
      dropChannel();
    },
    refresh() {
      if (!running) return Promise.resolve();
      return new Promise<void>((resolve) => {
        nextWaiters.push(resolve);
        void fetchNow();
      });
    },
    getSnapshot: () => snapshot,
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Khoảng hỏi định kỳ mặc định theo pha: phòng chờ và đang hỏi 3 giây, hiện đáp án chậm hơn, đã kết thúc ngừng. */
export function pollIntervalForPhase(phase: string | undefined): number {
  switch (phase) {
    case "ended":
    case "removed":
      return 0;
    case "reveal":
      return 5000;
    default:
      return DEFAULT_POLL_MS;
  }
}
