import { describe, expect, it } from "vitest";
import { chestTone, describeChange, describeChestKind, formatDelta, STREAK_TARGET, type OpenedChest } from "./treasure";

const chest = (before: number, after: number): OpenedChest => ({
  status: "opened",
  kind: "win",
  label: "Nhân đôi điểm",
  op: "mul",
  operand: 2,
  before,
  after,
  auto: false,
});

describe("kho báu (hiển thị)", () => {
  it("hiệu ứng tăng, giảm hoặc giữ nguyên điểm được nhận ra đúng", () => {
    expect(chestTone(chest(1000, 2000))).toBe("up");
    expect(chestTone(chest(1000, 500))).toBe("down");
    expect(chestTone(chest(0, 0))).toBe("same");
    expect(chestTone(chest(4000, 4000))).toBe("same");
  });

  it("mô tả thay đổi điểm bằng chữ", () => {
    expect(describeChange(chest(3000, 6000))).toBe("3000 thành 6000 điểm");
    expect(formatDelta(700)).toBe("+700 điểm");
    expect(formatDelta(-300)).toBe("-300 điểm");
    expect(formatDelta(0)).toBe("0 điểm");
  });

  it("giải thích loại rương và nói rõ rương an ủi không bị trừ điểm", () => {
    expect(describeChestKind("win")).toContain(`${STREAK_TARGET} câu liên tiếp`);
    expect(describeChestKind("comfort")).toContain("không bị trừ");
    expect(STREAK_TARGET).toBe(3);
  });
});
