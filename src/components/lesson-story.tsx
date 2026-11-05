"use client";

import { useEffect, useRef } from "react";
import styles from "./lesson-story.module.css";

const chapters = [
  {
    step: "01",
    title: "Chuẩn bị hoạt động trong vài phút",
    text: "Chọn quiz, trò chơi hoặc tiện ích phù hợp. Những thứ cần dùng nằm cùng một chỗ để thầy cô không phải đổi công cụ giữa giờ.",
  },
  {
    step: "02",
    title: "Mở lớp với một tín hiệu rõ ràng",
    text: "Mã PIN, màn hình chiếu và nhịp hoạt động được đặt cạnh nhau để cả lớp cùng biết việc tiếp theo là gì.",
  },
  {
    step: "03",
    title: "Đọc phản hồi để dẫn lớp tiếp",
    text: "Kết quả tức thì giúp thầy cô nhận ra câu hỏi nào cần dừng lại, mời học sinh giải thích hoặc chuyển sang phần tiếp theo.",
  },
] as const;

/** Chương kể chuyện có tín hiệu viewport nhẹ; nội dung vẫn đầy đủ nếu JavaScript không chạy. */
export function LessonStory() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-story-chapter]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.setAttribute("data-story-active", "true");
        });
      },
      { threshold: 0.45 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={rootRef} className={styles.story} aria-labelledby="story-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Một nhịp dạy học rõ ràng</p>
        <h2 id="story-title">Mỗi công cụ xuất hiện đúng lúc thầy cô cần</h2>
      </div>
      <ol className={styles.chapters}>
        {chapters.map((chapter) => (
          <li key={chapter.step} className={styles.chapter} data-story-chapter>
            <span className={styles.step} aria-hidden="true">{chapter.step}</span>
            <div>
              <h3>{chapter.title}</h3>
              <p>{chapter.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
