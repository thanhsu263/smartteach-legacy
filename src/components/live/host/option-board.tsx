import type { CSSProperties } from "react";
import { CheckIcon } from "@/components/icons";
import { AnswerShapeIcon } from "@/components/live/player/answer-shape";
import { answerStyle } from "@/components/live/player/answer-styles";
import styles from "./host.module.css";

type OptionBoardProps = {
  options: readonly string[];
  /** Chỉ có sau khi câu đóng: các lựa chọn đúng. */
  correct?: readonly number[];
  /** Chỉ có sau khi câu đóng: số lượt chọn từng lựa chọn. */
  counts?: readonly number[];
};

/** Các lựa chọn của câu hỏi cho cả lớp xem. Khi câu đang mở không đánh dấu gì; sau khi đóng đánh dấu đáp án đúng và số lượt chọn. */
export function OptionBoard({ options, correct, counts }: OptionBoardProps) {
  const max = Math.max(1, ...(counts ?? []));
  return (
    <ul className={styles.board}>
      {options.map((label, index) => {
        const style = answerStyle(index);
        const isCorrect = correct?.includes(index) ?? false;
        const count = counts?.[index];
        return (
          <li key={index}>
            <div className={styles.option} style={{ "--tile-color": `var(${style.colorVar})` } as CSSProperties} data-correct={isCorrect}>
              <span className={styles.glyph}>
                <AnswerShapeIcon shape={style.shape} size={36} />
                <span className={styles.letter}>{style.letter}</span>
              </span>{" "}
              <span className={styles.optionLabel}>{label}</span>
              {correct !== undefined || count !== undefined ? (
                <span className={styles.optionNote}>
                  {isCorrect ? (
                    <>
                      <CheckIcon size={20} aria-hidden="true" /> Đáp án đúng
                    </>
                  ) : null}
                  {count !== undefined ? <span>{isCorrect ? "· " : ""}{count} bạn chọn</span> : null}
                </span>
              ) : null}
              {count !== undefined ? (
                <span className={styles.count} aria-hidden="true">
                  <span className={styles.countFill} style={{ display: "block", width: `${(count / max) * 100}%` }} />
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
