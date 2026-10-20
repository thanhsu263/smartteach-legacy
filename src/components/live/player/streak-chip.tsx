import { CheckIcon, CloseIcon } from "@/components/icons";
import { STREAK_TARGET } from "@/lib/live/treasure";
import type { PlayerState } from "@/lib/live/types";
import styles from "./player.module.css";

/** Chuỗi đang chạy của chế độ kho báu: có chữ và biểu tượng, không chỉ màu. Không hiện khi cả hai chuỗi đều 0. */
export function StreakChip({ streak }: { streak: PlayerState["streak"] }) {
  if (!streak || (streak.win === 0 && streak.lose === 0)) return null;
  const winning = streak.win > 0;
  const count = winning ? streak.win : streak.lose;
  return (
    <p className={styles.chip} data-tone={winning ? "win" : "lose"}>
      {winning ? <CheckIcon size={18} /> : <CloseIcon size={18} />}
      <span>
        {winning ? "Chuỗi đúng" : "Chuỗi chưa đúng"} {count}/{STREAK_TARGET}
      </span>
    </p>
  );
}
