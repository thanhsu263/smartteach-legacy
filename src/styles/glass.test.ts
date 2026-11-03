import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const globals = read("src/app/globals.css");
const tokens = read("src/styles/tokens.css");
const glass = read("src/styles/glass.css");
const ambient = read("src/components/ambient-background.module.css");

type Rgb = [number, number, number];

function color(name: string): Rgb {
  const match = globals.match(new RegExp(`--color-${name}:\\s*#([0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`Thiếu token --color-${name}`);
  const hex = match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return top.map((channel, i) => channel * alpha + bottom[i] * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe("hệ vật liệu Apple-style", () => {
  it("giữ chữ chính và chữ phụ đạt 4.5:1 trên bề mặt nội dung đặc", () => {
    expect(contrast(color("ink"), color("surface"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color("ink-muted"), color("surface"))).toBeGreaterThanOrEqual(4.5);
  });

  it("giữ chữ phụ đạt 4.5:1 trên panel xanh tint 8%", () => {
    const tintedPanel = over(color("primary"), 0.08, color("surface"));
    expect(contrast(color("ink-muted"), tintedPanel)).toBeGreaterThanOrEqual(4.5);
  });

  it("giữ CTA vàng và nút trong trên hero đủ tương phản", () => {
    expect(contrast(color("ink"), color("accent"))).toBeGreaterThanOrEqual(4.5);
    const translucentButton = over([255, 255, 255], 0.1, color("primary"));
    expect(contrast([255, 255, 255], translucentButton)).toBeGreaterThanOrEqual(4.5);
  });

  it("chỉ dùng blur cho lớp nổi, không dùng cho card nội dung", () => {
    expect(tokens).toMatch(/--glass-blur-card:\s*none\s*;/);
    expect(tokens).toMatch(/--glass-blur-float:\s*blur\(/);
    expect(glass).toContain('[data-surface="float"]');
  });

  it("không còn nền trang trí chuyển động hoặc utility con trỏ toàn trang", () => {
    expect(ambient).not.toMatch(/animation\s*:|@keyframes|will-change/);
    expect(existsSync(join(process.cwd(), "src/lib/liquid-glass.ts"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/components/liquid-glass.tsx"))).toBe(false);
  });

  it("motion token không dùng đường cong overshoot", () => {
    expect(tokens).not.toMatch(/cubic-bezier\([^)]*,\s*1\.[1-9]/);
    expect(tokens).toContain("--motion-press: 100ms");
    expect(tokens).toContain("--motion-layer: 260ms");
  });
});
