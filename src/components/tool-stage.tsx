"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/button";
import { FullscreenIcon } from "@/components/icons";
import styles from "./tool-stage.module.css";

function subscribeFullscreen(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

const subscribeNothing = () => () => {};

type ToolStageProps = {
  /** Tên vùng làm việc, đọc bởi trình đọc màn hình. */
  label: string;
  /** Nút thêm đặt cạnh nút toàn màn hình. */
  actions?: ReactNode;
  /** Dock điều khiển của màn live luôn ở gần giáo viên khi nội dung cuộn. */
  live?: boolean;
  children: ReactNode;
};

/** Khung bao một tiện ích, có nút chiếu toàn màn hình cho màn chiếu lớp học. */
export function ToolStage({ label, actions, live = false, children }: ToolStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const canFullscreen = useSyncExternalStore(
    subscribeNothing,
    () => document.fullscreenEnabled,
    () => false,
  );
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null && document.fullscreenElement === stageRef.current,
    () => false,
  );

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stageRef.current?.requestFullscreen();
    }
  }

  return (
    <section ref={stageRef} aria-label={label} className={styles.stage} data-live-stage={live || undefined}>
      <div className={styles.bar}>
        {actions}
        {canFullscreen ? (
          <Button variant="secondary" onClick={toggleFullscreen} className={styles.fullscreen}>
            <FullscreenIcon size={18} />
            {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          </Button>
        ) : null}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
