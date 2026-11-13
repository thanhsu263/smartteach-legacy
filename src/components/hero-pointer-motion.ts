const maxPointerSpeed = 1500;

type PointerSample = { x: number; y: number; at: number };

export function pointerImpulse(previous: PointerSample, current: PointerSample) {
  const elapsed = current.at - previous.at;
  if (elapsed < 0 || elapsed > 125) return { x: 0, y: 0 };

  const x = current.x - previous.x;
  const y = current.y - previous.y;
  const scale = 1 / Math.max(1, Math.hypot(x, y), maxPointerSpeed * Math.max(8, elapsed) / 1000);
  return { x: x * scale, y: y * scale };
}
