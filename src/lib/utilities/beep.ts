/** Tạo hoặc khôi phục AudioContext. Chỉ gọi từ thao tác của người dùng để trình duyệt cho phép phát âm. */
export function prepareAudio(existing: AudioContext | null): AudioContext | null {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return existing;
    const context = existing ?? new Context();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return existing;
  }
}

/** Ba tiếng bíp ngắn báo hết giờ. */
export function playFinishBeeps(context: AudioContext | null): void {
  if (!context) return;
  try {
    const start = context.currentTime + 0.05;
    for (let index = 0; index < 3; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * 0.4;
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.3);
    }
  } catch {
    // Không phát được âm thì bỏ qua; màn hình vẫn báo hết giờ bằng chữ.
  }
}
