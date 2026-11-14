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

export function classroomPose(seconds: number, pointer: { x: number; y: number }) {
  const phase = seconds / 8 * Math.PI * 2;
  const pan = Math.sin(phase);
  const drift = 1 - Math.cos(phase);
  const shake = 0.1;

  return {
    x: pan * 0.32 + pointer.x * 0.70 * shake,
    y: -drift * 0.025 - pointer.y * 0.40 * shake,
    z: -drift * 0.09,
    lookX: pan * 0.22 + pointer.x * 0.16 * shake,
    lookY: -pointer.y * 0.10 * shake,
    roll: -pointer.x * 0.023 * shake,
  };
}
