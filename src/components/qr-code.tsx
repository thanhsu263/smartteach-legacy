"use client";

import { useId, useMemo } from "react";
import { buildQrMatrix, matrixToPath, qrSize } from "@/lib/qr/matrix";
import styles from "./qr-code.module.css";

type QrCodeProps = {
  /** Nội dung mã hoá (ví dụ địa chỉ vào phòng). */
  value: string;
  /** Tên truy cập của hình, mặc định "Mã QR". */
  label?: string;
  className?: string;
};

// QR chỉ quét được khi mô-đun TỐI nằm trên nền SÁNG: ép trắng/đen cố định, kể cả trong giao diện tối.
const LIGHT = "#fff";
const DARK = "#000";

/**
 * Mã QR vẽ bằng SVG từ ma trận (không chèn HTML thô). Hình có tên truy cập và mô tả ghi rõ nội dung,
 * nên người dùng trình đọc màn hình biết đây là mã dẫn tới đâu. Kích thước co theo khung chứa (`width` từ CSS).
 */
export function QrCode({ value, label = "Mã QR", className }: QrCodeProps) {
  const id = useId();
  const drawing = useMemo(() => {
    try {
      const matrix = buildQrMatrix(value);
      return { size: qrSize(matrix), path: matrixToPath(matrix) };
    } catch {
      return null;
    }
  }, [value]);

  if (!drawing) return null;

  return (
    <svg
      className={[styles.qr, className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${drawing.size} ${drawing.size}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      shapeRendering="crispEdges"
      data-value={value}
    >
      <title id={`${id}-title`}>{label}</title>
      <desc id={`${id}-desc`}>{`Quét để mở ${value}`}</desc>
      <rect width={drawing.size} height={drawing.size} fill={LIGHT} />
      <path d={drawing.path} fill={DARK} />
    </svg>
  );
}
