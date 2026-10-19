/**
 * Sáu ô đáp án A-F: mỗi ô có chữ cái, hình và màu riêng để không phân biệt chỉ bằng màu (WCAG 1.4.1).
 * Bộ hình và màu riêng của dự án (khớp DESIGN.md và token `--color-tile-*` trong globals.css).
 */

export type AnswerShape = "hexagon" | "star" | "cross" | "pentagon" | "halfmoon" | "drop";

export type AnswerStyle = {
  letter: string;
  shape: AnswerShape;
  /** Tên hình bằng tiếng Việt, dùng cho tooltip và kiểm thử; hình trên ô là trang trí (đã có chữ cái). */
  shapeName: string;
  colorVar: string;
};

export const ANSWER_STYLES: readonly AnswerStyle[] = [
  { letter: "A", shape: "hexagon", shapeName: "lục giác", colorVar: "--color-tile-a" },
  { letter: "B", shape: "star", shapeName: "ngôi sao", colorVar: "--color-tile-b" },
  { letter: "C", shape: "cross", shapeName: "dấu cộng", colorVar: "--color-tile-c" },
  { letter: "D", shape: "pentagon", shapeName: "ngũ giác", colorVar: "--color-tile-d" },
  { letter: "E", shape: "halfmoon", shapeName: "bán nguyệt", colorVar: "--color-tile-e" },
  { letter: "F", shape: "drop", shapeName: "giọt nước", colorVar: "--color-tile-f" },
];

/** Kiểu của lựa chọn thứ `index` (từ 0); quá 6 thì quay vòng (quiz chỉ cho tối đa 6 lựa chọn). */
export function answerStyle(index: number): AnswerStyle {
  return ANSWER_STYLES[((index % ANSWER_STYLES.length) + ANSWER_STYLES.length) % ANSWER_STYLES.length];
}
