import type { AnswerShape } from "./answer-styles";

/** Hình của ô đáp án; trang trí (aria-hidden) vì chữ cái đã nêu lựa chọn. Tô trắng, đạt 4.5:1 trên mọi ô. */
export function AnswerShapeIcon({ shape, size = 28 }: { shape: AnswerShape; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {SHAPES[shape]}
    </svg>
  );
}

const SHAPES: Record<AnswerShape, React.ReactNode> = {
  hexagon: <path d="M12 2.5 20.5 7.25v9.5L12 21.5 3.5 16.75v-9.5z" />,
  star: <path d="m12 2.5 2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" />,
  cross: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
  pentagon: <path d="M12 2.5 21.5 9.4 17.9 20.6H6.1L2.5 9.4z" />,
  halfmoon: <path d="M3 17a9 9 0 0 1 18 0z" />,
  drop: <path d="M12 2.5c3.6 4.4 6.5 7.7 6.5 11.5a6.5 6.5 0 0 1-13 0c0-3.8 2.9-7.1 6.5-11.5z" />,
};
