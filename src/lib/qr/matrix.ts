import qrcode from "qrcode-generator";

/** Vùng yên tĩnh theo chuẩn QR: 4 mô-đun trắng quanh mã, thiếu thì nhiều máy quét không nhận ra. */
export const QUIET_ZONE = 4;

/**
 * Mã hoá `text` thành ma trận QR (true = mô-đun tối). Mức sửa lỗi M (khôi phục ~15% mô-đun hỏng) và để
 * thư viện tự chọn phiên bản nhỏ nhất đủ chứa dữ liệu, nên địa chỉ ngắn cho mã thưa, mô-đun to, dễ quét từ xa.
 */
export function buildQrMatrix(text: string): boolean[][] {
  if (!text) throw new Error("Chuỗi cần mã hoá không được để trống.");
  const qr = qrcode(0, "M");
  qr.addData(text);
  try {
    qr.make();
  } catch {
    throw new Error("Chuỗi quá dài để mã hoá thành mã QR.");
  }
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col)));
}

/**
 * Đường vẽ SVG cho các mô-đun tối, đã cộng vùng yên tĩnh (toạ độ gốc ở góc vùng yên tĩnh). Các mô-đun tối liền
 * nhau trên một hàng gộp thành một đoạn để chuỗi ngắn và DOM nhẹ.
 */
export function matrixToPath(matrix: readonly (readonly boolean[])[], quiet = QUIET_ZONE): string {
  const parts: string[] = [];
  matrix.forEach((cells, row) => {
    let col = 0;
    while (col < cells.length) {
      if (!cells[col]) {
        col += 1;
        continue;
      }
      const start = col;
      while (col < cells.length && cells[col]) col += 1;
      parts.push(`M${start + quiet} ${row + quiet}h${col - start}v1h-${col - start}z`);
    }
  });
  return parts.join("");
}

/** Cạnh của hình vuông chứa mã, tính bằng mô-đun, gồm cả vùng yên tĩnh hai bên. */
export function qrSize(matrix: readonly (readonly boolean[])[], quiet = QUIET_ZONE): number {
  return matrix.length + 2 * quiet;
}
