import { describe, expect, it } from "vitest";
import { pointerImpulse } from "./hero-pointer-motion";

describe("chuyển động lớp học theo tốc độ chuột", () => {
  const start = { x: 0, y: 0, at: 100 };

  it("tăng độ nghiêng khi rê cùng quãng đường trong thời gian ngắn hơn", () => {
    const slow = pointerImpulse(start, { x: 12, y: -9, at: 160 });
    const fast = pointerImpulse(start, { x: 12, y: -9, at: 120 });
    expect(fast.x).toBeCloseTo(slow.x * 3);
    expect(fast.y).toBeCloseTo(slow.y * 3);
    expect(fast.y).toBeLessThan(0);
  });

  it("giới hạn chuyển động chéo và bỏ mẫu cách nhau quá lâu", () => {
    const impulse = pointerImpulse(start, { x: 900, y: 900, at: 100 });
    expect(Math.hypot(impulse.x, impulse.y)).toBeCloseTo(1);
    expect(pointerImpulse(start, { x: 900, y: 0, at: 400 })).toEqual({ x: 0, y: 0 });
  });
});
