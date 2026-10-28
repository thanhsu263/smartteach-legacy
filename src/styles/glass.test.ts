import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const globals = read("src/app/globals.css");
const tokens = read("src/styles/tokens.css");

type Rgb = [number, number, number];

function color(name: string): Rgb {
  const match = globals.match(new RegExp(`--color-${name}:\\s*#([0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`Thiếu token --color-${name}`);
  const hex = match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function number(name: string): number {
  const match = tokens.match(new RegExp(`${name}:\\s*([0-9.]+)\\s*;`));
  if (!match) throw new Error(`Thiếu token ${name} trong tokens.css`);
  return Number(match[1]);
}

/** Trộn `top` (độ mờ alpha) lên `bottom`. */
function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return top.map((c, i) => c * alpha + bottom[i] * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("lớp Liquid Glass giữ tương phản trên nền động", () => {
  const accent = color("primary");
  const blobMax = number("--blob-opacity");
  // Chỗ tối nhất có thể gặp: nền trang cộng đỉnh một đốm màu accent.
  const underBlob = over(accent, blobMax, color("bg"));

  it("chữ phụ trần trên đỉnh đốm màu đạt 4.5:1", () => {
    expect(contrast(color("ink-muted"), underBlob)).toBeGreaterThanOrEqual(4.5);
  });

  it("chữ chính trần trên đỉnh đốm màu đạt 4.5:1", () => {
    expect(contrast(color("ink"), underBlob)).toBeGreaterThanOrEqual(4.5);
  });

  it("chữ phụ và chữ xanh trên kính mỏng nhất (nền 45% trắng) đặt trên đốm màu đạt 4.5:1", () => {
    const thinnest = over([255, 255, 255], 0.45, underBlob);
    expect(contrast(color("ink-muted"), thinnest)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("primary"), thinnest)).toBeGreaterThanOrEqual(4.5);
  });

  it("chữ trắng trên nút kính trong suốt đặt trên hero xanh đạt 4.5:1", () => {
    // on-primary: nền 14% trắng trên Xanh bảng, đầu sáng nhất của dải gradient.
    const button = over([255, 255, 255], 0.14, accent);
    expect(contrast([255, 255, 255], button)).toBeGreaterThanOrEqual(4.5);
  });

  it("độ mờ đốm màu nằm trong khoảng nền động tinh tế", () => {
    expect(blobMax).toBeGreaterThanOrEqual(0.15);
    expect(blobMax).toBeLessThanOrEqual(0.32);
  });
});
