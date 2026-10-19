import type { CSSProperties } from "react";
import { CheckIcon } from "@/components/icons";
import { AnswerShapeIcon } from "./answer-shape";
import { answerStyle } from "./answer-styles";
import styles from "./player.module.css";

function tileStyle(index: number): CSSProperties {
  return { "--tile-color": `var(${answerStyle(index).colorVar})` } as CSSProperties;
}

function Glyph({ index }: { index: number }) {
  const style = answerStyle(index);
  return (
    <span className={styles.glyph}>
      <AnswerShapeIcon shape={style.shape} />
      <span className={styles.letter}>{style.letter}</span>
    </span>
  );
}

type AnswerTilesProps = {
  options: readonly string[];
  selected: readonly number[];
  disabled: boolean;
  onPick: (index: number) => void;
};

/** Ô đáp án bấm được. Đang chọn: vòng Mực quanh ô cộng dấu tích (không chỉ đổi màu). */
export function AnswerTiles({ options, selected, disabled, onPick }: AnswerTilesProps) {
  return (
    <ul className={styles.tiles}>
      {options.map((label, index) => {
        const on = selected.includes(index);
        return (
          <li key={index}>
            <button
              type="button"
              className={styles.tile}
              style={tileStyle(index)}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onPick(index)}
            >
              <Glyph index={index} />{" "}
              <span className={styles.label}>{label}</span>
              {on ? (
                <span className={styles.mark} aria-hidden="true">
                  <CheckIcon size={16} /> Đã chọn
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type ReviewTilesProps = {
  options: readonly string[];
  correct: readonly number[];
  mine: readonly number[];
};

/** Ô đáp án sau khi câu đóng: chỉ đọc, đáp án đúng có vòng Mực và chữ "Đáp án đúng". */
export function ReviewTiles({ options, correct, mine }: ReviewTilesProps) {
  return (
    <ul className={styles.tiles}>
      {options.map((label, index) => {
        const isCorrect = correct.includes(index);
        const chosen = mine.includes(index);
        return (
          <li key={index}>
            <div className={styles.tile} style={tileStyle(index)} data-correct={isCorrect}>
              <Glyph index={index} />{" "}
              <span className={styles.label}>{label}</span>
              {isCorrect || chosen ? (
                <span className={styles.mark}>
                  {isCorrect ? <CheckIcon size={16} aria-hidden="true" /> : null}
                  {isCorrect ? "Đáp án đúng" : "Bạn chọn"}
                  {isCorrect && chosen ? ", bạn chọn" : ""}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
