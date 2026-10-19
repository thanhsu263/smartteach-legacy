import { ClockIcon, UsersIcon } from "@/components/icons";
import styles from "./classroom-preview.module.css";

const groups = [
  { name: "Nhóm 1", members: ["Minh Anh", "Gia Huy", "Thảo My"] },
  { name: "Nhóm 2", members: ["Quốc Bảo", "Ngọc Hân", "Đức Anh"] },
];

/** Minh hoạ trang trí cho hero: bản xem trước của đồng hồ đếm ngược và chia nhóm. */
export function ClassroomPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={`${styles.panel} ${styles.timer}`}>
        <p className={styles.panelTitle}>
          <ClockIcon size={18} />
          Đếm ngược
        </p>
        <p className={styles.time}>05:00</p>
        <div className={styles.progress}>
          <span />
        </div>
      </div>
      <div className={`${styles.panel} ${styles.groups}`}>
        <p className={styles.panelTitle}>
          <UsersIcon size={18} />
          Chia nhóm
        </p>
        <ul className={styles.groupList}>
          {groups.map((group) => (
            <li key={group.name}>
              <p className={styles.groupName}>{group.name}</p>
              <ul className={styles.members}>
                {group.members.map((member) => (
                  <li key={member}>{member}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
