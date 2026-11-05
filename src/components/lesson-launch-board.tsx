"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { usePointerInertia } from "@/components/use-pointer-inertia";
import styles from "./lesson-launch-board.module.css";

const stages = [
  { id: "prepare", label: "Chuẩn bị" },
  { id: "launch", label: "Mở lớp" },
  { id: "listen", label: "Đọc lớp" },
] as const;
type Stage = (typeof stages)[number]["id"];

/** Demo product thật của landing: không đọc/ghi dữ liệu. */
export function LessonLaunchBoard() {
  const [active, setActive] = useState<Stage>("prepare");
  const boardRef = useRef<HTMLElement>(null);
  const { regionRef, onPointerMove, onPointerLeave, onBlur } = usePointerInertia<HTMLDivElement>({ targetRef: boardRef });

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % stages.length : event.key === "ArrowLeft" ? (index + stages.length - 1) % stages.length : event.key === "Home" ? 0 : event.key === "End" ? stages.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(stages[next].id);
    document.getElementById(`launch-tab-${stages[next].id}`)?.focus();
  }

  return (
    <div ref={regionRef} className={styles.stage} data-lesson-launch-board data-parallax-stage onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} onBlur={onBlur}>
      <div className={styles.rear} aria-hidden="true" inert />
      <div className={styles.middle} aria-hidden="true" inert />
      <section ref={boardRef} className={styles.board} aria-label="Bảng điều phối một hoạt động lớp học">
        <header className={styles.topbar}><span>LỚP 6A · ĐIỀU PHỐI</span><span>Tiết 2 · Thứ ba</span></header>
        <div className={styles.tabs} role="tablist" aria-label="Ba bước điều phối hoạt động">
          {stages.map((stage, index) => <button key={stage.id} id={`launch-tab-${stage.id}`} type="button" role="tab" aria-selected={active === stage.id} aria-controls={`launch-panel-${stage.id}`} tabIndex={active === stage.id ? 0 : -1} onClick={() => setActive(stage.id)} onKeyDown={(event) => move(event, index)}>{stage.label}</button>)}
        </div>
        <div id={`launch-panel-${active}`} className={styles.panel} role="tabpanel" aria-labelledby={`launch-tab-${active}`}>
          {active === "prepare" && <><p className={styles.kicker}>Hoạt động sắp tới</p><strong>Ôn tập địa lí Việt Nam</strong><p>8 câu hỏi · 12 phút · sẵn sàng để mở lớp.</p><div className={styles.progress}><i style={{ width: "75%" }} /> <span>6/8 câu đã hoàn thiện</span></div></>}
          {active === "launch" && <><p className={styles.kicker}>Mã tham gia</p><strong className={styles.pin}>4286</strong><p>24 học sinh đang chờ. Khi thầy cô bắt đầu, câu hỏi đầu tiên sẽ hiện trên màn chiếu.</p><span className={styles.live}><i /> Phòng lớp đang mở</span></>}
          {active === "listen" && <><p className={styles.kicker}>Tín hiệu từ lớp</p><strong>20 / 24 bạn hiểu bài</strong><p>Câu 3: phần lớn lớp chọn đúng; 4 bạn cần được mời giải thích thêm.</p><div className={styles.bars} aria-label="Phân bố đáp án"><i /><i /><i /><i /></div></>}
        </div>
      </section>
    </div>
  );
}
