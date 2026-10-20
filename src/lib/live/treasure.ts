import type { ChestView } from "@/lib/live/types";

export type OpenedChest = Extract<ChestView, { status: "opened" }>;

export type ChestTone = "up" | "down" | "same";

/** Hiệu ứng làm tăng, giảm hay giữ nguyên điểm (để hiện chữ và biểu tượng, không chỉ màu). */
export function chestTone(chest: OpenedChest): ChestTone {
  if (chest.after > chest.before) return "up";
  if (chest.after < chest.before) return "down";
  return "same";
}

export const TONE_LABEL: Record<ChestTone, string> = {
  up: "Điểm tăng",
  down: "Điểm giảm",
  same: "Điểm giữ nguyên",
};

/** "3000 thành 6000 điểm". */
export function describeChange(chest: OpenedChest): string {
  return `${chest.before} thành ${chest.after} điểm`;
}

/** "+700 điểm", "-300 điểm" hoặc "0 điểm" (dấu trừ thật để đọc rõ). */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta} điểm`;
  if (delta < 0) return `-${Math.abs(delta)} điểm`;
  return "0 điểm";
}

/** Câu giải thích vì sao có rương. `target` là số câu liền nhau do máy chủ quyết định (thiếu thì nói chung chung). */
export function describeChestKind(kind: ChestView["kind"], target?: number): string {
  const count = target ? `${target} câu` : "nhiều câu";
  return kind === "win"
    ? `Bạn đã đúng ${count} liên tiếp nên được một rương kho báu.`
    : `Bạn có ${count} liên tiếp chưa đúng, nên được một rương an ủi: chỉ có thêm điểm, không bị trừ.`;
}
