import { Button } from "@/components/button";
import { UsersIcon } from "@/components/icons";
import styles from "./player.module.css";

type LobbyProps = {
  nickname: string;
  playerCount: number;
  /** False khi trình duyệt chặn lưu trữ: tải lại trang thì phải nhập lại PIN. */
  persisted: boolean;
  onLeave: () => void;
};

export function Lobby({ nickname, playerCount, persisted, onLeave }: LobbyProps) {
  return (
    <div className={styles.screen}>
      <header>
        <h1 className={styles.title}>Bạn đã vào phòng</h1>
        <p className={styles.lead}>
          Biệt danh của bạn: <span className={styles.name}>{nickname}</span>
        </p>
      </header>

      <p className={styles.waiting}>
        <UsersIcon aria-hidden="true" />
        <span>
          Có {playerCount} bạn trong phòng. Chờ thầy cô bắt đầu…
        </span>
      </p>

      {!persisted ? (
        <p className={styles.notice}>
          Trình duyệt này chặn lưu trữ nên nếu bạn tải lại trang, bạn sẽ phải nhập lại PIN và biệt danh.
        </p>
      ) : null}

      <Button variant="secondary" onClick={onLeave}>
        Rời phòng
      </Button>
    </div>
  );
}
