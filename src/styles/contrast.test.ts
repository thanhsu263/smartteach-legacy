import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`Thiếu token --color-${name} trong globals.css`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const WHITE = "#ffffff";

// [chữ hoặc thành phần, nền, ngưỡng tối thiểu]
const textPairs: Array<[string, string, string, number]> = [
  ["ink", "ink", "bg", 4.5],
  ["ink", "ink", "surface", 4.5],
  ["ink-muted", "ink-muted", "bg", 4.5],
  ["ink-muted", "ink-muted", "surface", 4.5],
  ["ink-muted", "ink-muted", "primary-tint", 4.5],
  ["ink-muted", "ink-muted", "border", 4.5],
  ["ink", "ink", "accent", 4.5],
  ["ink", "ink", "accent-deep", 4.5],
  ["primary", "primary", "surface", 4.5],
  ["primary", "primary", "bg", 4.5],
  ["primary", "primary", "primary-tint", 4.5],
  ["primary-deep", "primary-deep", "primary-tint", 4.5],
  ["success", "success", "surface", 4.5],
  ["danger", "danger", "surface", 4.5],
];

describe("tương phản WCAG AA của token màu", () => {
  it.each(textPairs)("chữ %s trên %s đạt tối thiểu %s", (_label, fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });

  it("chữ trắng trên nền xanh hero đạt 4.5:1", () => {
    expect(contrast(WHITE, token("primary"))).toBeGreaterThanOrEqual(4.5);
  });

  it("chữ trắng trên xanh đậm đạt 4.5:1", () => {
    expect(contrast(WHITE, token("primary-deep"))).toBeGreaterThanOrEqual(4.5);
  });

  it("chữ phụ trên nền hero xanh đạt 4.5:1", () => {
    expect(contrast(token("on-primary-muted"), token("primary"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("ô đáp án của quiz trực tiếp", () => {
  const tiles = ["a", "b", "c", "d", "e", "f"].map((letter) => `tile-${letter}`);

  it.each(tiles)("chữ và hình trắng trên %s đạt 4.5:1", (name) => {
    expect(contrast(WHITE, token(name))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(tiles)("%s so với nền trang và bề mặt đạt 3:1", (name) => {
    expect(contrast(token(name), token("bg"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token(name), token("surface"))).toBeGreaterThanOrEqual(3);
  });

  it("vòng chọn bằng Mực cách ô một khoảng nên so với nền trang và bề mặt đạt 3:1 (nhìn ra ô đang chọn)", () => {
    expect(contrast(token("ink"), token("bg"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("ink"), token("surface"))).toBeGreaterThanOrEqual(3);
  });

  it("sáu màu ô đều khác nhau", () => {
    expect(new Set(tiles.map(token)).size).toBe(tiles.length);
  });

  it("DESIGN.md khớp globals.css cho sáu màu ô", () => {
    const design = readFileSync(join(process.cwd(), "DESIGN.md"), "utf8");
    for (const name of tiles) {
      const match = design.match(new RegExp(`${name}:\\s*"(#[0-9a-fA-F]{6})"`));
      expect(match?.[1].toLowerCase(), name).toBe(token(name).toLowerCase());
    }
  });
});

describe("tương phản thành phần giao diện (3:1)", () => {
  it("viền ô nhập so với bề mặt", () => {
    expect(contrast(token("border-strong"), token("surface"))).toBeGreaterThanOrEqual(3);
  });

  it("vòng focus xanh đậm so với bề mặt và nền", () => {
    expect(contrast(token("primary-deep"), token("surface"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("primary-deep"), token("bg"))).toBeGreaterThanOrEqual(3);
  });

  it("vòng focus vàng so với nền hero xanh", () => {
    expect(contrast(token("accent"), token("primary"))).toBeGreaterThanOrEqual(3);
  });
});
