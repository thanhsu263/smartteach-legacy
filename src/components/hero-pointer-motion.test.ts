import { describe, expect, it } from "vitest";
import { classroomPose, pointerImpulse } from "./hero-pointer-motion";

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

describe("chu kỳ lớp học", () => {
  const restingPointer = { x: 0, y: 0 };

  it("lặp lại vị trí và tốc độ sau 8 giây, kể cả khi chuột đứng yên", () => {
    expect(classroomPose(2, restingPointer).x).not.toBe(0);
    for (const time of [0, 0.01, 2, 4, 7.99]) {
      const a = classroomPose(time, restingPointer);
      const b = classroomPose(time + 8, restingPointer);
      for (const axis of ["x", "y", "z", "lookX", "lookY", "roll"] as const) {
        expect(b[axis]).toBeCloseTo(a[axis], 8);
      }
    }
  });

  it("giữ 20% biên độ rung chuột trên từng trục", () => {
    const resting = classroomPose(2, restingPointer);
    const moving = classroomPose(2, { x: 1, y: 1 });
    expect(moving.x - resting.x).toBeCloseTo(0.14);
    expect(moving.y - resting.y).toBeCloseTo(-0.08);
    expect(moving.lookX - resting.lookX).toBeCloseTo(0.032);
    expect(moving.lookY - resting.lookY).toBeCloseTo(-0.02);
    expect(moving.roll - resting.roll).toBeCloseTo(-0.0046);
  });
});
