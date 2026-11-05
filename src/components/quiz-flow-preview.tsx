"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./quiz-flow-preview.module.css";

const flows = [
  { id: "compose", label: "Soạn quiz" },
  { id: "play", label: "Chơi trực tiếp" },
  { id: "results", label: "Kết quả" },
] as const;

type FlowId = (typeof flows)[number]["id"];

const answers = ["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"] as const;

/**
 * Minh hoạ cục bộ cho vòng đời quiz. Không đọc/ghi dữ liệu và chỉ dùng pointer
 * fine trong chính stage để tạo chiều sâu cho landing.
 */
export function QuizFlowPreview() {
  const [active, setActive] = useState<FlowId>("compose");
  const [selectedAnswer, setSelectedAnswer] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const enabledRef = useRef(false);

  const resetParallax = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--sheet-x", "0px");
    stage.style.setProperty("--sheet-y", "0px");
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      enabledRef.current = finePointer.matches && !reducedMotion.matches;
      if (!enabledRef.current) resetParallax();
    };

    sync();
    finePointer.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      finePointer.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [resetParallax]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const stage = stageRef.current;
      const point = pointRef.current;
      if (!stage || !point) return;
      const rect = stage.getBoundingClientRect();
      const x = ((point.x - rect.left) / rect.width - 0.5) * 8;
      const y = ((point.y - rect.top) / rect.height - 0.5) * 6;
      stage.style.setProperty("--sheet-x", `${x.toFixed(2)}px`);
      stage.style.setProperty("--sheet-y", `${y.toFixed(2)}px`);
    });
  };

  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % flows.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + flows.length) % flows.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = flows.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = flows[nextIndex];
    setActive(next.id);
    document.getElementById(`quiz-flow-tab-${next.id}`)?.focus();
  };

  const activeIndex = flows.findIndex((flow) => flow.id === active);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-quiz-sheets
      data-parallax-stage
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) resetParallax();
      }}
    >
      <div className={styles.backSheet} aria-hidden="true" inert />
      <div className={styles.middleSheet} aria-hidden="true" inert />
      <section className={styles.sheet} aria-label="Minh hoạ vòng đời quiz SmartTeach">
        <div className={styles.sheetTopbar} aria-hidden="true">
          <span className={styles.windowDots}><i /><i /><i /></span>
          <span className={styles.sheetLabel}>QUIZ · LỚP 6A</span>
          <span className={styles.sheetStatus}>Đang chuẩn bị</span>
        </div>

        <div className={styles.sheetBody}>
          <div className={styles.tabs} role="tablist" aria-label="Vòng đời một quiz">
            {flows.map((flow, index) => (
              <button
                key={flow.id}
                id={`quiz-flow-tab-${flow.id}`}
                className={styles.tab}
                type="button"
                role="tab"
                aria-selected={active === flow.id}
                aria-controls={`quiz-flow-panel-${flow.id}`}
                tabIndex={active === flow.id ? 0 : -1}
                onClick={() => setActive(flow.id)}
                onKeyDown={(event) => moveTab(event, index)}
              >
                <span className={styles.tabNumber}>0{index + 1}</span>
                {flow.label}
              </button>
            ))}
            <span className={styles.tabIndicator} style={{ "--active-tab": activeIndex } as React.CSSProperties} aria-hidden="true" />
          </div>

          <div
            id={`quiz-flow-panel-${active}`}
            className={styles.panel}
            role="tabpanel"
            aria-labelledby={`quiz-flow-tab-${active}`}
          >
            {active === "compose" ? (
              <div className={styles.composePanel}>
                <p className={styles.panelEyebrow}>Câu 3 trên 8</p>
                <p className={styles.question}>Thủ đô của Việt Nam là thành phố nào?</p>
                <div className={styles.answers} aria-label="Đáp án mẫu">
                  {answers.map((answer, index) => (
                    <button
                      key={answer}
                      type="button"
                      className={styles.answer}
                      aria-pressed={selectedAnswer === index}
                      onClick={() => setSelectedAnswer(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {answer}
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>Chọn đáp án để xem phản hồi — đây chỉ là minh hoạ.</p>
              </div>
            ) : null}

            {active === "play" ? (
              <div className={styles.playPanel}>
                <p className={styles.panelEyebrow}>PIN lớp học</p>
                <p className={styles.pin}>4 2 8 6</p>
                <p className={styles.playCopy}>24 bạn đã vào phòng. Thầy cô có thể bắt đầu ngay khi sẵn sàng.</p>
                <div className={styles.liveRow}><span className={styles.liveDot} /> Lớp 6A đang chờ</div>
              </div>
            ) : null}

            {active === "results" ? (
              <div className={styles.resultsPanel}>
                <p className={styles.panelEyebrow}>Kết quả câu 3</p>
                <p className={styles.resultTitle}>20 / 24 bạn chọn đúng</p>
                <ul className={styles.resultBars} aria-label="Phân bố đáp án mẫu">
                  {answers.map((answer, index) => (
                    <li key={answer}>
                      <span>{String.fromCharCode(65 + index)}</span>
                      <i style={{ "--bar": `${[83, 8, 5, 4][index]}%` } as React.CSSProperties} />
                      <b>{[20, 2, 1, 1][index]}</b>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
