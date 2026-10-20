import { describeChange, formatDelta } from "@/lib/live/treasure";
import type { PlayerState } from "@/lib/live/types";

/**
 * Câu cho vùng đọc cố định của màn học sinh (trình đọc màn hình). Vùng này có sẵn trong trang và chỉ đổi nội dung nên
 * được báo đáng tin hơn các vùng mới chèn; vì vậy mọi thay đổi quan trọng (kể cả rương kho báu) phải có mặt ở đây.
 */
export function playerAnnouncement(state: PlayerState | null): string {
  if (!state) return "";
  switch (state.phase) {
    case "lobby":
      return "Bạn đã vào phòng. Chờ thầy cô bắt đầu.";
    case "question": {
      const base = `Câu ${state.question_index} trên ${state.question_total}: ${state.question?.prompt ?? ""}`;
      // Rương câu trước mà máy chủ tự mở: học sinh cần biết vì sao điểm đổi.
      return state.last_chest?.status === "opened"
        ? `${base}. Rương câu trước đã tự mở: ${state.last_chest.label}, ${describeChange(state.last_chest)}.`
        : base;
    }
    case "reveal": {
      const base = state.answered ? (state.is_correct ? "Bạn trả lời đúng." : "Bạn trả lời chưa đúng.") : "Bạn chưa trả lời câu này.";
      if (state.chest?.status === "pending") return `${base} Bạn nhận được một rương kho báu. Chọn một rương để mở.`;
      if (state.chest?.status === "opened") return `${base} Rương: ${state.chest.label}, ${describeChange(state.chest)}.`;
      return base;
    }
    case "ended": {
      const base = "Trò chơi đã kết thúc.";
      return state.treasure && state.treasure.opened > 0 ? `${base} Kho báu: ${formatDelta(state.treasure.delta)}.` : base;
    }
    case "removed":
      return "Thầy cô đã mời bạn rời phòng.";
  }
}
