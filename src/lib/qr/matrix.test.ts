import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { buildQrMatrix, matrixToPath, QUIET_ZONE, qrSize } from "./matrix";

/** Vẽ ma trận ra bộ đệm RGBA như màn hình sẽ hiển thị: nền trắng, mô-đun đen, có vùng yên tĩnh. */
function render(matrix: boolean[][], scale = 8) {
  const modules = qrSize(matrix);
  const width = modules * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  matrix.forEach((cells, row) =>
    cells.forEach((dark, col) => {
      if (!dark) return;
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          const offset = (((row + QUIET_ZONE) * scale + y) * width + (col + QUIET_ZONE) * scale + x) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }),
  );
  return { data, width };
}

function decode(text: string): string | null {
  const { data, width } = render(buildQrMatrix(text));
  return jsQR(data, width, width)?.data ?? null;
}

describe("mã QR vào phòng", () => {
  it("quét ra đúng địa chỉ vào phòng, kể cả địa chỉ thật dài hơn", () => {
    for (const text of [
      "http://localhost:3000/play?pin=123456",
      "https://smartteachvn.vercel.app/play?pin=042917",
      "https://ten-mien-rieng-kha-dai.example.edu.vn/play?pin=999999",
    ]) {
      expect(decode(text), text).toBe(text);
    }
  });

  it("chuỗi dài vẫn mã hoá được và quét lại đúng", () => {
    const long = `https://example.com/play?pin=123456&ref=${"x".repeat(260)}`;
    expect(decode(long)).toBe(long);
  });

  it("PIN khác nhau cho ma trận khác nhau và ma trận là hình vuông", () => {
    const a = buildQrMatrix("https://x.vn/play?pin=111111");
    const b = buildQrMatrix("https://x.vn/play?pin=111112");
    expect(a).not.toEqual(b);
    expect(a.every((row) => row.length === a.length)).toBe(true);
  });

  it("chuỗi rỗng bị từ chối; chuỗi quá dài cho mã QR bị từ chối bằng lời nhắn rõ", () => {
    expect(() => buildQrMatrix("")).toThrow("không được để trống");
    expect(() => buildQrMatrix("a".repeat(5000))).toThrow("quá dài");
  });

  it("đường vẽ SVG phủ đúng các mô-đun tối, gộp các mô-đun liền nhau và tôn trọng vùng yên tĩnh", () => {
    const matrix = [
      [true, true, false],
      [false, true, true],
      [true, false, true],
    ];
    expect(matrixToPath(matrix, 1)).toBe("M1 1h2v1h-2zM2 2h2v1h-2zM1 3h1v1h-1zM3 3h1v1h-1z");
    expect(qrSize(matrix, 1)).toBe(5);
    // Tổng diện tích các đoạn bằng số mô-đun tối.
    const real = buildQrMatrix("https://x.vn/play?pin=123456");
    const dark = real.flat().filter(Boolean).length;
    const covered = [...matrixToPath(real).matchAll(/h(\d+)v1/g)].reduce((sum, match) => sum + Number(match[1]), 0);
    expect(covered).toBe(dark);
  });
});
