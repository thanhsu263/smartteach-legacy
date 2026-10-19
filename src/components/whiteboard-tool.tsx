"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/button";
import { ToolStage } from "@/components/tool-stage";
import styles from "./whiteboard-tool.module.css";

/** Giá trị màu khớp token trong DESIGN.md, vì canvas không đọc được biến CSS. */
const COLORS = [
  { id: "den", label: "Đen", value: "#172033" },
  { id: "xanh", label: "Xanh dương", value: "#1d4fd7" },
  { id: "do", label: "Đỏ", value: "#b3261e" },
  { id: "luc", label: "Xanh lá", value: "#14703f" },
] as const;

const SIZES = [
  { id: "manh", label: "Nét mảnh", width: 3 },
  { id: "vua", label: "Nét vừa", width: 6 },
  { id: "day", label: "Nét dày", width: 12 },
] as const;

const ERASER_SCALE = 4;

type Point = { x: number; y: number };

/** Nét vẽ lưu theo toạ độ chuẩn hoá 0..1 để vẽ lại đúng khi khung đổi kích thước. */
type Stroke = {
  color: string;
  width: number;
  erase: boolean;
  points: Point[];
};

function paintStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  fromIndex = 0,
) {
  context.save();
  context.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.lineCap = "round";
  context.lineJoin = "round";

  const points = stroke.points;
  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x * width, points[0].y * height, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    const start = Math.max(0, fromIndex - 1);
    context.moveTo(points[start].x * width, points[start].y * height);
    for (let index = start + 1; index < points.length; index += 1) {
      context.lineTo(points[index].x * width, points[index].y * height);
    }
    context.stroke();
  }
  context.restore();
}

export function WhiteboardTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef<{ stroke: Stroke; pointerId: number } | null>(null);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");
  const [colorId, setColorId] = useState<(typeof COLORS)[number]["id"]>("den");
  const [sizeId, setSizeId] = useState<(typeof SIZES)[number]["id"]>("vua");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const { width, height } = canvas.getBoundingClientRect();
    context.clearRect(0, 0, width, height);
    for (const stroke of strokes.current) paintStroke(context, stroke, width, height);
  }, []);

  // Khớp độ phân giải canvas với kích thước hiển thị và màn hình độ phân giải cao.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw();
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  function pointFrom(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function handleDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Đang có một nét thì bỏ qua con trỏ thứ hai (ngón thứ hai hay lòng bàn tay). Nếu ghi đè,
    // nét đầu không bao giờ được lưu và biến mất ở lần vẽ lại sau đó.
    const active = drawing.current;
    if (active) {
      if (event.currentTarget.hasPointerCapture(active.pointerId)) return;
      // Con trỏ cũ đã mất quyền bắt mà không báo kết thúc: lưu nét dở rồi nhận nét mới.
      strokes.current.push(active.stroke);
      drawing.current = null;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const size = SIZES.find((item) => item.id === sizeId) ?? SIZES[1];
    const color = COLORS.find((item) => item.id === colorId) ?? COLORS[0];
    const erase = mode === "eraser";
    const stroke: Stroke = {
      color: color.value,
      width: erase ? size.width * ERASER_SCALE : size.width,
      erase,
      points: [pointFrom(event)],
    };
    drawing.current = { stroke, pointerId: event.pointerId };
    const rect = event.currentTarget.getBoundingClientRect();
    const context = event.currentTarget.getContext("2d");
    if (context) paintStroke(context, stroke, rect.width, rect.height);
  }

  function handleMove(event: PointerEvent<HTMLCanvasElement>) {
    const current = drawing.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.stroke.points.push(pointFrom(event));
    const rect = event.currentTarget.getBoundingClientRect();
    const context = event.currentTarget.getContext("2d");
    if (context) {
      paintStroke(context, current.stroke, rect.width, rect.height, current.stroke.points.length - 1);
    }
  }

  function handleUp(event: PointerEvent<HTMLCanvasElement>) {
    const current = drawing.current;
    if (!current || current.pointerId !== event.pointerId) return;
    strokes.current.push(current.stroke);
    drawing.current = null;
  }

  function clearAll() {
    strokes.current = [];
    drawing.current = null;
    redraw();
  }

  return (
    <ToolStage
      label="Bảng trắng"
      actions={
        <Button variant="secondary" onClick={clearAll}>
          Xoá tất cả
        </Button>
      }
    >
      <div className={styles.tool}>
        <div className={styles.toolbar} role="toolbar" aria-label="Công cụ vẽ">
          <div className={styles.group} role="group" aria-label="Dụng cụ">
            <Button variant="secondary" aria-pressed={mode === "pen"} onClick={() => setMode("pen")}>
              Bút
            </Button>
            <Button
              variant="secondary"
              aria-pressed={mode === "eraser"}
              onClick={() => setMode("eraser")}
            >
              Tẩy
            </Button>
          </div>
          <div className={styles.group} role="group" aria-label="Màu bút">
            {COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                className={styles.swatch}
                style={{ backgroundColor: color.value }}
                aria-label={`Màu ${color.label}`}
                aria-pressed={mode === "pen" && colorId === color.id}
                disabled={mode === "eraser"}
                onClick={() => setColorId(color.id)}
              />
            ))}
          </div>
          <div className={styles.group} role="group" aria-label="Cỡ nét">
            {SIZES.map((size) => (
              <Button
                key={size.id}
                variant="secondary"
                aria-pressed={sizeId === size.id}
                onClick={() => setSizeId(size.id)}
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>
        {/* Canvas đặt tuyệt đối trong khung để kích thước bitmap không tác động ngược lên bố cục. */}
        <div className={styles.board}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label="Bảng trắng để vẽ bằng chuột hoặc cảm ứng"
            data-mode={mode}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onLostPointerCapture={handleUp}
          />
        </div>
      </div>
    </ToolStage>
  );
}
